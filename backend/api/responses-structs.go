package api

import "backend/db"

type loginResponse struct {
	User  db.User `json:"user"`
	Token string  `json:"token"`
}
