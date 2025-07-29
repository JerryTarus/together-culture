-- Migration: Add conversations table and update messages table for two-way messaging

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_pair (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)),
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Alter messages table to add conversation_id and read status
ALTER TABLE messages
    ADD COLUMN conversation_id INT AFTER id,
    ADD COLUMN read_status BOOLEAN DEFAULT FALSE AFTER sent_at;

-- 3. Migrate existing messages (if any) to conversations
-- (Optional: Only if you have existing data to migrate. Otherwise, skip this step.)
-- For each unique sender/receiver pair, create a conversation and update messages with conversation_id.

-- 4. Add foreign key constraint
ALTER TABLE messages
    ADD CONSTRAINT fk_conversation_id FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
