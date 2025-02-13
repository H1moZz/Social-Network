from flask import Blueprint, request, make_response
from flask_restful import Api, Resource, reqparse
from flask_cors import CORS
from social_network.app import db
from social_network.models import User, Session
import secrets
import bcrypt
from datetime import datetime
from social_network.routes.AuntResource import AuthenticatedResource

auth_bp = Blueprint("auth", __name__)
CORS(auth_bp, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
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
            return {"error": "Неверная почта или пароль!"}, 401

        current_user_id = user.id
        session_token = 0
        existing_session = Session.query.filter(
        Session.user_id == current_user_id,
        Session.expires_at > datetime.today()
        ).first()

        if existing_session:
            session_token = existing_session.session_token
        else:
            session_token = secrets.token_hex(32)
            new_session = Session(user_id=current_user_id, session_token=session_token)
            db.session.add(new_session)
            db.session.commit()
        
        response = make_response()
        response.set_cookie(
            'session_token', 
            value=session_token, 
            httponly=True, 
            samesite='Lax', 
            secure=False,
        )
        return response
    
class  CheckSessionResource(AuthenticatedResource):
    def get(self):
        user = User.query.get(request.user_id)
        if not user:
            return {'is_authenticated': False}, 200

        return {
            'is_authenticated': True,
        }, 200

class LogOut(Resource):
    def post(self):
        session_token = request.cookies.get('session_token')
        if not session_token:
            return {'message': 'No active session'}, 200

        response = make_response({'message': 'Logged out successfully'}, 200)
        response.set_cookie('session_token', value='', expires=0, path='/')
        return response

auth_api.add_resource(Registration, "/registration")
auth_api.add_resource(LogIn, "/login")
auth_api.add_resource(LogOut, '/logout')
auth_api.add_resource(CheckSessionResource, '/check_session')
