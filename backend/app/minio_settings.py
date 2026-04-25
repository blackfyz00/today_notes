# minio_settings.py
import uuid
from aiobotocore.session import get_session
from contextlib import asynccontextmanager

MINIO_SETTINGS = {
    "endpoint_url": "http://minio-notes:9000",  # Имя сервиса из docker-compose
    "public_url": "http://localhost:9000",      # URL, который поймет БРАУЗЕР (вне докера)
    "aws_access_key_id": "admin12345",
    "aws_secret_access_key": "admin12345",
    "bucket_name": "notes-images",
    "region_name": "us-east-1",
}

@asynccontextmanager
async def get_s3_client():
    session = get_session()
    async with session.create_client(
        's3',
        endpoint_url=MINIO_SETTINGS["endpoint_url"],
        aws_access_key_id=MINIO_SETTINGS["aws_access_key_id"],
        aws_secret_access_key=MINIO_SETTINGS["aws_secret_access_key"],
        region_name=MINIO_SETTINGS["region_name"]
    ) as client:
        yield client