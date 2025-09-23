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
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer ws.Close()

	var msg Message
	err = ws.ReadJSON(&msg)
	if err != nil || msg.Type != "connect" {
		log.Printf("Invalid connect message: %v", err)
		return
	}

	client := &Client{conn: ws, id: msg.From}
	hub.addClient(client)

	log.Printf("Client connected: %d", client.id)

	// Send conversation list immediately after connection
	hub.sendConversationList(client)

	go func() {
		defer func() {
			hub.removeClient(client)
			log.Printf("Client disconnected: %d", client.id)
		}()

		for {
			var msg Message
			err := ws.ReadJSON(&msg)
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("Unexpected close error: %v", err)
				}
				break
			}

			log.Printf("Received message from %d: %+v", client.id, msg)
			hub.processs(msg)
		}
	}()
}
