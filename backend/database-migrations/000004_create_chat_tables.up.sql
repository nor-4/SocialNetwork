CREATE TABLE IF NOT EXISTS conversation (
    id INTEGER PRIMARY KEY,
    -- 'direct' for 1-on-1 chats, 'group' for chats with 3+ participants.
    type TEXT NOT NULL CHECK(type IN ('direct', 'group')),
    
    -- The public name of a group chat. Can be NULL for direct message.
    name TEXT, 
    
    -- Timestamp of creation and last activity.
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    last_message_at TEXT DEFAULT (datetime('now', 'utc')) -- Updated by a trigger
);

CREATE TABLE conversation_participant (
    user INTEGER NOT NULL,
    conversation INTEGER NOT NULL,
    
    -- The composite primary key prevents a user from being added to the same conversation twice.
    PRIMARY KEY (user, conversation),
    
    FOREIGN KEY (user) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation) REFERENCES conversation(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message (
    id INTEGER PRIMARY KEY,
    conversation INTEGER NOT NULL,
    sender INTEGER, -- Can be NULL for system message or if user is deleted
    
    content TEXT, -- The main message content
    message_type TEXT NOT NULL DEFAULT 'text' CHECK(message_type IN ('text', 'image', 'file', 'system')),
    
    sent_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent', 'delivered', 'read')),
    
    FOREIGN KEY (conversation) REFERENCES conversation(id) ON DELETE CASCADE,
    FOREIGN KEY (sender) REFERENCES user(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_participant_user ON conversation_participant(user);
CREATE INDEX IF NOT EXISTS idx_participant_conversation ON conversation_participant(conversation);
CREATE INDEX IF NOT EXISTS idx_message_conversation_sent_at ON message(conversation, sent_at);
CREATE INDEX IF NOT EXISTS idx_conversation_last_message_at ON conversation(last_message_at);

CREATE TRIGGER update_conversation_timestamp_on_new_message
AFTER INSERT ON message
BEGIN
    UPDATE conversation
    SET last_message_at = NEW.sent_at
    WHERE id = NEW.conversation;
END;