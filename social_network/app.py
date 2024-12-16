from flask import Flask
from social_network.config import Config
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

myapp = Flask(__name__)

myapp.config.from_object(Config)

db = SQLAlchemy(myapp)

migrate = Migrate(myapp, db)

with myapp.app_context():
    from .models import *
    from social_network import routes
