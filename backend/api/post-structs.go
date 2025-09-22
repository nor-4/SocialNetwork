package api

import "time"

type CreatePostRequest struct {
	Content           string `json:"content"`
	ImageData         string `json:"imageData,omitempty"`
	ImageFilename     string `json:"imageFilename,omitempty"`
	ImageMimetype     string `json:"imageMimetype,omitempty"`
	Privacy           string `json:"privacy"`
	SelectedFollowers []int  `json:"selectedFollowers,omitempty"`
}

type CreateCommentRequest struct {
	PostID        int    `json:"postId"`
	Content       string `json:"content"`
	ImageData     string `json:"imageData,omitempty"`
	ImageFilename string `json:"imageFilename,omitempty"`
	ImageMimetype string `json:"imageMimetype,omitempty"`
}

type PostResponse struct {
	ID             int       `json:"id"`
	UserID         int       `json:"userId"`
	Author         string    `json:"author"`
	AuthorFullName string    `json:"authorFullName"`
	AuthorEmail    string    `json:"authorEmail"`
	ProfilePicture int       `json:"profilePicture"`
	Content        string    `json:"content"`
	ImageID        int       `json:"imageId,omitempty"`
	ImagePath      string    `json:"imagePath,omitempty"`
	Privacy        string    `json:"privacy"`
	CreatedAt      time.Time `json:"createdAt"`
	Liked          bool      `json:"liked"`
	Likes          int       `json:"likes"`
	Comments       int       `json:"comments"`
}

type CommentResponse struct {
	ID             int       `json:"id"`
	PostID         int       `json:"postId"`
	UserID         int       `json:"userId"`
	Author         string    `json:"author"`
	AuthorFullName string    `json:"authorFullName"`
	ProfilePicture int       `json:"profilePicture"`
	Content        string    `json:"content"`
	ImageID        int       `json:"imageId,omitempty"`
	ImagePath      string    `json:"imagePath,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

type PostsResponse struct {
	Posts []PostResponse `json:"posts"`
}

type CommentsResponse struct {
	Comments []CommentResponse `json:"comments"`
}
