package api

import (
	"backend/db"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Hub struct {
	clients map[*Client]bool
	groups  map[int][]int // groupId -> userIds
	sync.Mutex
}

type Client struct {
	conn *websocket.Conn
	id   int
}

type Message struct {
	Type         string            `json:"type"` // "message", "conversation_list", "connect", "disconnect", "create_conversation"
	From         int               `json:"from"`
	To           int               `json:"to,omitempty"`      // For direct messages or conversation ID
	Content      string            `json:"content,omitempty"` // The actual message
	Users        []int             `json:"users,omitempty"`   // For conversation creation
	Time         string            `json:"time,omitempty"`    // Timestamp
	Conversation []db.Conversation `json:"conversation,omitempty"`
	ConversationID int             `json:"conversationId,omitempty"`
	Sender       int               `json:"sender,omitempty"`
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
		h.handleChatMessage(msg)
	case "create_conversation":
		h.handleCreateConversation(msg)
	case "get_conversations":
		h.sendConversationList(h.getClientByID(msg.From))
	}
}

func (h *Hub) handleChatMessage(msg Message) {
	msg.Time = time.Now().Format("2006-01-02T15:04:05Z")
	msg.Sender = msg.From
	
	// Store message in database
	var conversationID int
	var err error
	
	if msg.ConversationID != 0 {
		// Use existing conversation
		conversationID = msg.ConversationID
	} else if msg.To != 0 {
		// Create or find direct conversation
		conversationID, err = h.findOrCreateDirectConversation(msg.From, msg.To)
		if err != nil {
			log.Printf("Failed to create conversation: %v", err)
			return
		}
	}
	
	// Store message in database
	messageID, err := db.Connection.CreateMessage(conversationID, msg.From, &msg.Content, "text")
	if err != nil {
		log.Printf("Failed to store message: %v", err)
		return
	}
	
	msg.ConversationID = conversationID
	
	// Send message to all participants in the conversation
	participants, err := h.getConversationParticipants(conversationID)
	if err != nil {
		log.Printf("Failed to get conversation participants: %v", err)
		return
	}
	
	for _, participantID := range participants {
		if client := h.getClientByID(participantID); client != nil {
			h.sendMessage(client, msg)
		}
	}
	
	log.Printf("Message %d sent to conversation %d", messageID, conversationID)
}

func (h *Hub) handleCreateConversation(msg Message) {
	if len(msg.Users) == 0 {
		return
	}
	
	// For direct conversation (2 users)
	if len(msg.Users) == 1 {
		conversationID, err := db.Connection.CreateDirectConversation(msg.From, msg.Users[0])
		if err != nil {
			log.Printf("Failed to create direct conversation: %v", err)
			return
		}
		
		// Send updated conversation list to both users
		h.sendConversationList(h.getClientByID(msg.From))
		h.sendConversationList(h.getClientByID(msg.Users[0]))
		
		log.Printf("Created direct conversation %d between users %d and %d", conversationID, msg.From, msg.Users[0])
	}
	// TODO: Implement group conversations
}

func (h *Hub) findOrCreateDirectConversation(user1ID, user2ID int) (int, error) {
	// Try to find existing conversation
	conversations, err := db.Connection.FetchConversationsForUser(user1ID)
	if err != nil {
		return 0, err
	}
	
	for _, conv := range conversations {
		if conv.Type == "direct" {
			// Check if this conversation includes both users
			participants, err := h.getConversationParticipants(conv.ID)
			if err != nil {
				continue
			}
			
			if len(participants) == 2 && contains(participants, user1ID) && contains(participants, user2ID) {
				return conv.ID, nil
			}
		}
	}
	
	// Create new conversation
	return db.Connection.CreateDirectConversation(user1ID, user2ID)
}

func (h *Hub) getConversationParticipants(conversationID int) ([]int, error) {
	// This is a simplified version - you might want to add this method to the database
	// For now, we'll query the conversation_participant table directly
	rows, err := db.Connection.Query(`SELECT user FROM conversation_participant WHERE conversation = ?`, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var participants []int
	for rows.Next() {
		var userID int
		if err := rows.Scan(&userID); err != nil {
			continue
		}
		participants = append(participants, userID)
	}
	
	return participants, nil
}

func (h *Hub) getClientByID(userID int) *Client {
	for client := range h.clients {
		if client.id == userID {
			return client
		}
	}
	return nil
}

func (h *Hub) sendConversationList(client *Client) {
	if client == nil {
		return
	}

	conversation, err := db.Connection.FetchConversationsForUser(client.id)
	if err != nil {
		log.Printf("Error fetching conversations: %v\n", err)
		return
	}

	msg := Message{
		Type:         "conversation_list",
		Conversation: conversation,
	}

	h.sendMessage(client, msg)
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
