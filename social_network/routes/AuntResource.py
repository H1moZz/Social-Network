from flask import request
from flask_restful import Resource
from social_network.models import Session
from datetime import datetime

class AuthenticatedResource(Resource):
    def dispatch_request(self, *args, **kwargs):
        session_token = request.cookies.get('session_token')
        print("Токен: ")
        print(request.cookies.get('session_token'))
        session = Session.query.filter_by(session_token=session_token).first()
        if not session or session.expires_at < datetime.today():
            return {'error': 'Ну что за'}, 401

        request.user_id = session.user_id

        return super().dispatch_request(*args, **kwargs)
