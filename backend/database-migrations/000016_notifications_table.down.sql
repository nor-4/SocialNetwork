-- Revert notifications table to its old structure
BEGIN TRANSACTION;

DROP TABLE IF EXISTS notifications_temp;

-- Old structure (no sender_id, related_id as TEXT, fewer types)
CREATE TABLE notifications_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'follow_request',
        'group_invitation',
        'group_request',
        'event_created'
    )),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    related_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Copy compatible data back (dropping sender_id, converting related_id)
INSERT INTO notifications_temp (id, user_id, type, message, is_read, related_id, created_at)
SELECT id, user_id, type, message, is_read, CAST(related_id AS TEXT), created_at
FROM notifications
WHERE type IN ('follow_request', 'group_invitation', 'group_request', 'event_created');

-- Replace old table
DROP TABLE notifications;
ALTER TABLE notifications_temp RENAME TO notifications;

-- Recreate indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

COMMIT;
