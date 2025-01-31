from flask import request, Blueprint
from flask_restful import Resource, Api
from social_network.models import Session
from datetime import datetime
from flask_cors import CORS

authres_bp = Blueprint("auth", __name__)
CORS(authres_bp, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
authres_api = Api(authres_bp)

class AuthenticatedResource(Resource):
    def dispatch_request(self, *args, **kwargs):
        session_token = request.cookies.get('session_token')
        session = Session.query.filter_by(session_token=session_token).first()
        if not session or session.expires_at < datetime.today():
            return {'error': 'Ну что за'}, 401

        request.user_id = session.user_id

        return super().dispatch_request(*args, **kwargs)

authres_api.add_resource(AuthenticatedResource, '/auntres')