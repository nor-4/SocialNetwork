package db

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
)

func (db *Database) UploadImage(filename string, mimetype string, imageData []byte) (int, error) {

	if len(imageData) == 0 {
		return 0, fmt.Errorf("image data cannot be empty")
	}
	if filename == "" {
		return 0, fmt.Errorf("filename cannot be empty")
	}
	if mimetype == "" {
		return 0, fmt.Errorf("mimetype cannot be empty")
	}

	result, err := db.db.Exec(`INSERT INTO file (data, filename, mimetype) VALUES (?, ?, ?)`,
		imageData, filename, mimetype)

	if err != nil {
		return 0, fmt.Errorf("failed to execute insert statement: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to retrieve last insert ID: %w", err)
	}

	return int(id), nil
}

type File struct {
	ID       int
	Data     []byte
	Name     string
	Mimetype string
}

func (db *Database) GetFileByID(id int) (*File, error) {
	query := "SELECT id, data, filename, mimetype FROM file WHERE id = ?"
	row := db.db.QueryRow(query, id)

	var file File
	err := row.Scan(&file.ID, &file.Data, &file.Name, &file.Mimetype)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("file with id %d not found\n", id)
		} else {
			log.Printf("error scanning row: %w\n", err)

		}

		return nil, errors.New("file not found")
	}

	return &file, nil
}
