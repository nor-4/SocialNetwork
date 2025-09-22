-- Update notifications table to support like and comment notification types
BEGIN TRANSACTION;

DROP TABLE IF EXISTS notifications_temp;

CREATE TABLE notifications_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'follow_request',
        'group_invitation',
        'group_request',
        'event_created',
        'like',
        'comment'
    )),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    related_id INTEGER, -- changed from TEXT to INTEGER for better referencing
    sender_id INTEGER,  -- new field to track who triggered the notification
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Copy data from old table (sender_id will be NULL)
INSERT INTO notifications_temp (id, user_id, type, message, is_read, related_id, created_at)
SELECT id, CAST(user_id AS INTEGER), type, message, is_read, CAST(related_id AS INTEGER), created_at
FROM notifications;

-- Drop old table and rename new one
DROP TABLE notifications;
ALTER TABLE notifications_temp RENAME TO notifications;

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_sender_id ON notifications(sender_id);

COMMIT;
