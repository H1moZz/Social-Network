from flask import Blueprint, request
from flask_restful import Api, Resource, reqparse
from flask_cors import CORS
from flask_jwt_extended import create_access_token
from social_network.app import db
from social_network.models import User
import bcrypt

auth_bp = Blueprint("auth", __name__)
CORS(auth_bp)
auth_api = Api(auth_bp)

class Registration(Resource):
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument("username", type=str, required=True, help="Username is required")
        parser.add_argument("email", type=str, required=True, help="Email is required")
        parser.add_argument("password", type=str, required=True, help="Password is required")
        args = parser.parse_args()

        if User.query.filter_by(email=args["email"]).first():
            return {"error": "User with this email already exists!"}, 400

        hashed_password = bcrypt.hashpw(args["password"].encode("utf-8"), bcrypt.gensalt())
        new_user = User(username=args["username"], email=args["email"], password=hashed_password.decode("utf-8"))
        db.session.add(new_user)
        db.session.commit()

        return {"message": "User registered successfully"}, 201

class LogIn(Resource):
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument("email", type=str, required=True, help="Email is required")
        parser.add_argument("password", type=str, required=True, help="Password is required")
        args = parser.parse_args()

        user = User.query.filter_by(email=args["email"]).first()
        if not user or not bcrypt.checkpw(args["password"].encode("utf-8"), user.password.encode('utf-8')):
            return {"error": "Invalid email or password!"}, 401

        access_token = create_access_token(identity=str(user.id))
        return {
            "access_token": access_token,
            "username": user.username
            }, 200

auth_api.add_resource(Registration, "/registration")
auth_api.add_resource(LogIn, "/login")
