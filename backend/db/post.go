package db

import (
	_ "database/sql"
	"fmt"
	"log"
	"time"
)

type Post struct {
	ID             int       `json:"id"`
	UserID         int       `json:"userId"`
	Author         string    `json:"author"`
	AuthorFullName string    `json:"authorFullName"`
	AuthorEmail    string    `json:"authorEmail"`
	ProfilePicture int       `json:"profilePicture"`
	Content        string    `json:"content"`
	ImageID        int       `json:"imageId,omitempty"`
	ImagePath      string    `json:"imagePath,omitempty"`
	Privacy        string    `json:"privacy"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
	Liked          bool      `json:"liked"`
	Likes          int       `json:"likes"`
	Comments       int       `json:"comments"`
}

type Comment struct {
	ID             int       `json:"id"`
	PostID         int       `json:"postId"`
	UserID         int       `json:"userId"`
	Author         string    `json:"author"`
	AuthorFullName string    `json:"authorFullName"`
	ProfilePicture int       `json:"profilePicture"`
	Content        string    `json:"content"`
	ImageID        int       `json:"imageId,omitempty"`
	ImagePath      string    `json:"imagePath,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

// CreatePost creates a new post with optional image and privacy settings
func (db *Database) CreatePost(userID int, content string, imageID int, privacy string, selectedFollowers []int) (int, error) {
	stmt, err := db.db.Prepare(`
		INSERT INTO posts (user_id, content, image_path, privacy) 
		VALUES (?, ?, ?, ?)
	`)
	if err != nil {
		return 0, fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	// For image support, store image ID and generate path
	imagePath := ""
	if imageID > 0 {
		imagePath = fmt.Sprintf("/file?id=%d", imageID)
	}

	result, err := stmt.Exec(userID, content, imagePath, privacy)
	if err != nil {
		return 0, fmt.Errorf("failed to execute statement: %w", err)
	}

	postID, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to get last insert ID: %w", err)
	}

	// If privacy is 'private', save selected followers
	if privacy == "private" && len(selectedFollowers) > 0 {
		for _, followerID := range selectedFollowers {
			_, err := db.db.Exec(`
				INSERT INTO post_permissions (post_id, user_id) VALUES (?, ?)
			`, postID, followerID)
			if err != nil {
				log.Printf("Failed to add post permission for user %d: %v", followerID, err)
			}
		}
	}

	return int(postID), nil
}

// GetPosts retrieves posts for a user (considering privacy settings)
func (db *Database) GetPosts(userID int) ([]Post, error) {
	query := `
		SELECT 
			p.id, p.user_id, u.nickname as author, 
			(u.first_name || ' ' || u.last_name) as author_full_name,
			u.email as author_email, u.profile_picture,
			p.content, COALESCE(p.image_path, '') as image_path, p.privacy, p.created_at, p.updated_at,
			COUNT(DISTINCT l.id) as likes,
			COUNT(DISTINCT c.id) as comments,
			EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as liked
		FROM posts p
		JOIN user u ON p.user_id = u.id
		LEFT JOIN likes l ON p.id = l.post_id
		LEFT JOIN comments c ON p.id = c.post_id
		WHERE (
			p.privacy = 'public' 
			OR (p.privacy = 'followers' AND EXISTS(
				SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = p.user_id AND status = 'accepted'
			))
			OR (p.privacy = 'private' AND EXISTS(
				SELECT 1 FROM post_permissions WHERE post_id = p.id AND user_id = ?
			))
			OR p.user_id = ?
		)
		GROUP BY p.id
		ORDER BY p.created_at DESC
	`

	rows, err := db.db.Query(query, userID, userID, userID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query posts: %w", err)
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var post Post
		var imagePathStr string
		err := rows.Scan(
			&post.ID, &post.UserID, &post.Author, &post.AuthorFullName,
			&post.AuthorEmail, &post.ProfilePicture, &post.Content, &imagePathStr,
			&post.Privacy, &post.CreatedAt, &post.UpdatedAt,
			&post.Likes, &post.Comments, &post.Liked,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan post: %w", err)
		}

		// Handle image path and extract image ID
		post.ImagePath = imagePathStr
		if imagePathStr != "" {
			// Extract image ID from path like "/file?id=123"
			if _, err := fmt.Sscanf(imagePathStr, "/file?id=%d", &post.ImageID); err != nil {
				post.ImageID = 0 // Default if parsing fails
			}
		}

		posts = append(posts, post)
	}

	return posts, nil
}

// CreateComment adds a comment to a post with optional image
func (db *Database) CreateComment(postID, userID int, content string, imageID int) (int, error) {
	stmt, err := db.db.Prepare(`
		INSERT INTO comments (post_id, user_id, content, image_path) 
		VALUES (?, ?, ?, ?)
	`)
	if err != nil {
		return 0, fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	// For image support, store image ID and generate path
	imagePath := ""
	if imageID > 0 {
		imagePath = fmt.Sprintf("/file?id=%d", imageID)
	}

	result, err := stmt.Exec(postID, userID, content, imagePath)
	if err != nil {
		return 0, fmt.Errorf("failed to execute statement: %w", err)
	}

	commentID, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to get last insert ID: %w", err)
	}

	return int(commentID), nil
}

// GetComments retrieves comments for a post
func (db *Database) GetComments(postID int) ([]Comment, error) {
	query := `
		SELECT c.id, c.post_id, c.user_id, u.nickname as author, 
			(u.first_name || ' ' || u.last_name) as author_full_name,
			u.profile_picture, c.content, COALESCE(c.image_path, '') as image_path, c.created_at
		FROM comments c
		JOIN user u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
	`

	rows, err := db.db.Query(query, postID)
	if err != nil {
		return nil, fmt.Errorf("failed to query comments: %w", err)
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var comment Comment
		var imagePathStr string
		err := rows.Scan(
			&comment.ID, &comment.PostID, &comment.UserID,
			&comment.Author, &comment.AuthorFullName, &comment.ProfilePicture,
			&comment.Content, &imagePathStr, &comment.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan comment: %w", err)
		}

		// Handle image path and extract image ID
		comment.ImagePath = imagePathStr
		if imagePathStr != "" {
			// Extract image ID from path like "/file?id=123"
			if _, err := fmt.Sscanf(imagePathStr, "/file?id=%d", &comment.ImageID); err != nil {
				comment.ImageID = 0 // Default if parsing fails
			}
		}

		comments = append(comments, comment)
	}

	return comments, nil
}

// ToggleLike toggles a like for a post
func (db *Database) ToggleLike(postID, userID int) error {
	// Check if already liked
	var exists bool
	err := db.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?)
	`, postID, userID).Scan(&exists)

	if err != nil {
		return fmt.Errorf("failed to check like existence: %w", err)
	}

	if exists {
		// Remove like
		_, err := db.db.Exec(`
			DELETE FROM likes WHERE post_id = ? AND user_id = ?
		`, postID, userID)
		if err != nil {
			return fmt.Errorf("failed to remove like: %w", err)
		}
	} else {
		// Add like
		_, err := db.db.Exec(`
			INSERT INTO likes (post_id, user_id) VALUES (?, ?)
		`, postID, userID)
		if err != nil {
			return fmt.Errorf("failed to add like: %w", err)
		}
	}

	return nil
}

// GetLikeCount gets the number of likes for a post
func (db *Database) GetLikeCount(postID int) (int, error) {
	var count int
	err := db.db.QueryRow(`
		SELECT COUNT(*) FROM likes WHERE post_id = ?
	`, postID).Scan(&count)
	return count, err
}

// GetLikedPosts retrieves posts that the user has liked
func (db *Database) GetLikedPosts(userID int) ([]Post, error) {
	query := `
		SELECT 
			p.id, p.user_id, u.nickname as author, 
			(u.first_name || ' ' || u.last_name) as author_full_name,
			u.email as author_email, u.profile_picture,
			p.content, COALESCE(p.image_path, '') as image_path, p.privacy, p.created_at, p.updated_at,
			COUNT(DISTINCT l2.id) as likes,
			COUNT(DISTINCT c.id) as comments,
			true as liked
		FROM posts p
		JOIN user u ON p.user_id = u.id
		JOIN likes l ON p.id = l.post_id AND l.user_id = ?
		LEFT JOIN likes l2 ON p.id = l2.post_id
		LEFT JOIN comments c ON p.id = c.post_id
		WHERE (
			p.privacy = 'public' 
			OR (p.privacy = 'followers' AND EXISTS(
				SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = p.user_id AND status = 'accepted'
			))
			OR (p.privacy = 'private' AND EXISTS(
				SELECT 1 FROM post_permissions WHERE post_id = p.id AND user_id = ?
			))
			OR p.user_id = ?
		)
		GROUP BY p.id
		ORDER BY l.created_at DESC
	`

	rows, err := db.db.Query(query, userID, userID, userID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query liked posts: %w", err)
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var post Post
		var imagePathStr string
		err := rows.Scan(
			&post.ID, &post.UserID, &post.Author, &post.AuthorFullName,
			&post.AuthorEmail, &post.ProfilePicture, &post.Content, &imagePathStr,
			&post.Privacy, &post.CreatedAt, &post.UpdatedAt,
			&post.Likes, &post.Comments, &post.Liked,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan liked post: %w", err)
		}

		// Handle image path and extract image ID
		post.ImagePath = imagePathStr
		if imagePathStr != "" {
			// Extract image ID from path like "/file?id=123"
			if _, err := fmt.Sscanf(imagePathStr, "/file?id=%d", &post.ImageID); err != nil {
				post.ImageID = 0 // Default if parsing fails
			}
		}

		posts = append(posts, post)
	}

	return posts, nil
}

// GetUserFollowers gets the list of users who follow the given user
func (db *Database) GetUserFollowers(userID int) ([]map[string]interface{}, error) {
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
