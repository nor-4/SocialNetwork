package api

import (
	"backend/db"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// Helper function to get minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Extract "action" from the request body (JSON)
func Router(w http.ResponseWriter, r *http.Request) {
	// Handle preflight request for CORS
	w.Header().Set("Allow", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return // Preflight request handled
	}

	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		errorResponse := map[string]string{"error": "Method not allowed"}
		responseJSON, _ := json.Marshal(errorResponse)
		w.Write(responseJSON)
		return
	}

	bodyBytes, _ := io.ReadAll(r.Body) // Read the body to handle errors
	_ = r.Body.Close()

	var api API
	if err := json.Unmarshal(bodyBytes, &api); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		errorResponse := map[string]string{"error": "Invalid JSON in request body or missing action"}
		responseJSON, _ := json.Marshal(errorResponse)
		w.Write(responseJSON)
		return // exit if there was a json decode error
	}

	action := api.Action
	if action == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		errorResponse := map[string]string{"error": "Missing action in request body"}
		responseJSON, _ := json.Marshal(errorResponse)
		w.Write(responseJSON)
		return
	}

	bodyString := string(bodyBytes)

	// Try session-based authentication first (preferred)
	var claims *Claims

	// Check for session cookie authentication
	if sessionClaims, sessionErr := ValidateSession(r); sessionErr == nil && sessionClaims != nil {
		claims = sessionClaims
		log.Printf("Authenticated user %d via session", claims.Id)
	} else {
		// Fallback to token-based authentication (for backwards compatibility)
		auth := r.Header.Get("Authorization")

		if auth == "" {
			if action != "login" && action != "signup" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				errorResponse := map[string]string{"error": "Missing Authentication (no session or token)"}
				responseJSON, _ := json.Marshal(errorResponse)
				w.Write(responseJSON)
				return
			}
		} else {
			// Remove "Bearer " prefix if present
			token := auth
			if strings.HasPrefix(auth, "Bearer ") {
				token = auth[7:] // Remove "Bearer " (7 characters)
				log.Printf("Stripped Bearer prefix. Token length: %d", len(token))
			} else {
				log.Printf("No Bearer prefix found. Raw auth header: %s", auth[:min(50, len(auth))])
			}

			tokenClaims, err := UnmarshalBearer(&token)

			if err != nil || tokenClaims == nil {
				log.Printf("Error unmarshalling token: %v\n", err)
				log.Printf("Token being parsed (first 50 chars): %s", token[:min(50, len(token))])
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				errorResponse := map[string]string{"error": "Bad Authorization Token"}
				responseJSON, _ := json.Marshal(errorResponse)
				w.Write(responseJSON)
				return
			}
			claims = tokenClaims
			log.Printf("Authenticated user %d via token", claims.Id)
		}
	}

	// Ensure claims is never nil for unauthenticated actions
	if claims == nil {
		claims = &Claims{}
	}

	request := apiRequest{
		claims:       *claims,
		requestBody:  bodyString,
		httpRequest:  r,
		httpWriter:   w,
		response:     "",
		responseCode: http.StatusOK,
	}

	switch action {
	case "signup":
		request.signup()
	case "login":
		request.login()
	case "logout":
		request.logout()
	case "upload_avatar":
		request.uploadAvatar()
	case "create_post":
		request.createPost()
	case "get_posts":
		request.getPosts()
	case "get_liked_posts":
		request.getLikedPosts()
	case "create_comment":
		request.createComment()
	case "get_comments":
		request.getComments()
	case "toggle_like":
		request.toggleLike()
	case "get_followers":
		request.getFollowers()
	case "get_user_profile":
		request.getUserProfile()
	case "get_user_posts":
		request.getUserPosts()
	case "toggle_follow":
		request.toggleFollow()
	case "get_notifications":
		request.getNotifications()
	case "mark_notification_read":
		request.markNotificationRead()
	case "get_follow_requests":
		request.getFollowRequests()
	case "accept_follow_request":
		request.acceptFollowRequest()
	case "decline_follow_request":
		request.declineFollowRequest()
	case "update_profile":
		request.updateProfile()
	case "get_following":
		request.getFollowing()
	case "get_followers":
		request.getFollowersForUser()
	default:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		errorResponse := map[string]string{"error": "Invalid action"}
		responseJSON, _ := json.Marshal(errorResponse)
		w.Write(responseJSON)
		return
	}

	if request.responseCode < 300 {
		w.Header().Add("Content-Type", "application/json")
	}

	w.WriteHeader(request.responseCode)
	w.Write([]byte(request.response))
}

func File(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers for file serving
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Query().Get("id")

	if idStr == "" {
		http.Error(w, "Missing 'id' parameter", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid 'id' parameter: Must be an integer", http.StatusBadRequest)
		return
	}

	file, err := db.Connection.GetFileByID(id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", file.Name))
	w.Header().Set("Content-Type", file.Mimetype)

	_, err = w.Write(file.Data)
	if err != nil {
		fmt.Println("Error writing response:", err)
	}
}
