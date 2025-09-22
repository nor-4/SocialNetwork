package api

import (
	"backend/db"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
)

// the server-side internal structure to manage and handler the request in its lifetime
type apiRequest struct {
	claims      Claims
	requestBody string              // http request body (unprocessed)
	httpRequest *http.Request       // http request object for accessing query params
	httpWriter  http.ResponseWriter // http response writer for setting cookies
	response    string              // http response
	StatusCode  int
	Response    string

	responseCode int // http response code (default 200)
}

func (ar apiRequest) getUserPosts() {
	panic("unimplemented")
}

func (ar apiRequest) markNotificationRead() {
	panic("unimplemented")
}

func (ar apiRequest) getNotifications() {
	panic("unimplemented")
}

// signup handles user registration.  Modified to receive body string.
func (ar *apiRequest) signup() {

	var request RegistrationRequest
	// Use bodyString to decode the JSON
	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		log.Printf("Invalid request body: %v\n", err)

		ar.responseCode = http.StatusBadRequest
		errorResponse := map[string]string{"error": "Invalid request body"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	user := request.User
	user.Password = request.Password

	// Input validation (basic - expand for production)
	if strings.TrimSpace(user.Email) == "" || strings.TrimSpace(user.Password) == "" {
		log.Println("Username and password are required")

		ar.responseCode = http.StatusBadRequest
		errorResponse := map[string]string{"error": "Username and password are required"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	// Check if the username already exists
	if _, err := db.Connection.FetchUserByEmail(user.Email); err == nil {
		ar.responseCode = http.StatusConflict // HTTP 409 Conflict
		errorResponse := map[string]string{"error": "Email already exists"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	// Handle image upload with enhanced validation
	if request.ImageFilename != "" && request.ImageMimetype != "" && request.ImageData != "" {
		imageID, err := Images.UploadImage(request.ImageFilename, request.ImageMimetype, request.ImageData)
		if err != nil {
			log.Printf("Failed to upload image: %v\n", err)
			ar.responseCode = http.StatusBadRequest
			errorResponse := map[string]string{"error": fmt.Sprintf("Image upload failed: %v", err)}
			responseJSON, _ := json.Marshal(errorResponse)
			ar.response = string(responseJSON)
			return
		}
		user.ProfilePicture = imageID
		log.Printf("Profile picture uploaded successfully for user %s, image ID: %d", user.Email, imageID)
	}

	// Create the user
	userId, err := db.Connection.CreateUser(user)
	if err != nil {
		ar.responseCode = http.StatusInternalServerError
		errorResponse := map[string]string{"error": "Internal Server Error"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	log.Printf("New user registered: %s\n", user.Email)

	// Create a session for the user
	session := Sessions.CreateSession(userId, user.Email)

	// Set session cookie
	SetSessionCookie(ar.httpWriter, session.ID)

	c := Claims{
		Email: user.Email,
		Id:    userId,
	}

	token, err := c.GetBearer()

	if err != nil {
		log.Printf("failed to get bearer token: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		errorResponse := map[string]string{"error": "Internal server error"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	response := loginResponse{
		User:  user,
		Token: *token,
	}

	responseJSON, err := json.Marshal(response)

	if err != nil {
		log.Printf("Error marshalling response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		errorResponse := map[string]string{"error": "Internal server error"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	ar.response = string(responseJSON)
}

// login handles user login.  Modified to receive body string.
func (ar *apiRequest) login() {

	var request LoginRequest
	// Use bodyString to decode the JSON
	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		log.Printf("Invalid request body: %v\n", err)

		ar.responseCode = http.StatusBadRequest
		errorResponse := map[string]string{"error": "Invalid request body"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	// Basic input validation
	if strings.TrimSpace(request.Email) == "" || strings.TrimSpace(request.Password) == "" {
		log.Println("Username and password are required")

		ar.responseCode = http.StatusBadRequest
		errorResponse := map[string]string{"error": "Username and password are required"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	// Find the user
	user, err := db.Connection.FetchUserByEmail(request.Email)

	if err != nil {
		log.Printf("Invalid credentials - user not found: %s\n", err)
		ar.responseCode = http.StatusUnauthorized // 401 Unauthorized
		errorResponse := map[string]string{"error": "Invalid credentials"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	// Verify the password
	err = db.VerifyPassword(user.Password, request.Password)
	if err != nil {
		log.Printf("Password verification failed for %s: %v\n", request.Email, err)
		ar.responseCode = http.StatusUnauthorized // 401 Unauthorized
		errorResponse := map[string]string{"error": "Invalid credentials"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	log.Printf("User %s logged in\n", request.Email)

	// Create a session for the user
	session := Sessions.CreateSession(user.Id, user.Email)

	// Set session cookie
	SetSessionCookie(ar.httpWriter, session.ID)

	// Successful login generating user claims and sending them
	c := Claims{
		Email: user.Email,
		Id:    user.Id,
	}

	token, err := c.GetBearer()

	if err != nil {
		log.Printf("failed to get bearer token: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		errorResponse := map[string]string{"error": "Internal server error"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	response := loginResponse{
		User:  *user,
		Token: *token,
	}

	responseJSON, err := json.Marshal(response)

	if err != nil {
		log.Printf("Error marshalling response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		errorResponse := map[string]string{"error": "Internal server error"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	ar.response = string(responseJSON)
}

// logout handles user logout
func (ar *apiRequest) logout() {
	// Get session ID from cookie
	sessionID, err := GetSessionFromRequest(ar.httpRequest)
	if err == nil {
		// Delete the session
		Sessions.DeleteSession(sessionID)
		log.Printf("Logged out user session: %s", sessionID)
	}

	// Clear session cookie
	ClearSessionCookie(ar.httpWriter)

	// Return success response
	response := map[string]string{
		"message": "Successfully logged out",
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling logout response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	ar.response = string(responseJSON)
}

// uploadAvatar handles user avatar upload
func (ar *apiRequest) uploadAvatar() {
	var request struct {
		ImageData     string `json:"imageData"`
		ImageFilename string `json:"imageFilename"`
		ImageMimetype string `json:"imageMimetype"`
	}

	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		log.Printf("Invalid request body: %v\n", err)
		ar.responseCode = http.StatusBadRequest
		ar.response = "Invalid request body"
		return
	}

	// Validate input
	if request.ImageData == "" || request.ImageFilename == "" || request.ImageMimetype == "" {
		ar.responseCode = http.StatusBadRequest
		ar.response = "Missing image data, filename, or mimetype"
		return
	}

	// Upload image using the enhanced image handler
	imageID, err := Images.UploadImage(request.ImageFilename, request.ImageMimetype, request.ImageData)
	if err != nil {
		log.Printf("Failed to upload avatar: %v\n", err)
		ar.responseCode = http.StatusBadRequest
		ar.response = fmt.Sprintf("Avatar upload failed: %v", err)
		return
	}

	// Update user's profile picture in database
	err = db.Connection.UpdateUserProfilePicture(ar.claims.Id, imageID)
	if err != nil {
		log.Printf("Failed to update user profile picture: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Failed to update profile picture"
		return
	}

	log.Printf("Avatar uploaded successfully for user %d, image ID: %d", ar.claims.Id, imageID)

	// Return success response with image ID
	response := map[string]interface{}{
		"message":  "Avatar uploaded successfully",
		"imageId":  imageID,
		"imageUrl": fmt.Sprintf("/file?id=%d", imageID),
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling avatar upload response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	ar.response = string(responseJSON)
}

// getUserProfile handles fetching user profile by ID
func (ar *apiRequest) getUserProfile() {
	var request struct {
		UserID int `json:"userId"`
	}

	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		log.Printf("Invalid request body: %v\n", err)
		ar.responseCode = http.StatusBadRequest
		ar.response = "Invalid request body"
		return
	}

	if request.UserID <= 0 {
		ar.responseCode = http.StatusBadRequest
		ar.response = "Invalid user ID"
		return
	}

	// Get user profile from database
	user, err := db.Connection.FetchUser(request.UserID)
	if err != nil {
		log.Printf("Failed to fetch user profile: %v", err)
		ar.responseCode = http.StatusNotFound
		errorResponse := map[string]string{"error": "User not found"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	// Check follow status
	isFollowing, err := db.Connection.IsFollowing(ar.claims.Id, request.UserID)
	if err != nil {
		log.Printf("Failed to check follow status: %v", err)
		isFollowing = false
	}

	// Get follow stats
	followersCount, followingCount, err := db.Connection.GetFollowStats(request.UserID)
	if err != nil {
		log.Printf("Failed to get follow stats: %v", err)
		followersCount = 0
		followingCount = 0
	}

	// Get posts count
	postsCount, err := db.Connection.GetPostsCount(request.UserID)
	if err != nil {
		log.Printf("Failed to get posts count: %v", err)
		postsCount = 0
	}

	// Create response with additional profile info
	profileResponse := map[string]interface{}{
		"id":             user.Id,
		"email":          user.Email,
		"firstName":      user.FirstName,
		"lastName":       user.LastName,
		"nickname":       user.Nickname,
		"about":          user.About,
		"profilePicture": user.ProfilePicture,
		"isPublic":       user.Public,
		"isFollowing":    isFollowing,
		"followersCount": followersCount,
		"followingCount": followingCount,
		"postsCount":     postsCount,
	}

	responseJSON, err := json.Marshal(profileResponse)
	if err != nil {
		log.Printf("Error marshalling user profile response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	ar.response = string(responseJSON)
}

// getFollowRequests handles fetching follow requests for the authenticated user
func (ar *apiRequest) getFollowRequests() {
	requests, err := db.Connection.GetFollowRequestsForUser(ar.claims.Id)
	if err != nil {
		log.Printf("Failed to fetch follow requests: %v", err)
		ar.responseCode = http.StatusInternalServerError
		errorResponse := map[string]string{"error": "Failed to fetch follow requests"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	// Enrich requests with user details
	var enrichedRequests []map[string]interface{}
	for _, request := range requests {
		user, err := db.Connection.FetchUser(request.FollowerID)
		if err != nil {
			log.Printf("Failed to fetch user %d: %v", request.FollowerID, err)
			continue
		}

		enrichedRequest := map[string]interface{}{
			"id":             request.ID,
			"followerId":     request.FollowerID,
			"followerName":   fmt.Sprintf("%s %s", user.FirstName, user.LastName),
			"followerNick":   user.Nickname,
			"profilePicture": user.ProfilePicture,
			"createdAt":      request.CreatedAt,
		}
		enrichedRequests = append(enrichedRequests, enrichedRequest)
	}

	response := map[string]interface{}{
		"requests": enrichedRequests,
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling follow requests response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	ar.response = string(responseJSON)
}

// acceptFollowRequest handles accepting a follow request
func (ar *apiRequest) acceptFollowRequest() {
	var request struct {
		RequestID int `json:"requestId"`
	}

	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		log.Printf("Invalid request body: %v\n", err)
		ar.responseCode = http.StatusBadRequest
		ar.response = "Invalid request body"
		return
	}

	if request.RequestID <= 0 {
		ar.responseCode = http.StatusBadRequest
		ar.response = "Invalid request ID"
		return
	}

	// Get the follow request details
	followerID, followedID, err := db.Connection.GetFollowRequestDetails(request.RequestID)
	if err != nil {
		if err == sql.ErrNoRows {
			ar.responseCode = http.StatusNotFound
			ar.response = "Follow request not found or already processed"
			return
		}
		log.Printf("Failed to fetch follow request: %v", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	// Verify that the authenticated user is the one being followed
	if followedID != ar.claims.Id {
		ar.responseCode = http.StatusForbidden
		ar.response = "Not authorized to accept this follow request"
		return
	}

	// Accept the follow request
	err = db.Connection.AcceptFollowRequest(followerID, followedID)
	if err != nil {
		log.Printf("Failed to accept follow request: %v", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	response := map[string]string{
		"message": "Follow request accepted",
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling accept response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	ar.response = string(responseJSON)
}

// declineFollowRequest handles declining a follow request
func (ar *apiRequest) declineFollowRequest() {
	var request struct {
		RequestID int `json:"requestId"`
	}

	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		log.Printf("Invalid request body: %v\n", err)
		ar.responseCode = http.StatusBadRequest
		ar.response = "Invalid request body"
		return
	}

	if request.RequestID <= 0 {
		ar.responseCode = http.StatusBadRequest
		ar.response = "Invalid request ID"
		return
	}

	// Get the follow request details
	followerID, followedID, err := db.Connection.GetFollowRequestDetails(request.RequestID)
	if err != nil {
		if err == sql.ErrNoRows {
			ar.responseCode = http.StatusNotFound
			ar.response = "Follow request not found or already processed"
			return
		}
		log.Printf("Failed to fetch follow request: %v", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	// Verify that the authenticated user is the one being followed
	if followedID != ar.claims.Id {
		ar.responseCode = http.StatusForbidden
		ar.response = "Not authorized to decline this follow request"
		return
	}

	// Decline the follow request
	err = db.Connection.DeclineFollowRequest(followerID, followedID)
	if err != nil {
		log.Printf("Failed to decline follow request: %v", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	response := map[string]string{
		"message": "Follow request declined",
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling decline response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	ar.response = string(responseJSON)
}

// getUserPosts handles fetching posts by user ID
// func (ar *apiRequest) getUserPosts() {
// 	var request struct {
// 		UserID int `json:"userId"`
// 	}

// 	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
// 		log.Printf("Invalid request body: %v\n", err)
// 		ar.responseCode = http.StatusBadRequest
// 		ar.response = "Invalid request body"
// 		return
// 	}

// 	if request.UserID <= 0 {
// 		ar.responseCode = http.StatusBadRequest
// 		ar.response = "Invalid user ID"
// 		return
// 	}

// 	// Check if the requested user exists
// 	_, err := db.Connection.FetchUser(request.UserID)
// 	if err != nil {
// 		log.Printf("User not found: %v", err)
// 		ar.responseCode = http.StatusNotFound
// 		ar.response = "User not found"
// 		return
// 	}

// 	// Check privacy settings
// 	isPublic, err := db.Connection.IsUserPublic(request.UserID)
// 	if err != nil {
// 		log.Printf("Failed to check user privacy: %v", err)
// 		ar.responseCode = http.StatusInternalServerError
// 		ar.response = "Internal server error"
// 		return
// 	}

// 	// If profile is public or user is following the requested user, show posts
// 	var posts []map[string]interface{}
// 	if isPublic {
// 		posts, err = db.Connection.GetUserPosts(request.UserID)
// 		if err != nil {
// 			log.Printf("Failed to fetch user posts: %v", err)
// 			ar.responseCode = http.StatusInternalServerError
// 			ar.response = "Internal server error"
// 			return
// 		}
// 	} else {
// 		// Check if current user is following the requested user
// 		isFollowing, err := db.Connection.IsFollowing(ar.claims.Id, request.UserID)
// 		if err != nil {
// 			log.Printf("Failed to check follow status: %v", err)
// 			ar.responseCode = http.StatusInternalServerError
// 			ar.response = "Internal server error"
// 			return
// 		}

// 		if isFollowing {
// 			posts, err = db.Connection.GetUserPosts(request.UserID)
// 			if err != nil {
// 				log.Printf("Failed to fetch user posts: %v", err)
// 				ar.responseCode = http.StatusInternalServerError
// 				ar.response = "Internal server error"
// 				return
// 			}
// 		} else {
// 			// Return empty array for private profiles that user doesn't follow
// 			posts = []map[string]interface{}{}
// 		}
// 	}

// 	response := map[string]interface{}{
// 		"posts": posts,
// 	}

// 	responseJSON, err := json.Marshal(response)
// 	if err != nil {
// 		log.Printf("Error marshalling user posts response: %v\n", err)
// 		ar.responseCode = http.StatusInternalServerError
// 		ar.response = "Internal server error"
// 		return
// 	}

// 	ar.response = string(responseJSON)
// }

// updateProfile handles updating user profile information
func (ar *apiRequest) updateProfile() {
	var request struct {
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Nickname  string `json:"nickname"`
		About     string `json:"about"`
		IsPublic  bool   `json:"isPublic"`
	}

	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		log.Printf("Invalid request body: %v\n", err)
		ar.responseCode = http.StatusBadRequest
		ar.response = "Invalid request body"
		return
	}

	// Update user profile in database
	user := db.User{
		Id:        ar.claims.Id,
		FirstName: request.FirstName,
		LastName:  request.LastName,
		Nickname:  request.Nickname,
		About:     request.About,
		Public:    request.IsPublic,
	}

	err := db.Connection.UpdateUser(user)
	if err != nil {
		log.Printf("Failed to update user profile: %v", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Failed to update profile"
		return
	}

	response := map[string]string{
		"message": "Profile updated successfully",
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling profile update response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	ar.response = string(responseJSON)
}

// getFollowing handles fetching users that the current user is following
func (ar *apiRequest) getFollowing() {
	var request struct {
		UserID int `json:"userId,omitempty"`
	}

	// Parse request body to get optional userId
	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		log.Printf("Invalid request body: %v\n", err)
		// Use current user if parsing fails
		request.UserID = ar.claims.Id
	}

	// If no userId specified, use current user
	if request.UserID == 0 {
		request.UserID = ar.claims.Id
	}

	following, err := db.Connection.GetFollowing(request.UserID)
	if err != nil {
		log.Printf("Failed to fetch following: %v", err)
		ar.responseCode = http.StatusInternalServerError
		errorResponse := map[string]string{"error": "Failed to fetch following"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	response := map[string]interface{}{
		"following": following,
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling following response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	ar.response = string(responseJSON)
}

// getFollowersForUser handles fetching followers for a specific user
func (ar *apiRequest) getFollowersForUser() {
	var request struct {
		UserID int `json:"userId,omitempty"`
	}

	// Parse request body to get optional userId
	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		log.Printf("Invalid request body: %v\n", err)
		// Use current user if parsing fails
		request.UserID = ar.claims.Id
	}

	// If no userId specified, use current user
	if request.UserID == 0 {
		request.UserID = ar.claims.Id
	}

	followers, err := db.Connection.GetFollowers(request.UserID)
	if err != nil {
		log.Printf("Failed to fetch followers: %v", err)
		ar.responseCode = http.StatusInternalServerError
		errorResponse := map[string]string{"error": "Failed to fetch followers"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	response := map[string]interface{}{
		"followers": followers,
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling followers response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	ar.response = string(responseJSON)
}

// toggleFollow handles follow/unfollow functionality
func (ar *apiRequest) toggleFollow() {
	var request struct {
		UserID int `json:"userId"`
	}

	if err := json.Unmarshal([]byte(ar.requestBody), &request); err != nil {
		log.Printf("Invalid request body: %v\n", err)
		ar.responseCode = http.StatusBadRequest
		ar.response = "Invalid request body"
		return
	}

	if request.UserID <= 0 {
		ar.responseCode = http.StatusBadRequest
		ar.response = "Invalid user ID"
		return
	}

	// Prevent following yourself
	if request.UserID == ar.claims.Id {
		ar.responseCode = http.StatusBadRequest
		errorResponse := map[string]string{"error": "Cannot follow yourself"}
		responseJSON, _ := json.Marshal(errorResponse)
		ar.response = string(responseJSON)
		return
	}

	// Check if already following
	isFollowing, err := db.Connection.IsFollowing(ar.claims.Id, request.UserID)
	if err != nil {
		log.Printf("Failed to check follow status: %v", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	if isFollowing {
		// Unfollow
		err = db.Connection.Unfollow(ar.claims.Id, request.UserID)
		if err != nil {
			log.Printf("Failed to unfollow: %v", err)
			ar.responseCode = http.StatusInternalServerError
			ar.response = "Internal server error"
			return
		}
		isFollowing = false
	} else {
		// Check if there's a pending request
		hasPending, err := db.Connection.HasPendingFollowRequest(ar.claims.Id, request.UserID)
		if err != nil {
			log.Printf("Failed to check pending follow request: %v", err)
			ar.responseCode = http.StatusInternalServerError
			ar.response = "Internal server error"
			return
		}

		if hasPending {
			// Cancel pending request
			err = db.Connection.DeclineFollowRequest(ar.claims.Id, request.UserID)
			if err != nil {
				log.Printf("Failed to cancel follow request: %v", err)
				ar.responseCode = http.StatusInternalServerError
				ar.response = "Internal server error"
				return
			}
			isFollowing = false
		} else {
			// Create follow request
			err = db.Connection.CreateFollowRequest(ar.claims.Id, request.UserID)
			if err != nil {
				log.Printf("Failed to create follow request: %v", err)
				ar.responseCode = http.StatusInternalServerError
				ar.response = "Internal server error"
				return
			}

			// Check if it was automatically accepted (public profile)
			isFollowing, err = db.Connection.IsFollowing(ar.claims.Id, request.UserID)
			if err != nil {
				log.Printf("Failed to check follow status after request: %v", err)
				ar.responseCode = http.StatusInternalServerError
				ar.response = "Internal server error"
				return
			}
		}
	}

	response := map[string]interface{}{
		"isFollowing": isFollowing,
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling toggle follow response: %v\n", err)
		ar.responseCode = http.StatusInternalServerError
		ar.response = "Internal server error"
		return
	}

	ar.response = string(responseJSON)
}
