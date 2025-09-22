package db

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/sqlite"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "modernc.org/sqlite"
)

// Database struct manages the database connection and table name.
type Database struct {
	db *sql.DB
}

func (d Database) GetUserPosts(param1 int) ([]map[string]interface{}, error) {
	panic("unimplemented")
}

func (d Database) IsUserPublic(param1 int) (any, error) {
	panic("unimplemented")
}

func (d Database) IsPostLikedByUser(postID int, userID int) (bool, error) {
	var exists bool
	err := d.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?)
	`, postID, userID).Scan(&exists)
	return exists, err
}

var Connection Database

// OpenOrCreate a new database. return a database connection
func (d *Database) OpenOrCreate(dbPath string, migrationsPath string) error {

	_, err := os.Stat(dbPath)

	if err == nil {
		log.Printf("Database file '%s' already exists. Skipping migrations.", dbPath)
		return d.Open(dbPath)
	}

	if errors.Is(err, os.ErrNotExist) {
		log.Printf("Database file '%s' not found. Attempting to create and migrate...", dbPath)

		log.Println("Initializing migration instance...")
		m, err := migrate.New("file://"+migrationsPath, "sqlite://"+dbPath)
		if err != nil {
			log.Fatalf("Failed to create migration instance: %v", err)
		}

		log.Println("Applying migrations...")
		err = m.Up()
		if err != nil {
			// Check if the error is "no change" - shouldn't happen on first run, but good practice
			if errors.Is(err, migrate.ErrNoChange) {
				log.Println("No migrations to apply (though DB file was initially missing).")
			} else {
				// For any other error, log fatally
				log.Fatalf("Migration failed: %v", err)
			}
		} else {
			log.Println("Database created and migrations applied successfully!")
		}

		// --- Check Migration Status (Optional but good after migrating) ---
		version, dirty, err := m.Version()
		if err != nil {
			log.Printf("Warning: Could not get migration version after applying: %v", err)
		} else {
			log.Printf("Current migration version: %d, Dirty state: %v", version, dirty)
			if dirty {
				log.Println("WARNING: Migration state is dirty. Manual intervention might be required.")
			}
		}

		// Close resources
		sourceErr, dbErr := m.Close()
		if sourceErr != nil {
			log.Printf("Warning: Error closing migration source: %v", sourceErr)
		}
		if dbErr != nil {
			log.Printf("Warning: Error closing migration database connection: %v", dbErr)
		}

	} else {
		// Another error occurred during os.Stat (e.g., permission denied)
		log.Fatalf("Error checking database file '%s': %v", dbPath, err)
	}

	return d.Open(dbPath)
}

// Open database connection
func (d *Database) Open(dbPath string) error {

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	d.db = db
	return nil
}

// Close closes the database connection.
func (d *Database) Close() error {
	return d.db.Close()
}
