from social_network.app import db
from social_network.models import User
from flask import jsonify, request, Blueprint
from flask_restful import Api, Resource, reqparse

users_bp = Blueprint("users",__name__)

users_api = Api(users_bp)

class UserListResource(Resource):
    def get(self):
        users = User.query.filter((User.is_deleted == False) | (User.is_deleted == None)).all()
        return jsonify([{"id": user.id, "username": user.username, "email": user.email} for user in users])
    
    def post(self):
        data = request.json
        if not data or not all(k in data for k in ("username","email","password")):
            return {"error": "Invalid data"}, 400
        new_user = User(username=data["username"],email=data["email"], password=data["password"])
        db.session.add(new_user)
        db.session.commit()
        return {"Message": "User created", "id": new_user.id}, 201


class UserResource(Resource):
    def get(self, id):
        user = User.query.get(id)
        if not user or user.is_deleted:
            return {"Error": "User not found!"}, 404
        return {"id": user.id, "username": user.username, "email": user.email}
    
    def put(self,id):
        parser = reqparse.RequestParser()
        parser.add_argument("username", type=str, required = False, help = "Username is optional")
        parser.add_argument('email', type=str, required=False, help="Email is optional")
        parser.add_argument('password', type=str, required=False, help="Password is optional")
        args = parser.parse_args()

        user = User.query.get(id)

        if not user:
            return {"Error": "User not found!"}, 404
        
        if args['username']:
            user.username = args['username']
        if args['email']:
            user.email = args['email']
        if args['password']:
            user.password = args['password']

        db.session.commit()

        return {"id": user.id, "username": user.username, "email": user.email}, 200 
    
    def delete(self,id):
        user = User.query.get(id)

        if not user:
            return {"Error": "User not found!"}, 404
        
        if user.is_deleted:
            return {"message": "This user is already deleted!"}, 400
        
        user.is_deleted = True
        db.session.commit()

        return {"message": "User is succsesfuly deleted!"}
    
    def patch(self, id):
        user = User.query.get(id)

        if not user:
            return {"Error": "User not found!"}, 404
        
        if not user.is_deleted:
            return {"message": "User is already active!"}, 400
        
        user.is_deleted = False
        db.session.commit()

        return {"message": "User successfully restored!", "id": user.id}

users_api.add_resource(UserListResource, "/users")
users_api.add_resource(UserResource, "/users/<int:id>")
