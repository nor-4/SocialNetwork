package api

import (
	"backend/db"
	"encoding/base64"
	"fmt"
	"log"
	"strings"
)

// Supported image types
var SupportedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/jpg":  true,
	"image/png":  true,
	"image/gif":  true,
}

// ImageHandler provides enhanced image processing functionality
type ImageHandler struct{}

// ValidateImageType checks if the provided MIME type is supported
func (ih *ImageHandler) ValidateImageType(mimeType string) error {
	if !SupportedImageTypes[strings.ToLower(mimeType)] {
		return fmt.Errorf("unsupported image type: %s. Supported types are: JPEG, PNG, GIF", mimeType)
	}
	return nil
}

// ProcessBase64Image processes a base64 encoded image
func (ih *ImageHandler) ProcessBase64Image(base64Data, filename, mimeType string) ([]byte, error) {
	// Validate image type
	if err := ih.ValidateImageType(mimeType); err != nil {
		return nil, err
	}

	// Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
	if strings.Contains(base64Data, ",") {
		parts := strings.Split(base64Data, ",")
		if len(parts) > 1 {
			base64Data = parts[1]
		}
	}

	// Decode base64 data
	imageBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64 image data: %w", err)
	}

	// Validate image size (optional - limit to 10MB)
	const maxImageSize = 10 * 1024 * 1024 // 10MB
	if len(imageBytes) > maxImageSize {
		return nil, fmt.Errorf("image size too large: %d bytes (max: %d bytes)", len(imageBytes), maxImageSize)
	}

	log.Printf("Processed image: %s, type: %s, size: %d bytes", filename, mimeType, len(imageBytes))
	return imageBytes, nil
}

// UploadImage handles image upload with validation
func (ih *ImageHandler) UploadImage(filename, mimeType, base64Data string) (int, error) {
	// Process the image data
	imageBytes, err := ih.ProcessBase64Image(base64Data, filename, mimeType)
	if err != nil {
		return 0, err
	}

	// Upload to database
	imageID, err := db.Connection.UploadImage(filename, mimeType, imageBytes)
	if err != nil {
		return 0, fmt.Errorf("failed to upload image to database: %w", err)
	}

	log.Printf("Successfully uploaded image: ID=%d, filename=%s, type=%s", imageID, filename, mimeType)
	return imageID, nil
}

// GetImageURL returns the URL for accessing an uploaded image
func (ih *ImageHandler) GetImageURL(imageID int) string {
	return fmt.Sprintf("/file?id=%d", imageID)
}

// Global image handler instance
var Images = &ImageHandler{}
