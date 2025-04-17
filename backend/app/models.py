from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
import uuid

db = SQLAlchemy()

class Conversation(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 消息存储为JSON字符串
    messages_json = db.Column(db.Text, nullable=False)
    
    @property
    def messages(self):
        return json.loads(self.messages_json)
    
    @messages.setter
    def messages(self, messages):
        self.messages_json = json.dumps(messages)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'messages': self.messages
        }
    
    @staticmethod
    def create_conversation(messages, title=None):
        # 创建新对话，生成UUID作为ID
        if not title and messages:
            # 使用第一条用户消息作为标题
            user_message = next((msg['content'][:30] for msg in messages if msg['role'] == 'user'), None)
            title = f"{user_message}..." if user_message else "新对话"
        
        conv = Conversation(
            id=str(uuid.uuid4()),
            title=title or "新对话",
            messages=messages
        )
        return conv