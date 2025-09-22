CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_groups_creator_id ON groups(creator_id);
CREATE INDEX idx_groups_created_at ON groups(created_at);