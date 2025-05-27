from flask import Flask
from flask_cors import CORS
from social_network.config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

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
             "supports_credentials": True
         }}
    )

    db.init_app(myapp)

    return myapp
