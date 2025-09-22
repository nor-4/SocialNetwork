package db

import (
	"database/sql"
	"fmt"
)

// FollowRequest represents a follow request in the database
type FollowRequest struct {
	ID         int    `json:"id"`
	FollowerID int    `json:"followerId"`
	FollowedID int    `json:"followedId"`
	Status     string `json:"status"` // pending, accepted, declined
	CreatedAt  string `json:"createdAt"`
}

// CreateFollowRequest creates a follow request. For public profiles, it's automatically accepted.
func (db *Database) CreateFollowRequest(followerID, followedID int) error {
	// Check if already following or has a pending request
	var existingStatus string
	err := db.db.QueryRow(`
		SELECT status FROM follows WHERE follower_id = ? AND followed_id = ?
	`, followerID, followedID).Scan(&existingStatus)

	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("failed to check existing follow status: %w", err)
	}

	// If already following or has pending request, do nothing
	if existingStatus != "" {
		return nil
	}

	// Check if the followed user has a public profile
	var isPublic bool
	err = db.db.QueryRow(`
		SELECT public FROM user WHERE id = ?
	`, followedID).Scan(&isPublic)

	if err != nil {
		return fmt.Errorf("failed to check if user has public profile: %w", err)
	}

	// Determine initial status based on profile privacy
	status := "pending"
	if isPublic {
		status = "accepted"
	}

	// Create the follow request
	stmt, err := db.db.Prepare(`
		INSERT INTO follows (follower_id, followed_id, status) VALUES (?, ?, ?)
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare follow statement: %w", err)
	}
	defer stmt.Close()

	_, err = stmt.Exec(followerID, followedID, status)
	if err != nil {
		return fmt.Errorf("failed to create follow request: %w", err)
	}

	// If it's a pending request (not auto-accepted), create a notification
	if status == "pending" {
		err = db.CreateFollowRequestNotification(followerID, followedID)
		if err != nil {
			// Log the error but don't fail the request
			fmt.Printf("Failed to create follow request notification: %v\n", err)
		}
	}

	return nil
}

// AcceptFollowRequest accepts a follow request
func (db *Database) AcceptFollowRequest(followerID, followedID int) error {
	stmt, err := db.db.Prepare(`
		UPDATE follows SET status = 'accepted' WHERE follower_id = ? AND followed_id = ? AND status = 'pending'
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare accept statement: %w", err)
	}
	defer stmt.Close()

	result, err := stmt.Exec(followerID, followedID)
	if err != nil {
		return fmt.Errorf("failed to accept follow request: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no pending follow request found")
	}

	// Create notification for the follower
	err = db.CreateFollowAcceptNotification(followerID, followedID)
	if err != nil {
		// Log the error but don't fail the request
		fmt.Printf("Failed to create follow accept notification: %v\n", err)
	}

	return nil
}

// DeclineFollowRequest declines a follow request
func (db *Database) DeclineFollowRequest(followerID, followedID int) error {
	stmt, err := db.db.Prepare(`
		UPDATE follows SET status = 'declined' WHERE follower_id = ? AND followed_id = ? AND status = 'pending'
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare decline statement: %w", err)
	}
	defer stmt.Close()

	result, err := stmt.Exec(followerID, followedID)
	if err != nil {
		return fmt.Errorf("failed to decline follow request: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no pending follow request found")
	}

	// Create notification for the follower
	err = db.CreateFollowDeclineNotification(followerID, followedID)
	if err != nil {
		// Log the error but don't fail the request
		fmt.Printf("Failed to create follow decline notification: %v\n", err)
	}

	return nil
}

// Unfollow removes a follow relationship
func (db *Database) Unfollow(followerID, followedID int) error {
	stmt, err := db.db.Prepare(`
		DELETE FROM follows WHERE follower_id = ? AND followed_id = ? AND status = 'accepted'
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare unfollow statement: %w", err)
	}
	defer stmt.Close()

	_, err = stmt.Exec(followerID, followedID)
	if err != nil {
		return fmt.Errorf("failed to unfollow: %w", err)
	}

	return nil
}

// IsFollowing checks if user1 is following user2
func (db *Database) IsFollowing(followerID, followedID int) (bool, error) {
	var exists bool
	err := db.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ? AND status = 'accepted')
	`, followerID, followedID).Scan(&exists)
	return exists, err
}

// HasPendingFollowRequest checks if there's a pending follow request
func (db *Database) HasPendingFollowRequest(followerID, followedID int) (bool, error) {
	var exists bool
	err := db.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ? AND status = 'pending')
	`, followerID, followedID).Scan(&exists)
	return exists, err
}

// GetFollowRequestsForUser gets all pending follow requests for a user
func (db *Database) GetFollowRequestsForUser(userID int) ([]FollowRequest, error) {
	query := `
		SELECT id, follower_id, followed_id, status, created_at
		FROM follows 
		WHERE followed_id = ? AND status = 'pending'
		ORDER BY created_at DESC
	`

	rows, err := db.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query follow requests: %w", err)
	}
	defer rows.Close()

	var requests []FollowRequest
	for rows.Next() {
		var request FollowRequest
		err := rows.Scan(&request.ID, &request.FollowerID, &request.FollowedID, &request.Status, &request.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan follow request: %w", err)
		}
		requests = append(requests, request)
	}

	return requests, nil
}

// GetFollowRequestDetails gets the details of a specific follow request
func (db *Database) GetFollowRequestDetails(requestID int) (followerID, followedID int, err error) {
	err = db.db.QueryRow(`
		SELECT follower_id, followed_id FROM follows WHERE id = ? AND status = 'pending'
	`, requestID).Scan(&followerID, &followedID)
	return followerID, followedID, err
}

// GetPostsCount gets the number of posts for a user
func (db *Database) GetPostsCount(userID int) (int, error) {
	var count int
	err := db.db.QueryRow(`
		SELECT COUNT(*) FROM posts WHERE user_id = ?
	`, userID).Scan(&count)
	return count, err
}

// GetFollowers gets the list of users who follow the given user
func (db *Database) GetFollowers(userID int) ([]map[string]interface{}, error) {
	query := `
		SELECT u.id, u.nickname, u.first_name, u.last_name, u.profile_picture
		FROM follows f
		JOIN user u ON f.follower_id = u.id
		WHERE f.followed_id = ? AND f.status = 'accepted'
		ORDER BY u.first_name, u.last_name
	`

	rows, err := db.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query followers: %w", err)
	}
	defer rows.Close()

	var followers []map[string]interface{}
	for rows.Next() {
		var id, profilePicture int
		var nickname, firstName, lastName string
		err := rows.Scan(&id, &nickname, &firstName, &lastName, &profilePicture)
		if err != nil {
			return nil, fmt.Errorf("failed to scan follower: %w", err)
		}

		follower := map[string]interface{}{
			"id":             id,
			"nickname":       nickname,
			"firstName":      firstName,
			"lastName":       lastName,
			"fullName":       firstName + " " + lastName,
			"profilePicture": profilePicture,
		}
		followers = append(followers, follower)
	}

	return followers, nil
}

// GetFollowing gets the list of users that the given user is following
func (db *Database) GetFollowing(userID int) ([]map[string]interface{}, error) {
	query := `
		SELECT u.id, u.nickname, u.first_name, u.last_name, u.profile_picture
		FROM follows f
		JOIN user u ON f.followed_id = u.id
		WHERE f.follower_id = ? AND f.status = 'accepted'
		ORDER BY u.first_name, u.last_name
	`

	rows, err := db.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query following: %w", err)
	}
	defer rows.Close()

	var following []map[string]interface{}
	for rows.Next() {
		var id, profilePicture int
		var nickname, firstName, lastName string
		err := rows.Scan(&id, &nickname, &firstName, &lastName, &profilePicture)
		if err != nil {
			return nil, fmt.Errorf("failed to scan following: %w", err)
		}

		follow := map[string]interface{}{
			"id":             id,
			"nickname":       nickname,
			"firstName":      firstName,
			"lastName":       lastName,
			"fullName":       firstName + " " + lastName,
			"profilePicture": profilePicture,
		}
		following = append(following, follow)
	}

	return following, nil
}

// GetFollowStats gets follow statistics for a user (followers count, following count)
func (db *Database) GetFollowStats(userID int) (followersCount, followingCount int, err error) {
	// Get followers count
	err = db.db.QueryRow(`
		SELECT COUNT(*) FROM follows WHERE followed_id = ? AND status = 'accepted'
	`, userID).Scan(&followersCount)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to get followers count: %w", err)
	}

	// Get following count
	err = db.db.QueryRow(`
		SELECT COUNT(*) FROM follows WHERE follower_id = ? AND status = 'accepted'
	`, userID).Scan(&followingCount)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to get following count: %w", err)
	}

	return followersCount, followingCount, nil
}
