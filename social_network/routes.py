from .app import myapp, db
from .models import User, Post
from flask import jsonify, request
from flask_restful import Api, Resource, reqparse

api = Api(myapp)

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

api.add_resource(UserListResource, "/users")
api.add_resource(UserResource, "/users/<int:id>")