from social_network.app import db
from social_network.models import  Post
from flask import jsonify, request, Blueprint
from flask_restful import Api, Resource

posts_bp = Blueprint('posts', __name__)
posts_api = Api(posts_bp)

class PostCreate(Resource):
    def post(self):
        data = request.get_json()
        if not data or not data.get("title") or not data.get("content") or not data.get("author_id"):
            return jsonify({"error": "Missing data"}), 400
    
        new_post = Post(
        title=data["title"],
        content=data["content"],
        author_id=data["author_id"])

        db.session.add(new_post)
        db.session.commit()
        return jsonify({"message": "Post created", "post": {"id": new_post.id, "title": new_post.title}}), 201
    
class PostEdit(Resource):
    def put(self,id):
        post = Post.query.get(id)
        if not post:
            return jsonify({"error": "Post not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing data"}), 400

        post.title = data.get("title", post.title)
        post.content = data.get("content", post.content)
        db.session.commit()
        return jsonify({"message": "Post updated", "post": {"id": post.id, "title": post.title, "content": post.content}})
    
    def delete(self,id):
        post = Post.query.get(id)
        if not post:
            return jsonify({"error": "Post not found"}), 404

        db.session.delete(post)
        db.session.commit()
        return jsonify({"message": "Post deleted"})
    
posts_api.add_resource(PostCreate,"/post")
posts_api.add_resource(PostEdit,"/post/<int:id>")