from flask import Blueprint, request, make_response, jsonify
from flask_restful import Api, Resource, reqparse
from flask_cors import CORS
from social_network.app import db
from social_network.models import User, Session
import secrets
import bcrypt
from datetime import datetime
from social_network.routes.AuntResource import AuthenticatedResource
from social_network.routes.messenger import allowed_file
from werkzeug.utils import secure_filename
import os
from flask import current_app

auth_bp = Blueprint("auth", __name__)
CORS(auth_bp, 
     supports_credentials=True, 
     resources={r"/api/*": {
         "origins": ["http://localhost:3000", "https://social-network-tgar.vercel.app"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "expose_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True,
         "credentials": True
     }}
)
auth_api = Api(auth_bp)

class Registration(AuthenticatedResource):
    def post(self):
        current_user = User.query.get(request.user_id)
        if not current_user or not current_user.is_admin:
            return {"error": "Только администраторы могут регистрировать новых пользователей"}, 403

        # Получаем данные из request.form для текстовых полей
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")
        profession = request.form.get("profession")
        
        # Проверяем обязательные поля вручную, так как reqparse больше не используется для них
        if not username or not email or not password:
             return {"error": "Username, email, and password are required"}, 400

        file = request.files.get('avatar')

        if User.query.filter_by(email=email).first():
            return {"error": "Пользователь с такой почтой уже существует!"}, 400

        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        avatar_path = None
        if file and allowed_file(file.filename):
            folder = os.path.join(current_app.static_folder, 'pf_photos')
            os.makedirs(folder, exist_ok=True)
            
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
            filename = f"{timestamp}_{filename}"

            filepath = os.path.join(folder, filename)
            file.save(filepath)
            avatar_path = f"/static/pf_photos/{filename}"

        new_user = User(
            username=username,
            email=email,
            password=hashed_password.decode("utf-8"),
            profession=profession,
            avatar=avatar_path
        )
        db.session.add(new_user)
        db.session.commit()

        return {"message": "Пользователь зарегистрирован успешно", "user_id": new_user.id}, 201

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
        
        response = make_response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'profession': user.profession,
                'avatar': user.avatar,
                'is_admin': user.is_admin
            }
        })
        response.set_cookie(
            'session_token', 
            value=session_token, 
            httponly=True, 
            samesite='None',
            secure=True,
            max_age=30*24*60*60,  # 30 дней
            path='/',
            domain=None
        )
        return response
    
class  CheckSessionResource(AuthenticatedResource):
    def get(self):
        user = User.query.get(request.user_id)
        if not user:
            return {'is_authenticated': False}, 401

        return {
            'is_authenticated': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'profession': user.profession,
                'avatar': user.avatar,
                'is_admin': user.is_admin
            }
        }, 200

class LogOut(Resource):
    def post(self):
        session_token = request.cookies.get('session_token')
        if not session_token:
            return {'message': 'No active session'}, 200

        response = make_response({'message': 'Logged out successfully'}, 200)
        response.set_cookie(
            'session_token', 
            value='', 
            expires=0, 
            path='/',
            httponly=True,
            secure=True,
            samesite='Lax'
        )
        return response

auth_api.add_resource(Registration, "/registration")
auth_api.add_resource(LogIn, "/login")
auth_api.add_resource(LogOut, '/logout')
auth_api.add_resource(CheckSessionResource, '/check_session')
