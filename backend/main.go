package main

import (
	"backend/api"
	"backend/db"
	"fmt"
	"log"
	"net/http"
	"os"
)

// Configurable constants, can be loaded from environment variables
var (
	port      = ":8080"
	dataDir   = "data"
	staticDir = "static"
)

func init() {

	loadEnvironment()
	api.GenOrLoadKey(dataDir)
	genDevToken()

	// Start session cleanup goroutine
	api.StartSessionCleanup()

	if err := db.Connection.OpenOrCreate(dataDir+"/social-backend.db", "database-migrations"); err != nil {
		log.Fatalf("Failed to open database connection: %v", err)
	}
}

func main() {

	defer db.Connection.Close()
	testDB()

	// File server
	fs := http.FileServer(http.Dir(staticDir))

	// Handlers
	http.Handle("/", http.StripPrefix("/", fs)) // Serves files from the static directory
	http.HandleFunc("/api", api.Router)
	http.HandleFunc("/ws", api.HandleWebSocket)
	http.HandleFunc("/file", api.File)

	fmt.Printf("Server starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}

func loadEnvironment() {
	// Get environment variables, using default values if not set

	envPort := os.Getenv("PORT")
	if envPort != "" {
		port = ":" + envPort
	}

	envDataDir := os.Getenv("DATA_DIR")
	if envDataDir != "" {
		dataDir = envDataDir
	}

	envStaticDir := os.Getenv("STATIC_DIR")
	if envStaticDir != "" {
		staticDir = envStaticDir
	}

	// this will be used later on in docker build, in dev it's not used
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		if err := os.Mkdir(staticDir, 0755); err != nil {
			log.Fatalf("Failed to create static directory: %v", err)
		}
	}

	// creating data dir for persistent server files
	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		if err := os.Mkdir(dataDir, 0755); err != nil {
			log.Fatalf("Failed to create data directory: %v", err)
		}
	}
}

func genDevToken() {
	c := api.Claims{
		Email: "admin@test.fake",
		Id:    1,
	}

	sig, _ := c.GetBearer()
	log.Printf("Authorization: %s\n", *sig)
}

func testDB() {
	newUser := db.User{
		Email:     "test@example.com",
		Password:  "password123",
		FirstName: "name",
		LastName:  "name",
		Dob:       "2005-05-19",
		Nickname:  "nickname",
		About:     "about",
		Public:    true,
	}

	connection := db.Connection

	userID, err := connection.CreateUser(newUser)
	if err != nil {
		log.Printf("Failed to create user: %v", err)
	} else {
		log.Printf("User created with ID: %d", userID)
	}

	// Fetch the created user
	fetchedUser, err := connection.FetchUser(1)
	if err != nil {
		log.Printf("Failed to fetch user: %v", err)
		return
	}

	fmt.Printf("Fetched User: %+v\n", fetchedUser)

	err = connection.UpdateUser(*fetchedUser)
	if err != nil {
		log.Printf("Failed to update user: %v", err)
	} else {
		fmt.Println("User updated successfully.")
	}

	// Fetch the updated user
	updatedUser, err := connection.FetchUser(1)
	if err != nil {
		log.Printf("Failed to fetch updated user: %v", err)
	} else {
		fmt.Printf("Updated User: %+v\n", updatedUser)
	}

	userJSON, _ := fetchedUser.Marshal()
	fmt.Println(string(userJSON))

	c, err := connection.FetchConversationsForUser(2)

	if err != nil {
		log.Printf("Failed to fetch Conversations for user: %v", err)
	} else {
		fmt.Printf("Conversations: %+v\n", c)
	}
}
