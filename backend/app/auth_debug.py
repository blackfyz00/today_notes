from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# password = "hello" "test@example.com"
password = "hello"
hashed = pwd_context.hash(password)

print(f"Password: {password}")
print(f"Hash: {hashed}")