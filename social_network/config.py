import os
from flask_jwt_extended import JWTManager
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config():
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'socialnetwork.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    UPLOAD_FOLDER = BASE_DIR + '/static/pf_photos'
    BASE_URL = os.getenv('REACT_APP_API_BASE_URL', 'http://localhost:3001')
    TESTING = False

class TestConfig(Config):
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR,'test_socialnetwork.db')}"
    TESTING = True