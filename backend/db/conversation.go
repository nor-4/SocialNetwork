package db

import (
	"database/sql"
	"fmt"
)

// Conversation represents a chat conversation.
type Conversation struct {
	ID                 int    `json:"id"`
	Type               string `json:"type"`           // 'direct' or 'group'
	Name               string `json:"name,omitempty"` // Name for group chats (Use NullString for potential NULLs)
	LastMessageAt      string `json:"last_message_at"`
	UnreadMessageCount int    `json:"unread_message_count"` // Added field for unread count
}

type Message struct {
	ID           int    `json:"id"`
	Conversation int    `json:"conversation"`      // Renamed from Conversation for clarity
	Sender       int    `json:"sender,omitempty"`  // Use NullInt64 for potential NULLs
	Content      string `json:"content,omitempty"` // Use NullString for potential NULLs
	MessageType  string `json:"message_type"`      // 'text', 'image', 'file', 'system'
	SentAt       string `json:"sent_at"`
	Status       string `json:"status"` // 'sent', 'delivered', 'read'
}

// FetchAllMessagesForUser retrieves all messages from conversations where the user is a participant.
// Messages are ordered by conversation ID, then by the time they were sent.
func (db *Database) FetchAllMessagesForUser(userID int) ([]Message, error) {
	query := `
		SELECT m.id, m.conversation, m.sender, m.content, m.message_type, m.sent_at, m.status
		FROM message m
		INNER JOIN conversation_participant cp ON m.conversation = cp.conversation
		WHERE cp.user = ?
		ORDER BY m.conversation, m.sent_at ASC;
	`
	rows, err := db.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query messages for user %d: %w", userID, err)
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		err := rows.Scan(&msg.ID, &msg.Conversation, &msg.Sender, &msg.Content, &msg.MessageType, &msg.SentAt, &msg.Status)
		if err != nil {
			return nil, fmt.Errorf("failed to scan message row: %w", err)
		}
		messages = append(messages, msg)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating message rows: %w", err)
	}
	return messages, nil
}

// CreateDirectConversation creates a new 'direct' conversation between two users.
// It returns the ID of the newly created conversation.
func (db *Database) CreateDirectConversation(user1ID, user2ID int) (int, error) {
	if user1ID == user2ID {
		return 0, fmt.Errorf("cannot create a direct conversation with oneself (user ID: %d)", user1ID)
	}

	tx, err := db.db.Begin()
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	// Defer a rollback in case of error, it will be ignored if Commit() is successful.
	defer tx.Rollback()

	// Insert into conversation table
	var conversationID int
	err = tx.QueryRow("INSERT INTO conversation (type) VALUES ('direct') RETURNING id;").Scan(&conversationID)
	if err != nil {
		return 0, fmt.Errorf("failed to insert conversation or retrieve ID: %w", err)
	}

	// Insert participants
	stmtPart, err := tx.Prepare("INSERT INTO conversation_participant (user, conversation) VALUES (?, ?);")
	if err != nil {
		return 0, fmt.Errorf("failed to prepare participant insert statement: %w", err)
	}
	defer stmtPart.Close()

	if _, err := stmtPart.Exec(user1ID, conversationID); err != nil {
		return 0, fmt.Errorf("failed to insert participant 1 (user ID %d, conversation ID %d): %w", user1ID, conversationID, err)
	}
	if _, err := stmtPart.Exec(user2ID, conversationID); err != nil {
		return 0, fmt.Errorf("failed to insert participant 2 (user ID %d, conversation ID %d): %w", user2ID, conversationID, err)
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return conversationID, nil
}

// CreateMessage inserts a new message into a conversation.
// senderID should be the ID of the user sending the message. If senderID <= 0, it's treated as a system message (sender will be NULL).
// content can be NULL (e.g. for certain system messages or if content is stored elsewhere for 'file'/'image' types).
// messageType must be one of 'text', 'image', 'file', 'system'.
// It returns the ID of the newly created message.
func (db *Database) CreateMessage(conversationID int, senderID int, content *string, messageType string) (int, error) {
	validTypes := map[string]bool{"text": true, "image": true, "file": true, "system": true}
	if !validTypes[messageType] {
		return 0, fmt.Errorf("invalid message_type: %s", messageType)
	}

	var sender sql.NullInt64
	if senderID > 0 {
		sender.Int64 = int64(senderID)
		sender.Valid = true
	}

	var sqlContent sql.NullString
	if content != nil {
		sqlContent.String = *content
		sqlContent.Valid = true
	}

	var messageID int
	err := db.db.QueryRow(`
		INSERT INTO message (conversation, sender, content, message_type) 
		VALUES (?, ?, ?, ?) RETURNING id;
	`, conversationID, sender, sqlContent, messageType).Scan(&messageID)

	if err != nil {
		return 0, fmt.Errorf("failed to insert message or retrieve ID: %w", err)
	}

	// The trigger 'update_conversation_timestamp_on_new_message' in your SQL schema
	// will automatically update conversation.last_message_at.

	return messageID, nil
}

// UpdateMessageStatus updates the status of a specific message.
// status must be one of 'sent', 'delivered', 'read'.
func (db *Database) UpdateMessageStatus(messageID int, status string) error {
	validStatuses := map[string]bool{"sent": true, "delivered": true, "read": true}
	if !validStatuses[status] {
		return fmt.Errorf("invalid message status: '%s'. Must be 'sent', 'delivered', or 'read'", status)
	}

	result, err := db.db.Exec("UPDATE message SET status = ? WHERE id = ?;", status, messageID)
	if err != nil {
		return fmt.Errorf("failed to execute message status update for message ID %d: %w", messageID, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		// Log this error but don't necessarily fail the operation if RowsAffected is not supported or returns error.
		// For SQLite, it should be supported.
		// log.Printf("Warning: could not determine rows affected by status update for message ID %d: %v", messageID, err)
		return fmt.Errorf("failed to get rows affected for message status update, message ID %d: %w", messageID, err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("message with ID %d not found, or status already set to '%s'", messageID, status)
	}

	return nil
}

// FetchConversationsForUser retrieves all conversations a user is part of, ordered by last message time.
// If includeUnreadCount is true, it also calculates and returns the number of unread messages
// for the specified user in each conversation. This requires a 'message_read_by_user' table
// tracking which user has read which message.
func (db *Database) FetchConversationsForUser(userID int) ([]Conversation, error) {

	query := `
		SELECT
		c.id,
		c.type,
		c.name,
		(
			SELECT user.nickname
			FROM conversation_participant as cp
			JOIN user on user.id = cp.user
			WHERE cp.conversation = c.id and user.id != ?
		) AS direct_name,
		c.last_message_at,
		(
			SELECT COUNT(*)
			FROM message AS m
			WHERE m.conversation = c.id
			AND m.sender != ?
			AND m.status != 'read'
		) AS unread_message_count
		FROM
			conversation AS c
		JOIN
			conversation_participant AS cp ON c.id = cp.conversation
		WHERE
			cp.user = ?
		ORDER BY
			c.last_message_at DESC;
	`

	rows, err := db.db.Query(query, userID, userID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query conversations for user %d: %w", userID, err)
	}
	defer rows.Close()

	var conversations []Conversation
	for rows.Next() {
		var conv Conversation
		var directName sql.NullString
		var name sql.NullString

		// Scan with the unread_count column
		err := rows.Scan(&conv.ID, &conv.Type, &name, &directName, &conv.LastMessageAt, &conv.UnreadMessageCount)

		if name.Valid {
			conv.Name = name.String
		} else if directName.Valid {
			conv.Name = directName.String
		} else {
			conv.Name = ""
		}

		if err != nil {
			return nil, fmt.Errorf("failed to scan conversation row: %w", err)
		}

		conversations = append(conversations, conv)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating conversation rows: %w", err)
	}
	return conversations, nil
}
