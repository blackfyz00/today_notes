-- init_psql.sql
-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица заметок
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    in_day DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица вложений (файлов)
CREATE TYPE attachment_type AS ENUM ('image', 'audio');

CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    type attachment_type NOT NULL,
    minio_path TEXT NOT NULL,          -- путь в MinIO, например: "user123/note456/photo.jpg"
    size BIGINT NOT NULL,              -- размер в байтах
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

