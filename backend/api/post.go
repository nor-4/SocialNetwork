package api

import (
	"backend/db"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

// apiRequest struct is defined in requets.go, so do not redefine it here.

func (ar *apiRequest) createPost() {
	var request CreatePostRequest
	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		ar.setError(http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	if request.Content == "" {
		ar.setError(http.StatusBadRequest, "Post content cannot be empty")
		return
	}

	if request.Privacy == "" {
		request.Privacy = "public"
	}

	// Validate privacy setting
	if request.Privacy != "public" && request.Privacy != "followers" && request.Privacy != "private" {
		ar.setError(http.StatusBadRequest, "Invalid privacy setting. Must be 'public', 'followers', or 'private'")
		return
	}

	// Handle image upload if provided
	var imageID int
	if request.ImageData != "" && request.ImageFilename != "" && request.ImageMimetype != "" {
		uploadedImageID, err := ar.uploadImageFromBase64(request.ImageData, request.ImageFilename, request.ImageMimetype)
		if err != nil {
			log.Printf("Failed to upload image: %v", err)
			ar.setError(http.StatusInternalServerError, "Failed to upload image")
			return
		}
		imageID = uploadedImageID
	}

	// Create post
	postID, err := db.Connection.CreatePost(ar.claims.Id, request.Content, imageID, request.Privacy, request.SelectedFollowers)
	if err != nil {
		log.Printf("Failed to create post: %v", err)
		ar.setError(http.StatusInternalServerError, "Failed to create post")
		return
	}

	// Get the created post with details
	posts, err := db.Connection.GetPosts(ar.claims.Id)
	if err != nil {
		log.Printf("Failed to fetch posts: %v", err)
		ar.setError(http.StatusInternalServerError, "Failed to fetch posts")
		return
	}

	var createdPost db.Post
	for _, post := range posts {
		if post.ID == postID {
			createdPost = post
			break
		}
	}

	response := PostResponse{
		ID:             createdPost.ID,
		UserID:         createdPost.UserID,
		Author:         createdPost.Author,
		AuthorFullName: createdPost.AuthorFullName,
		AuthorEmail:    createdPost.AuthorEmail,
		ProfilePicture: createdPost.ProfilePicture,
		Content:        createdPost.Content,
		ImageID:        createdPost.ImageID,
		ImagePath:      createdPost.ImagePath,
		Privacy:        createdPost.Privacy,
		CreatedAt:      createdPost.CreatedAt,
		Liked:          createdPost.Liked,
		Likes:          createdPost.Likes,
		Comments:       createdPost.Comments,
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		ar.setError(http.StatusInternalServerError, "Internal server error")
		return
	}

	ar.response = string(responseJSON)
}

func (ar *apiRequest) getPosts() {
	posts, err := db.Connection.GetPosts(ar.claims.Id)
	if err != nil {
		log.Printf("Failed to fetch posts: %v", err)
		ar.setError(http.StatusInternalServerError, "Failed to fetch posts")
		return
	}

	var responsePosts []PostResponse
	for _, post := range posts {
		responsePosts = append(responsePosts, PostResponse{
			ID:             post.ID,
			UserID:         post.UserID,
			Author:         post.Author,
			AuthorFullName: post.AuthorFullName,
			AuthorEmail:    post.AuthorEmail,
			ProfilePicture: post.ProfilePicture,
			Content:        post.Content,
			ImageID:        post.ImageID,
			ImagePath:      post.ImagePath,
			Privacy:        post.Privacy,
			CreatedAt:      post.CreatedAt,
			Liked:          post.Liked,
			Likes:          post.Likes,
			Comments:       post.Comments,
		})
	}

	response := PostsResponse{Posts: responsePosts}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		ar.setError(http.StatusInternalServerError, "Internal server error")
		return
	}

	ar.response = string(responseJSON)
}

func (ar *apiRequest) getLikedPosts() {
	posts, err := db.Connection.GetLikedPosts(ar.claims.Id)
	if err != nil {
		log.Printf("Failed to fetch liked posts: %v", err)
		ar.setError(http.StatusInternalServerError, "Failed to fetch liked posts")
		return
	}

	var responsePosts []PostResponse
	for _, post := range posts {
		responsePosts = append(responsePosts, PostResponse{
			ID:             post.ID,
			UserID:         post.UserID,
			Author:         post.Author,
			AuthorFullName: post.AuthorFullName,
			AuthorEmail:    post.AuthorEmail,
			ProfilePicture: post.ProfilePicture,
			Content:        post.Content,
			ImageID:        post.ImageID,
			ImagePath:      post.ImagePath,
			Privacy:        post.Privacy,
			CreatedAt:      post.CreatedAt,
			Liked:          post.Liked,
			Likes:          post.Likes,
			Comments:       post.Comments,
		})
	}

	response := PostsResponse{Posts: responsePosts}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		ar.setError(http.StatusInternalServerError, "Internal server error")
		return
	}

	ar.response = string(responseJSON)
}

func (ar *apiRequest) createComment() {
	var request CreateCommentRequest
	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		ar.setError(http.StatusBadRequest, "Invalid request body")
		return
	}

	if request.Content == "" {
		ar.setError(http.StatusBadRequest, "Comment content cannot be empty")
		return
	}

	// Handle image upload if provided
	var imageID int
	if request.ImageData != "" && request.ImageFilename != "" && request.ImageMimetype != "" {
		uploadedImageID, err := ar.uploadImageFromBase64(request.ImageData, request.ImageFilename, request.ImageMimetype)
		if err != nil {
			log.Printf("Failed to upload image: %v", err)
			ar.setError(http.StatusInternalServerError, "Failed to upload image")
			return
		}
		imageID = uploadedImageID
	}

	commentID, err := db.Connection.CreateComment(request.PostID, ar.claims.Id, request.Content, imageID)
	if err != nil {
		log.Printf("Failed to create comment: %v", err)
		ar.setError(http.StatusInternalServerError, "Failed to create comment")
		return
	}

	// Create notification for the comment
	// err = db.Connection.CreateCommentNotification(request.PostID, ar.claims.Id)
	// if err != nil {
	// 	log.Printf("Failed to create comment notification: %v", err)
	// 	// Don't fail the request if notification creation fails
	// }

	// Get the created comment
	comments, err := db.Connection.GetComments(request.PostID)
	if err != nil {
		log.Printf("Failed to fetch comments: %v", err)
		ar.setError(http.StatusInternalServerError, "Failed to fetch comments")
		return
	}

	var createdComment db.Comment
	for _, comment := range comments {
		if comment.ID == commentID {
			createdComment = comment
			break
		}
	}

	response := CommentResponse{
		ID:             createdComment.ID,
		PostID:         createdComment.PostID,
		UserID:         createdComment.UserID,
		Author:         createdComment.Author,
		AuthorFullName: createdComment.AuthorFullName,
		ProfilePicture: createdComment.ProfilePicture,
		Content:        createdComment.Content,
		ImageID:        createdComment.ImageID,
		ImagePath:      createdComment.ImagePath,
		CreatedAt:      createdComment.CreatedAt,
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		ar.setError(http.StatusInternalServerError, "Internal server error")
		return
	}

	ar.response = string(responseJSON)
}

func (ar *apiRequest) getComments() {
	// Parse the request body to get postId
	var request struct {
		Action string `json:"action"`
		PostID int    `json:"postId"`
	}

	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		ar.setError(http.StatusBadRequest, "Invalid request body")
		return
	}

	if request.PostID == 0 {
		ar.setError(http.StatusBadRequest, "postId parameter is required")
		return
	}

	postID := request.PostID

	comments, err := db.Connection.GetComments(postID)
	if err != nil {
		log.Printf("Failed to fetch comments: %v", err)
		ar.setError(http.StatusInternalServerError, "Failed to fetch comments")
		return
	}

	var responseComments []CommentResponse
	for _, comment := range comments {
		responseComments = append(responseComments, CommentResponse{
			ID:             comment.ID,
			PostID:         comment.PostID,
			UserID:         comment.UserID,
			Author:         comment.Author,
			AuthorFullName: comment.AuthorFullName,
			ProfilePicture: comment.ProfilePicture,
			Content:        comment.Content,
			ImageID:        comment.ImageID,
			ImagePath:      comment.ImagePath,
			CreatedAt:      comment.CreatedAt,
		})
	}

	response := CommentsResponse{Comments: responseComments}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		ar.setError(http.StatusInternalServerError, "Internal server error")
		return
	}

	ar.response = string(responseJSON)
}

func (ar *apiRequest) toggleLike() {
	// Parse the request body to get postId
	var request struct {
		Action string `json:"action"`
		PostID int    `json:"postId"`
	}

	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		ar.setError(http.StatusBadRequest, "Invalid request body")
		return
	}

	if request.PostID == 0 {
		ar.setError(http.StatusBadRequest, "postId parameter is required")
		return
	}

	postID := request.PostID

	err := db.Connection.ToggleLike(postID, ar.claims.Id)
	if err != nil {
		log.Printf("Failed to toggle like: %v", err)
		ar.setError(http.StatusInternalServerError, "Failed to toggle like")
		return
	}

	// // Check if user liked the post (after toggle)
	// liked, err := db.Connection.IsPostLikedByUser(postID, ar.claims.Id)
	// if err != nil {
	// 	log.Printf("Failed to check like status: %v", err)
	// 	ar.setError(http.StatusInternalServerError, "Failed to check like status")
	// 	return
	// }

	// // Create notification only if the post was liked (not unliked)
	// if liked {
	// 	err = db.Connection.CreateLikeNotification(postID, ar.claims.Id)
	// 	if err != nil {
	// 		log.Printf("Failed to create like notification: %v", err)
	// 		// Don't fail the request if notification creation fails
	// 	}
	// }

	// Get updated like count
	likeCount, err := db.Connection.GetLikeCount(postID)
	if err != nil {
		log.Printf("Failed to get like count: %v", err)
		ar.setError(http.StatusInternalServerError, "Failed to get like count")
		return
	}
		// Check if user liked the post
	liked, err := db.Connection.IsPostLikedByUser(postID, ar.claims.Id)
	if err != nil {
		log.Printf("Failed to check like status: %v", err)
		ar.setError(http.StatusInternalServerError, "Failed to check like status")
		return
	}

	response := map[string]interface{}{
		"liked":     liked,
		"likeCount": likeCount,
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		ar.setError(http.StatusInternalServerError, "Internal server error")
		return
	}

	ar.response = string(responseJSON)
}

// uploadImageFromBase64 handles uploading an image from base64 data
func (ar *apiRequest) uploadImageFromBase64(imageData, filename, mimetype string) (int, error) {
	// Decode base64 data
	data, err := base64DecodeString(imageData)
	if err != nil {
		return 0, fmt.Errorf("failed to decode base64 image: %w", err)
	}

	// Store file in database
	fileID, err := db.Connection.UploadImage(filename, mimetype, data)
	if err != nil {
		return 0, fmt.Errorf("failed to store file: %w", err)
	}

	return fileID, nil
}

// getFollowers returns the list of followers for the current user (for private post selection)
func (ar *apiRequest) getFollowers() {
	followers, err := db.Connection.GetUserFollowers(ar.claims.Id)
	if err != nil {
		log.Printf("Failed to fetch followers: %v", err)
		ar.setError(http.StatusInternalServerError, "Failed to fetch followers")
		return
	}

	response := map[string]interface{}{
		"followers": followers,
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		ar.setError(http.StatusInternalServerError, "Internal server error")
		return
	}

	ar.response = string(responseJSON)
}

// base64DecodeString decodes a base64 string
func base64DecodeString(s string) ([]byte, error) {
	return base64.StdEncoding.DecodeString(s)
}

// setError sets the error response and status code for the apiRequest.
func (ar *apiRequest) setError(statusCode int, message string) {
	ar.response = fmt.Sprintf(`{"error": "%s"}`, message)
	ar.responseCode = statusCode
}

// Helper function to get query parameters
func (ar *apiRequest) getQueryParam(key string) string {
	if ar.httpRequest != nil {
		return ar.httpRequest.URL.Query().Get(key)
	}
	return ""
}