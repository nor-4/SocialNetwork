CREATE TABLE IF NOT EXISTS post_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_permissions_post_id ON post_permissions(post_id);
CREATE INDEX idx_post_permissions_user_id ON post_permissions(user_id);