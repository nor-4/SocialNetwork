# Social-Network Project

This project is a social network application built with **Go** for the backend API and **Next.js** for the frontend.

## Core Services

The application provides the following core services:

1.  **Registration/Login:** user authentication and account creation.
2.  **Profile:**
    *   **Personal Profile:** User-specific profile page with editable details.
    *   **Public Profile:** Viewable profile information for other users.
3.  **Groups:**
    *   Group creation and management.
    *   **Events:** Scheduling and announcements within groups.
4.  **Chat:**
    *   **Private Chat:** One-on-one messaging.
    *   **Group Chat:** Messaging within group contexts.
5.  **Posts:** User-generated content
6.  **Notifications:** Real-time notifications for various events (e.g., new messages, friend requests, comments).
7.  **Home Page:** A personalized feed displaying content from followed users and groups.

## Technologies

*   **Backend (API):** Go
*   **Frontend:** Next.js
*   **Database:** Sqlite3

## Running the Application

### Prerequisites

*   **Go:** Ensure you have Go installed
*   **Node.js and npm:** Required for the Next.js frontend

### Backend (Go API)

1.  **Clone the Repository:** `git clone https://learn.reboot01.com/git/ahelal/social-network`
2.  **Navigate to the Backend Directory:** `cd backend`
3.  **Run the API:**
       `go run main.go`
       This will start the Go API server, default port `8080`
4.  **Environment Variables:** The Go application will require environment variables for database connection details (host, port, username, password, database name), JWT secret, and any other configurations.  You can set these:
       **Directly:** Before running `go run main.go`, use `export VARIABLE_NAME=value` in your terminal.  This is suitable for development.
       - `PORT` sets the backend listening
       - `STATIC_DIR` sets the directory for static file serving (production only)

### Frontend (Next.js)

1.  **Navigate to the Frontend Directory:** `cd frontend`
2.  **Install Dependencies:**  `npm install` or `yarn install` or `bun i` (whatever you're using)
3.  **Run the Frontend:**
    *   `npm run dev` or `yarn dev` or `bun run dev`
    *   This will start the Next.js development server, usually on `http://localhost:3000`.
4.  **(TO BE ADDED!)** **API URL Configuration:** The Next.js frontend needs to know the URL of your Go API.  Configure this:
    *   **Environment Variables (Recommended):** Create a `.env.local` file in your `frontend` directory and set the API URL:  `NEXT_PUBLIC_API_URL=http://localhost:8080` (or the appropriate address and port of your Go API). Make sure the variable is prefixed with `NEXT_PUBLIC_`.
    *   **Hardcoded (Discouraged for production):** You might temporarily hardcode the API URL in your frontend code during development.

## Database Migrations

**Create Migration Files:**

Create files in a dedicated directory (e.g., `database-migrations`) to define your database schema changes.
Each migration file typically consists of two parts: an `up` migration (to apply the changes) and a `down` migration (to revert them).

1. **Create a new migration:** create `up` and `down` files (create user table)
   - `database-migrations/000001_create_user_table.up.sql`
   - `database-migrations/000001_create_user_table.down.sql`.

2. **Example `up.sql` (create user table):**
    ```sqlite
    CREATE TABLE IF NOT EXISTS user (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    archive    BOOLEAN DEFAULT FALSE NOT NULL,
    email      TEXT                  NOT NULL UNIQUE,
    password   TEXT                  NOT NULL,
    first_name TEXT                  NOT NULL,
    last_name  TEXT                  NOT NULL,
    metadata   JSON
    );
    ```

3. **Example `down.sql` (drop user table):**
    ```sqlite
    DROP TABLE user;
    ```

## Building for Production (With Docker)

To build and run with docker, you need to run the following commands (you might need root privileges)

1. **building:**` docker build -t social-network .`
2. **running:** `docker run -p 8080:8080 --rm -it social-network`

To quickly test production build:
`sudo docker build -t social-network . && sudo docker run -p 8080:8080 --rm -it social-network`

## List of Group Members

The following users are members of a group:

*   ahelal (Ahmed Helal)
*   fsadeq (Fatema Sadeq)
*   na (Nour A)
*   aselail (Ali Selail)
