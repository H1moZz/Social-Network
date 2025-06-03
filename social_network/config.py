import os
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config():
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'socialnetwork.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = BASE_DIR + '/static/pf_photos'
    BASE_URL = os.getenv('REACT_APP_API_BASE_URL', 'http://localhost:10000')
    TESTING = False

class TestConfig(Config):
    SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR,'test_socialnetwork.db')}"
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR,'test_socialnetwork.db')}"
    TESTING = True