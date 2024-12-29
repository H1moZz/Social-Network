from flask import Flask
from social_network.config import Config
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    myapp = Flask(__name__)

    myapp.config.from_object(Config)

    db.init_app(myapp)

    from .routes import posts_bp, comments_bp, users_bp

    myapp.register_blueprint(posts_bp, url_prefix="/api")
    myapp.register_blueprint(comments_bp, url_prefix="/api")
    myapp.register_blueprint(users_bp, url_prefix="/api")

    return myapp
