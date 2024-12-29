from social_network.app import db
from social_network.models import Comment
from flask import jsonify, request, Blueprint
from flask_restful import Api, Resource

comments_bp = Blueprint("comments",__name__)

comments_api = Api(comments_bp)

class CommentsListResource(Resource):
    def get(self, post_id):
        comments = Comment.query.filter_by(post_id=post_id).all()
    
        return jsonify([{"id": comment.id, "content": comment.content, "author_id": comment.author_id} for comment in comments])
    
    def post(self, post_id):
        try:
            data = request.get_json()
            content = data.get('content')
            author_id = data.get('author_id')

            if not content or not author_id:
                return jsonify({"error": "Content and author are required"}), 400

            new_comment = Comment(content=content, author_id=author_id, post_id=post_id)
            db.session.add(new_comment)
            db.session.commit()

            return jsonify({
                "id": new_comment.id,
                "content": new_comment.content,
                "author_id": new_comment.author_id,
                "post_id": new_comment.post_id
            }), 201

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

class CommetResource(Resource):
    def delete(self, comment_id, post_id):
        try:
            
            comment = Comment.query.filter_by(id=comment_id, post_id=post_id).first()

            if not comment:
                return jsonify({"error": "Comment not found"}), 404

            db.session.delete(comment)
            db.session.commit()

            return jsonify({"message": "Comment deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500


comments_api.add_resource(CommentsListResource,"/post/<int:Post_id>/comments")
comments_api.add_resource(CommetResource,"/post/<int:Post_id>/comments/<int:comment_id>")