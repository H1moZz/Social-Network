from flask import Blueprint, jsonify, request, current_app, url_for
from flask_restful import Api, reqparse
from flask_cors import CORS
from werkzeug.utils import secure_filename
from social_network.app import db
from social_network.models import User
from social_network.routes.AuntResource import AuthenticatedResource
import os

users_bp = Blueprint("users", __name__)
CORS(users_bp, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
users_api = Api(users_bp)

UPLOAD_FOLDER = 'pf_photos'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

class UserListResource(AuthenticatedResource):
    def get(self):
        users = User.query.filter(((User.is_deleted == False) | (User.is_deleted == None )) & (User.id != request.user_id)).all()
        return [{"id": user.id, "username": user.username, "email": user.email, "avatar": user.avatar} for user in users], 200

class UserResource(AuthenticatedResource):
    def get(self, id):
        user = User.query.get(id)
        if not user or user.is_deleted:
            return {"error": "User not found"}, 404
        return {"id": user.id, "username": user.username, "email": user.email}

    def put(self, id):
        parser = reqparse.RequestParser()
        parser.add_argument("username", type=str, required=False)
        parser.add_argument("email", type=str, required=False)
        parser.add_argument("password", type=str, required=False)
        args = parser.parse_args()

        user = User.query.get(id)
        if not user:
            return {"error": "User not found"}, 404

        if args['username']:
            user.username = args['username']
        if args['email']:
            user.email = args['email']
        if args['password']:
            user.password = args['password']

        db.session.commit()

        return {"id": user.id, "username": user.username, "email": user.email}, 200

    def delete(self, id):
        user = User.query.get(id)
        if not user:
            return {"error": "User not found"}, 404

        if user.is_deleted:
            return {"message": "This user is already deleted!"}, 400

        user.is_deleted = True
        db.session.commit()

        return {"message": "User successfully deleted!"}

    def patch(self, id):
        user = User.query.get(id)
        if not user:
            return {"error": "User not found"}, 404

        if not user.is_deleted:
            return {"message": "User is already active!"}, 400

        user.is_deleted = False
        db.session.commit()

        return {"message": "User successfully restored!", "id": user.id}
    
class UserMeResource(AuthenticatedResource):
    def get(self):
        current_user_id = request.user_id
        user = User.query.get(current_user_id)
        if not user or user.is_deleted:
            return {"error": "Пользователь не найден"}, 404
        
        avatar_url = None
        if user.avatar:
            avatar_filename = user.avatar 
            avatar_url = url_for('static', filename=f'pf_photos/{avatar_filename}', _external=True)

        return {"id": user.id, "username": user.username, "email": user.email, "avatar_url": avatar_url}
    
class UserUploadAvatar(AuthenticatedResource):  
    def post(self):
        current_user_id = request.user_id
        if 'avatar' not in request.files:
            return {"error": "Файл не найден"}, 400
        
        file = request.files['avatar']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(current_app.static_folder, UPLOAD_FOLDER, filename)
            file.save(filepath)
            
            user = User.query.get(current_user_id)
            user.avatar = filename
            db.session.commit()

            return {"message": "Аватар загружен успешно", "avatar_url": url_for('static', filename=f'pf_photos/{filename}', _external=True)}, 200
        return {"error": "Неподдерживаемый формат файла"}, 400

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

users_api.add_resource(UserListResource, "")
users_api.add_resource(UserResource, "/<int:id>")
users_api.add_resource(UserMeResource, "/me")
users_api.add_resource(UserUploadAvatar, "/avatar")
