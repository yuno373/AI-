import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MODEL_NAME: str = "gemini-2.0-flash"
    ADMIN_PASSWORD: str = "1031"
    DATABASE_URL: str = "sqlite:///./study_autonomous.db"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]

    # ============================================
    # APIキーをここに追加してください
    # 複数のキーを登録すると自動で切り替わります
    # ============================================
    API_KEYS: list = [
        {"name": "Test", "key": "AIzaSyTest"},
        {"name": "Key2", "key": "AIzaSyTest2"},
    ]

    # 現在使用中のキーインデックス
    CURRENT_KEY_INDEX: int = 0

    # 各キーの1日あたりの上限（デフォルト1500回）
    DAILY_LIMIT: int = 1500

    class Config:
        env_file = ".env"

settings = Settings()
