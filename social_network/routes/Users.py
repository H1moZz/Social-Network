from flask import Blueprint, request, current_app, url_for
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_restful import Api, Resource, reqparse
from flask_cors import CORS
from social_network.app import db
from werkzeug.utils import secure_filename
import os
from social_network.models import User

users_bp = Blueprint("users", __name__)
CORS(users_bp)
users_api = Api(users_bp)
UPLOAD_FOLDER = '\pf_photos'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

class UserListResource(Resource):
    def get(self):
        users = User.query.filter((User.is_deleted == False) | (User.is_deleted == None)).all()
        return [{"id": user.id, "username": user.username, "email": user.email} for user in users], 200

class UserResource(Resource):
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
    
class UserMeResource(Resource):
    @jwt_required()
    def get(self):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or user.is_deleted:
            return {"error": "Пользователь не найден"}, 404
        
        avatar_url = None
        if user.avatar:
            avatar_filename = user.avatar 
            avatar_url = url_for('static', filename=f'pf_photos/{avatar_filename}', _external=True)

        return {"id": user.id, "username": user.username, "email": user.email, "avatar_url": avatar_url}
    
class UserUploadAvatatar(Resource):
    @jwt_required()
    def post(self):
        current_user_id = get_jwt_identity()
        if 'avatar' not in request.files:
            return {"error": "Файл не найден"}, 400
        
        file = request.files['avatar']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            user = User.query.get(current_user_id)
            user.avatar = filename
            db.session.commit()

            return {"message": "Аватар загружен успешно", "avatar_url": filepath}, 200
        return {"error": "Неподдерживаемый формат файла"}, 400

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.',1)[1].lower() in ALLOWED_EXTENSIONS

users_api.add_resource(UserListResource, "")
users_api.add_resource(UserResource, "/<int:id>")
users_api.add_resource(UserMeResource, "/me")
users_api.add_resource(UserUploadAvatatar, "/avatar")
