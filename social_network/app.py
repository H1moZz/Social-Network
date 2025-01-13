from flask import Flask
from flask_cors import CORS
from social_network.config import Config
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()

def create_app():
    myapp = Flask(__name__)

    myapp.config.from_object(Config)

    migrate = Migrate(myapp, db)

    jwt = JWTManager(myapp)

    CORS(myapp, resources={r"/*": {"origins": "*"}}) 

    db.init_app(myapp)

    from .routes import posts_bp, comments_bp, users_bp, auth_bp

    myapp.register_blueprint(posts_bp, url_prefix="/api")
    myapp.register_blueprint(comments_bp, url_prefix="/api")
    myapp.register_blueprint(users_bp, url_prefix="/api/users")
    myapp.register_blueprint(auth_bp, url_prefix="/api/auth")

    return myapp
