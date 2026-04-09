INSERT INTO users (email, password_hash)
VALUES (
    'test@example.com', 
    '$2b$12$1k6jV5cvzrBes7wB.VGtwOzgrYeK2Bra.UjBh6gRqN9Vw2w2Tw9dy'
)
ON CONFLICT (email) DO NOTHING;
