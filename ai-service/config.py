from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://admin:admin123@localhost:5433/restaurant_os"
    app_port: int = 5000
    cors_origins: str = "http://localhost:3000,http://localhost:4000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
