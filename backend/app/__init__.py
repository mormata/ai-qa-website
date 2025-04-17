from flask import Flask
from flask_cors import CORS
from config import Config
from app.models import db

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # 初始化扩展
    db.init_app(app)
    CORS(app)
    
    # 导入并注册蓝图
    from app.routes import main
    app.register_blueprint(main)
    
    # 创建数据库表
    with app.app_context():
        db.create_all()
    
    return app