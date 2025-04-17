import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY') or "your_api_key_here"
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///conversations.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS设置
    CORS_HEADERS = 'Content-Type'
    
    # 对话设置
    MAX_CONVERSATIONS = 50  # 最大保存的对话数量
    MAX_MESSAGES_PER_CONVERSATION = 100  # 每个对话最大消息数
    
    # 其他配置
    DEBUG = True
    JSON_AS_ASCII = False