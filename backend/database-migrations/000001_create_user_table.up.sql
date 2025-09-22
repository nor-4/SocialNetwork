CREATE TABLE IF NOT EXISTS user
(
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    public          BOOLEAN DEFAULT TRUE  NOT NULL,
    email           TEXT                  NOT NULL UNIQUE,
    password        TEXT                  NOT NULL,
    first_name      TEXT                  NOT NULL,
    last_name       TEXT                  NOT NULL,
    dob             DATE                  NOT NULL,
    gender          INTEGER DEFAULT 0, -- 0=male, 1=female (or however you want)
    nickname        TEXT DEFAULT '',
    about           TEXT DEFAULT '',
    profile_picture TEXT DEFAULT '',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
