package db

import (
	"fmt"
	"log"
	"time"
)

// Notification represents a notification in the database
type Notification struct {
	ID        int       `json:"id"`
	UserID    int       `json:"userId"`
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	IsRead    bool      `json:"isRead"`
	RelatedID int       `json:"relatedId,omitempty"` // Post ID for likes/comments, User ID for follows
	SenderID  int       `json:"senderId,omitempty"`  // Who triggered the notification
	CreatedAt time.Time `json:"createdAt"`

	// Additional fields for frontend display
	SenderName   string `json:"senderName,omitempty"`
	SenderAvatar int    `json:"senderAvatar,omitempty"`
}

// CreateNotification creates a new notification
func (db *Database) CreateNotification(userID int, notificationType, message string, relatedID, senderID int) error {
	// Don't create notification for self-actions
	if userID == senderID {
		return nil
	}

	// First check if the notifications table exists
	var tableExists bool
	err := db.db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM sqlite_master 
			WHERE type='table' AND name='notifications'
		)
	`).Scan(&tableExists)

	if err != nil || !tableExists {
		// Table doesn't exist, log and return nil (don't fail the operation)
		log.Printf("Notifications table does not exist, skipping notification creation")
		return nil
	}

	stmt, err := db.db.Prepare(`
		INSERT INTO notifications (user_id, type, message, related_id, sender_id)
		VALUES (?, ?, ?, ?, ?)
	`)
	if err != nil {
		log.Printf("Failed to prepare notification statement: %v", err)
		return nil // Don't fail the operation if notification creation fails
	}
	defer stmt.Close()

	_, err = stmt.Exec(userID, notificationType, message, relatedID, senderID)
	if err != nil {
		log.Printf("Failed to create notification: %v", err)
		return nil // Don't fail the operation if notification creation fails
	}

	return nil
}

// GetNotifications retrieves notifications for a user
func (db *Database) GetNotifications(userID int, limit int) ([]Notification, error) {
	// First check if the notifications table exists
	var tableExists bool
	err := db.db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM sqlite_master 
			WHERE type='table' AND name='notifications'
		)
	`).Scan(&tableExists)

	if err != nil || !tableExists {
		// Table doesn't exist, return empty notifications
		log.Printf("Notifications table does not exist, returning empty notifications")
		return []Notification{}, nil
	}

	// First try to get all fields including sender information
	query := `
		SELECT 
			n.id, n.user_id, n.type, n.message, n.is_read, 
			COALESCE(n.related_id, 0) as related_id,
			COALESCE(n.sender_id, 0) as sender_id,
			n.created_at,
			COALESCE(u.nickname, '') as sender_name,
			COALESCE(u.profile_picture, 0) as sender_avatar
		FROM notifications n
		LEFT JOIN user u ON n.sender_id = u.id
		WHERE n.user_id = ?
		ORDER BY n.created_at DESC
		LIMIT ?
	`

	rows, err := db.db.Query(query, userID, limit)
	if err != nil {
		// If the query fails, it might be because sender_id column doesn't exist
		// Try a fallback query with basic fields only
		log.Printf("Primary notification query failed, trying fallback: %v", err)
		fallbackQuery := `
			SELECT 
				n.id, n.user_id, n.type, n.message, n.is_read, 
				COALESCE(n.related_id, 0) as related_id,
				0 as sender_id,
				n.created_at,
				'' as sender_name,
				0 as sender_avatar
			FROM notifications n
			WHERE n.user_id = ?
			ORDER BY n.created_at DESC
			LIMIT ?
		`

		rows, err = db.db.Query(fallbackQuery, userID, limit)
		if err != nil {
			// If this also fails, return empty notifications instead of error
			log.Printf("Fallback notification query also failed: %v", err)
			return []Notification{}, nil
		}
	}
	defer rows.Close()

	var notifications []Notification
	for rows.Next() {
		var notification Notification
		err := rows.Scan(
			&notification.ID, &notification.UserID, &notification.Type,
			&notification.Message, &notification.IsRead, &notification.RelatedID,
			&notification.SenderID, &notification.CreatedAt,
			&notification.SenderName, &notification.SenderAvatar,
		)
		if err != nil {
			log.Printf("Failed to scan notification: %v", err)
			continue // Skip this notification and continue with others
		}

		notifications = append(notifications, notification)
	}

	// Check for errors that occurred during iteration
	if err = rows.Err(); err != nil {
		log.Printf("Error during rows iteration: %v", err)
		// Return what we have so far instead of failing completely
	}

	return notifications, nil
}

// MarkNotificationAsRead marks a notification as read
func (db *Database) MarkNotificationAsRead(notificationID, userID int) error {
	// First check if the notifications table exists
	var tableExists bool
	err := db.db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM sqlite_master 
			WHERE type='table' AND name='notifications'
		)
	`).Scan(&tableExists)

	if err != nil || !tableExists {
		// Table doesn't exist, log and return nil (don't fail the operation)
		log.Printf("Notifications table does not exist, skipping mark as read")
		return nil
	}

	stmt, err := db.db.Prepare(`
		UPDATE notifications 
		SET is_read = 1 
		WHERE id = ? AND user_id = ?
	`)
	if err != nil {
		log.Printf("Failed to prepare update statement: %v", err)
		return nil // Don't fail the operation
	}
	defer stmt.Close()

	result, err := stmt.Exec(notificationID, userID)
	if err != nil {
		log.Printf("Failed to update notification: %v", err)
		return nil // Don't fail the operation
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Failed to get rows affected: %v", err)
		return nil // Don't fail the operation
	}

	if rowsAffected == 0 {
		log.Printf("Notification not found or already read")
		// Don't fail the operation
	}

	return nil
}

// GetUnreadNotificationCount gets the count of unread notifications for a user
func (db *Database) GetUnreadNotificationCount(userID int) (int, error) {
	// First check if the notifications table exists
	var tableExists bool
	err := db.db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM sqlite_master 
			WHERE type='table' AND name='notifications'
		)
	`).Scan(&tableExists)

	if err != nil || !tableExists {
		// Table doesn't exist, return 0 count
		log.Printf("Notifications table does not exist, returning 0 count")
		return 0, nil
	}

	var count int
	err = db.db.QueryRow(`
		SELECT COUNT(*) FROM notifications 
		WHERE user_id = ? AND is_read = 0
	`, userID).Scan(&count)

	return count, err
}

// CreateLikeNotification creates a notification when someone likes a post
func (db *Database) CreateLikeNotification(postID, likerID int) error {
	// Get the post owner's ID
	var postOwnerID int
	err := db.db.QueryRow(`
		SELECT user_id FROM posts WHERE id = ?
	`, postID).Scan(&postOwnerID)

	if err != nil {
		return fmt.Errorf("failed to get post owner: %w", err)
	}

	// Get liker's name
	var likerName string
	err = db.db.QueryRow(`
		SELECT COALESCE(nickname, first_name) FROM user WHERE id = ?
	`, likerID).Scan(&likerName)

	if err != nil {
		return fmt.Errorf("failed to get liker name: %w", err)
	}

	message := fmt.Sprintf("%s liked your post", likerName)
	return db.CreateNotification(postOwnerID, "like", message, postID, likerID)
}

// CreateCommentNotification creates a notification when someone comments on a post
func (db *Database) CreateCommentNotification(postID, commenterID int) error {
	// Get the post owner's ID
	var postOwnerID int
	err := db.db.QueryRow(`
		SELECT user_id FROM posts WHERE id = ?
	`, postID).Scan(&postOwnerID)

	if err != nil {
		return fmt.Errorf("failed to get post owner: %w", err)
	}

	// Get commenter's name
	var commenterName string
	err = db.db.QueryRow(`
		SELECT COALESCE(nickname, first_name) FROM user WHERE id = ?
	`, commenterID).Scan(&commenterName)

	if err != nil {
		return fmt.Errorf("failed to get commenter name: %w", err)
	}

	message := fmt.Sprintf("%s commented on your post", commenterName)
	return db.CreateNotification(postOwnerID, "comment", message, postID, commenterID)
}

// CreateFollowRequestNotification creates a notification when someone sends a follow request
func (db *Database) CreateFollowRequestNotification(followerID, followedID int) error {
	// Get follower's name
	var followerName string
	err := db.db.QueryRow(`
		SELECT COALESCE(nickname, first_name) FROM user WHERE id = ?
	`, followerID).Scan(&followerName)

	if err != nil {
		return fmt.Errorf("failed to get follower name: %w", err)
	}

	message := fmt.Sprintf("%s sent you a follow request", followerName)
	return db.CreateNotification(followedID, "follow_request", message, followerID, followerID)
}

// CreateFollowAcceptNotification creates a notification when someone accepts a follow request
func (db *Database) CreateFollowAcceptNotification(followerID, followedID int) error {
	// Get followed user's name
	var followedName string
	err := db.db.QueryRow(`
		SELECT COALESCE(nickname, first_name) FROM user WHERE id = ?
	`, followedID).Scan(&followedName)

	if err != nil {
		return fmt.Errorf("failed to get followed user name: %w", err)
	}

	message := fmt.Sprintf("%s accepted your follow request", followedName)
	return db.CreateNotification(followerID, "follow_accept", message, followedID, followedID)
}

// CreateFollowDeclineNotification creates a notification when someone declines a follow request
func (db *Database) CreateFollowDeclineNotification(followerID, followedID int) error {
	// Get followed user's name
	var followedName string
	err := db.db.QueryRow(`
		SELECT COALESCE(nickname, first_name) FROM user WHERE id = ?
	`, followedID).Scan(&followedName)

	if err != nil {
		return fmt.Errorf("failed to get followed user name: %w", err)
	}

	message := fmt.Sprintf("%s declined your follow request", followedName)
	return db.CreateNotification(followerID, "follow_decline", message, followedID, followedID)
}
