-- Migration to drop the user table
DROP INDEX IF EXISTS created_at;
DROP INDEX IF EXISTS email;
DROP TABLE IF EXISTS user;