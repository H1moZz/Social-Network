from flask import Blueprint, jsonify, request
from flask_restful import Api, reqparse
from flask_cors import CORS
from social_network.app import db
from social_network.models import Chat, Message, User
from social_network.routes.AuntResource import AuthenticatedResource

messenger_bp = Blueprint('messenger', __name__)
CORS(messenger_bp, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
messenger_api = Api(messenger_bp)

# Парсер для создания чата
chat_parser = reqparse.RequestParser()
chat_parser.add_argument('participant_id', type=int, required=True)

# Парсер для создания сообщения
message_parser = reqparse.RequestParser()
message_parser.add_argument('content', type=str, required=True)

class ChatListResource(AuthenticatedResource): 
    def get(self):
        current_user_id = request.user_id 
        user = User.query.get(current_user_id)
        if not user:
            return {'error': 'Пользователь не найден'}, 404

        chats = user.chats  
        return jsonify([{
            'id': chat.id,
            'participants': next(participant.username for participant in chat.participants if participant.id != current_user_id)
        } for chat in chats])

    def post(self):
        current_user_id = request.user_id
        args = chat_parser.parse_args()
        participant_id = args['participant_id']

        participant = User.query.get(participant_id)
        if not participant:
            return {'error': 'Такого пользователя не существует'}, 404
        
        chat = Chat.get_or_create_personal_chat(current_user_id, participant.id)
        db.session.add(chat)
        db.session.commit()

        return {'id': chat.id}, 201

class MessageListResource(AuthenticatedResource):
    def get(self, chat_id):
        current_user_id = request.user_id
        chat = Chat.query.get_or_404(chat_id)

        # Проверка, что текущий пользователь является участником чата
        if current_user_id not in [user.id for user in chat.participants]:
            return {'error': 'Вы не в этом чате'}, 403

        # Получаем параметр before (если он есть)
        before = request.args.get('before', type=int)

        # Если параметр before не передан, загружаем последние 30 сообщений
        if before:
            messages = Message.query.filter_by(chat_id=chat_id) \
                .filter(Message.id < before) \
                .order_by(Message.timestamp.desc()) \
                .limit(30) \
                .all()
        else:
            # Без параметра before, загружаем последние 30 сообщений
            messages = Message.query.filter_by(chat_id=chat_id) \
                .order_by(Message.timestamp.desc()) \
                .limit(30) \
                .all()

        # Преобразуем список сообщений в формат JSON
        return jsonify([{
            'id': msg.id,
            'content': msg.content,
            'sender_id': msg.sender_id,
            'timestamp': msg.timestamp.isoformat(),
            'is_read': msg.is_read
        } for msg in reversed(messages)])  # Переворачиваем, чтобы последние были снизу


    def post(self, chat_id):
        current_user_id = request.user_id
        chat = Chat.query.get_or_404(chat_id)

        if current_user_id not in [user.id for user in chat.participants]:
            return {'error': 'Вы не в этом чате'}, 403

        args = message_parser.parse_args()
        message = Message(
            content=args['content'],
            sender_id=current_user_id,
            chat_id=chat_id
        )
        db.session.add(message)
        db.session.commit()
        return {'id': message.id}, 201

messenger_api.add_resource(ChatListResource, '/chats')
messenger_api.add_resource(MessageListResource, '/chats/<int:chat_id>/messages')
