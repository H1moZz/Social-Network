import os
from flask_jwt_extended import JWTManager
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config():
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'socialnetwork.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = BASE_DIR + '/static/pf_photos'
    BASE_URL = 'http://192.168.3.88:3001'
    TESTING = False

class TestConfig(Config):
    SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR,'test_socialnetwork.db')}"
    TESTING = True