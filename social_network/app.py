from flask import Flask
from flask_cors import CORS
from social_network.config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
from datetime import datetime
import bcrypt

db = SQLAlchemy()

def create_app(config_object=Config):
    myapp = Flask(__name__)

    myapp.config.from_object(config_object)

    Migrate(myapp, db)

    from .routes import users_bp, auth_bp, messenger_bp

    myapp.register_blueprint(users_bp, url_prefix="/api/users")
    myapp.register_blueprint(auth_bp, url_prefix="/api/auth")
    myapp.register_blueprint(messenger_bp, url_prefix='/api/messenger')

    CORS(myapp, 
         resources={r"/api/*": {
             "origins": ["http://localhost:3000", "https://social-network-tgar.vercel.app"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "expose_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True,
             "credentials": True
         }}
    )

    db.init_app(myapp)

    with myapp.app_context():
        db.create_all()
        
        # Проверяем существование администратора через запрос к БД
        from social_network.models import User
        admin = User.query.filter_by(username='Admin', email='admin@admin.com').first()
        
        if not admin:
            # Создаем администратора только если его нет в базе
            hashed_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt())
            admin = User(
                username='Admin',
                email='admin@admin.com',
                password=hashed_password.decode('utf-8'),
                is_admin=True,
                profession='Администратор'
            )
            db.session.add(admin)
            db.session.commit()
            print('Администратор успешно создан!')

    return myapp
