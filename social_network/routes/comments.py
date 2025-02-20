from flask import Blueprint, request
from flask_restful import Api
from flask_cors import CORS
from social_network.routes.AuntResource import AuthenticatedResource
from social_network.app import db
from social_network.models import Comment

comments_bp = Blueprint("comments", __name__)
CORS(comments_bp, resources={r"/api/*": {"origins": "*"}})
comments_api = Api(comments_bp)

class CommentsListResource(AuthenticatedResource):
    def get(self, post_id):
            
        return [
            {"id": comment.id, "content": comment.content, "author_id": comment.author_id}
            for comment in comments
        ], 200

    def post(self, post_id):
        data = request.get_json()
        content = data.get("content")
        author_id = data.get("author_id")

        if not content or not author_id:
            return {"error": "Content and author are required"}, 400

        new_comment = Comment(content=content, author_id=author_id, post_id=post_id)
        db.session.add(new_comment)
        db.session.commit()

        return {"id": new_comment.id, "content": new_comment.content, "author_id": new_comment.author_id, "post_id": new_comment.post_id}, 201

class CommetResource(AuthenticatedResource):
    def delete(self, comment_id, post_id):
        comment = Comment.query.filter_by(id=comment_id, post_id=post_id).first()

        if not comment:
            return {"error": "Comment not found"}, 404

        db.session.delete(comment)
        db.session.commit()

        return {"message": "Comment deleted successfully"}, 200

comments_api.add_resource(CommentsListResource, "/post/<int:post_id>/comments")
comments_api.add_resource(CommetResource, "/post/<int:post_id>/comments/<int:comment_id>")
