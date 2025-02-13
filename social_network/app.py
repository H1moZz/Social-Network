from flask import Flask
from flask_cors import CORS
from social_network.config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()

def create_app():
    myapp = Flask(__name__)

    myapp.config.from_object(Config)

    Migrate(myapp, db)

    from .routes import posts_bp, comments_bp, users_bp, auth_bp, messenger_bp

    myapp.register_blueprint(posts_bp, url_prefix="/api")
    myapp.register_blueprint(comments_bp, url_prefix="/api")
    myapp.register_blueprint(users_bp, url_prefix="/api/users")
    myapp.register_blueprint(auth_bp, url_prefix="/api/auth")
    myapp.register_blueprint(messenger_bp, url_prefix='/api/messenger')

    CORS(myapp, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True) 

    db.init_app(myapp)

    return myapp

