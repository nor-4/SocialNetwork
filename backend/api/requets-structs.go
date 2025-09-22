package api

import "backend/db"

type API struct {
	Action string `json:"action"`
}

type RegistrationRequest struct {
	User          db.User `json:"user"`
	Password      string  `json:"password"`
	ImageFilename string  `json:"imageFilename"`
	ImageMimetype string  `json:"imageMimetype"`
	ImageData     string  `json:"imageData"` // Base64 string from frontend
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
