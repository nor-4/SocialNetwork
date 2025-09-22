package api

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"sync"
	"time"
)

// Session represents a user session
type Session struct {
	ID        string    `json:"id"`
	UserID    int       `json:"user_id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

// SessionManager manages user sessions
type SessionManager struct {
	sessions map[string]*Session
	mutex    sync.RWMutex
}

var Sessions = &SessionManager{
	sessions: make(map[string]*Session),
}

// GenerateSessionID creates a new random session ID
func GenerateSessionID() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		log.Printf("Error generating session ID: %v", err)
		return ""
	}
	return hex.EncodeToString(bytes)
}

// CreateSession creates a new session for a user
func (sm *SessionManager) CreateSession(userID int, email string) *Session {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	sessionID := GenerateSessionID()
	session := &Session{
		ID:        sessionID,
		UserID:    userID,
		Email:     email,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(24 * time.Hour), // Session expires in 24 hours
	}

	sm.sessions[sessionID] = session
	log.Printf("Created session %s for user %d", sessionID, userID)
	return session
}

// GetSession retrieves a session by ID
func (sm *SessionManager) GetSession(sessionID string) (*Session, bool) {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	session, exists := sm.sessions[sessionID]
	if !exists {
		return nil, false
	}

	// Check if session has expired
	if time.Now().After(session.ExpiresAt) {
		// Session expired, remove it
		delete(sm.sessions, sessionID)
		return nil, false
	}

	return session, true
}

// DeleteSession removes a session
func (sm *SessionManager) DeleteSession(sessionID string) {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	delete(sm.sessions, sessionID)
	log.Printf("Deleted session %s", sessionID)
}

// CleanupExpiredSessions removes expired sessions
func (sm *SessionManager) CleanupExpiredSessions() {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	now := time.Now()
	for sessionID, session := range sm.sessions {
		if now.After(session.ExpiresAt) {
			delete(sm.sessions, sessionID)
			log.Printf("Cleaned up expired session %s", sessionID)
		}
	}
}

// SetSessionCookie sets the session cookie in the response
func SetSessionCookie(w http.ResponseWriter, sessionID string) {
	cookie := &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(24 * time.Hour),
	}
	http.SetCookie(w, cookie)
	log.Printf("Set session cookie: %s", sessionID)
}

// ClearSessionCookie clears the session cookie
func ClearSessionCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Unix(0, 0), // Expire immediately
	}
	http.SetCookie(w, cookie)
	log.Printf("Cleared session cookie")
}

// GetSessionFromRequest extracts session ID from request cookies
func GetSessionFromRequest(r *http.Request) (string, error) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return "", err
	}
	return cookie.Value, nil
}

// ValidateSession validates a session and returns user claims
func ValidateSession(r *http.Request) (*Claims, error) {
	sessionID, err := GetSessionFromRequest(r)
	if err != nil {
		return nil, err
	}

	session, exists := Sessions.GetSession(sessionID)
	if !exists {
		return nil, err
	}

	return &Claims{
		Id:    session.UserID,
		Email: session.Email,
	}, nil
}

// StartSessionCleanup starts a goroutine to periodically clean up expired sessions
func StartSessionCleanup() {
	go func() {
		ticker := time.NewTicker(1 * time.Hour) // Clean up every hour
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				Sessions.CleanupExpiredSessions()
			}
		}
	}()
}
