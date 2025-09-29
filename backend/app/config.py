import os
from typing import List

class Settings:
    # JWT 配置
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # 数据库配置
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/db.sqlite")
    
    # 服务器配置
    HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    RELOAD: bool = os.getenv("BACKEND_RELOAD", "false").lower() == "true"
    
    # CORS 配置
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "*").split(",")
    CORS_CREDENTIALS: bool = os.getenv("CORS_CREDENTIALS", "true").lower() == "true"
    CORS_METHODS: List[str] = os.getenv("CORS_METHODS", "*").split(",")
    CORS_HEADERS: List[str] = os.getenv("CORS_HEADERS", "*").split(",")
    
    # 环境配置
    PYTHON_ENV: str = os.getenv("PYTHON_ENV", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # 日志配置
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "json")
    
    # 安全配置
    SECURE_HEADERS: bool = os.getenv("SECURE_HEADERS", "true").lower() == "true"
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
    
    # 股票爬虫配置
    STOCK_CRAWLER_BASE_URL: str = os.getenv("STOCK_CRAWLER_BASE_URL", "http://stock-crawler:8080")
    
    # 管理员账号配置
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "superadmin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "MySecurePassword2025!")

settings = Settings()