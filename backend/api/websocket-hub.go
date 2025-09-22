package api

import (
	"backend/db"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Hub struct {
	clients map[*Client]bool
	groups  map[int][]int // groupName -> usernames
	sync.Mutex
}

type Client struct {
	conn *websocket.Conn
	id   int
	//Gropus []int // this should from backend auth
}

type Message struct {
	Type         string            `json:"type"` // "message", "user_list", "connect", "disconnect", "create_group", "group_list"
	From         int               `json:"from"`
	To           int               `json:"to,omitempty"`      // For private or group messages
	Content      string            `json:"content,omitempty"` // The actual message
	Users        []int             `json:"users,omitempty"`   // For user list or group creation
	Time         string            `json:"time,omitempty"`    // Timestamp
	Conversation []db.Conversation `json:"conversation,omitempty"`
}

var hub = &Hub{clients: make(map[*Client]bool), groups: make(map[int][]int)}

func (h *Hub) addClient(client *Client) {
	h.Lock()
	defer h.Unlock()

	h.clients[client] = true
}

func (h *Hub) removeClient(client *Client) {
	h.Lock()
	defer h.Unlock()

	delete(h.clients, client)
	client.conn.Close()
}

func (h *Hub) processs(msg Message) {
	h.Lock()
	defer h.Unlock()

	switch msg.Type {
	case "message":
		msg.Time = time.Now().Format("15:04:05")
		if msg.To != 0 {
			if users, ok := h.groups[msg.To]; ok {
				for client := range h.clients {
					if contains(users, client.id) {
						h.sendMessage(client, msg)
					}
				}
			} else {
				for client := range h.clients {
					if client.id == msg.To || client.id == msg.From {
						h.sendMessage(client, msg)
					}
				}
			}
		} else {
			for client := range h.clients {
				h.sendMessage(client, msg)
			}
		}
	case "create_group":
		if msg.To != 0 && len(msg.Users) > 0 {
			h.groups[msg.To] = append(msg.Users, msg.From)
			h.sendGroupListToMembers(msg.To)
		}
	}
}

func (h *Hub) sendUserList(client *Client) {

	conversation, err := db.Connection.FetchConversationsForUser(client.id)

	if err != nil {
		log.Printf("Error reading message: %v\n", err)
	}

	msg := Message{
		Type:         "conversation_list",
		Conversation: conversation,
	}

	h.sendMessage(client, msg)
}

func (h *Hub) sendGroupList(id int) {
	var userGroups []int
	for groupId, members := range h.groups {
		if contains(members, id) {
			userGroups = append(userGroups, groupId)
		}
	}
	msg := Message{
		Type:  "group_list",
		Users: userGroups,
	}
	for client := range h.clients {
		if client.id == id {
			h.sendMessage(client, msg)
		}
	}
}

func (h *Hub) sendGroupListToMembers(groupId int) {
	members := h.groups[groupId]
	msg := Message{
		Type: "group_list",
		// Users: []string{groupId},
	}
	for client := range h.clients {
		if contains(members, client.id) {
			h.sendMessage(client, msg)
		}
	}
}

func (h *Hub) sendMessage(client *Client, msg Message) {
	err := client.conn.WriteJSON(msg)
	if err != nil {
		log.Printf("error: %v", err)
		client.conn.Close()
		delete(h.clients, client)
	}
}

func contains[T comparable](slice []T, item T) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
