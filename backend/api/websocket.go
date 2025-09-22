package api

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		log.Printf("ws addr %s, url %s", r.RemoteAddr, r.RequestURI)
		return true
	},
}

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("WebSocket upgrade error:", err)
		return
	}

	var msg Message
	err = ws.ReadJSON(&msg)
	if err != nil || msg.Type != "connect" {
		ws.Close()
		return
	}

	client := &Client{conn: ws, id: msg.From}
	hub.addClient(client)

	fmt.Printf("Client connected: %d\n", client.id)

	hub.sendUserList(client)
	//hub.sendGroupList(client.username)

	go func() {
		defer func() {
			hub.removeClient(client)
			// hub.sendUserList()

			fmt.Printf("Client disconnected: %d\n", client.id)
		}()

		for {

			var msg Message
			err := ws.ReadJSON(&msg)

			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					fmt.Printf("Error reading message: %v\n", err)
				}
				break
			}

			fmt.Printf("Received message from %s: %s\n", client.id, msg)
			hub.processs(msg)
		}
	}()
}
