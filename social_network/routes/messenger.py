from flask import Blueprint, jsonify, request
from flask_restful import Api, reqparse
from flask_cors import CORS
from social_network.app import db
from social_network.models import Chat, Message, User
from social_network.routes.AuntResource import AuthenticatedResource
from social_network.routes.web_socket import socketio

messenger_bp = Blueprint('messenger', __name__)
CORS(messenger_bp, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
messenger_api = Api(messenger_bp)

# Парсер для создания чата
chat_parser = reqparse.RequestParser()
chat_parser.add_argument('participant_id', type=int, required=True)

# Парсер для создания сообщения
message_parser = reqparse.RequestParser()
message_parser.add_argument('content', type=str, required=True)

# Парсер для редактирования сообщения
message_edit_parser = reqparse.RequestParser()
message_edit_parser.add_argument('content', type=str, required=True)

class ChatListResource(AuthenticatedResource): 
    def get(self):
        current_user_id = request.user_id 
        user = User.query.get(current_user_id)
        if not user:
            return {'error': 'Пользователь не найден'}, 404

        chats = user.chats
        chat_list = []
        
        for chat in chats:
            # Получаем собеседника
            participant = next((p for p in chat.participants if p.id != current_user_id), None)
            
            # Получаем последнее сообщение
            last_message = Message.query.filter_by(chat_id=chat.id)\
                .order_by(Message.timestamp.desc())\
                .first()
            
            # Получаем количество непрочитанных сообщений
            unread_count = Message.query.filter_by(
                chat_id=chat.id,
                is_read=False
            ).filter(Message.sender_id != current_user_id).count()

            print('---------------------------------')
            
            chat_info = {
                'id': chat.id,
                'participant': {
                    'id': participant.id,
                    'username': participant.username,
                    'avatar': participant.avatar
                },
                'last_message': {
                    'content': last_message.content if last_message else None,
                    'timestamp': last_message.timestamp.isoformat() if last_message else None,
                    'is_read': last_message.is_read if last_message else None,
                    'sender_id': last_message.sender_id if last_message else None
                } if last_message else None,
                'unread_count': unread_count
            }
            chat_list.append(chat_info)

            print("СЮДА СМТОРИ", chat_info['unread_count'])
            
        # Сортируем чаты по времени последнего сообщения
        chat_list.sort(
            key=lambda x: x['last_message']['timestamp'] if x['last_message'] else '0', 
            reverse=True
        )
        
        return jsonify(chat_list)

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
        print(chat.id)

        return {'id': chat.id}, 201

class MessageListResource(AuthenticatedResource):
    def get(self, chat_id):
        current_user_id = request.user_id
        chat = Chat.query.get_or_404(chat_id)

        if current_user_id not in [user.id for user in chat.participants]:
            return {'error': 'Вы не в этом чате'}, 403

        # Получаем непрочитанные сообщения перед обновлением
        unread_messages = Message.query.filter_by(chat_id=chat_id) \
            .filter(Message.sender_id != current_user_id) \
            .filter_by(is_read=False) \
            .all()

        # Отмечаем все сообщения в чате как прочитанные для текущего пользователя
        Message.query.filter_by(chat_id=chat_id) \
            .filter(Message.sender_id != current_user_id) \
            .filter_by(is_read=False) \
            .update({Message.is_read: True})
        db.session.commit()

        # Отправляем уведомления об обновлении статуса для каждого прочитанного сообщения
        for message in unread_messages:
            socketio.emit('message_status_updated', {
                'message_id': message.id,
                'chat_id': chat_id,
                'is_read': True
            }, room=str(chat_id))

        before = request.args.get('before', type=int)

        if before:
            messages = Message.query.filter_by(chat_id=chat_id) \
                .filter(Message.id < before) \
                .order_by(Message.timestamp.desc()) \
                .limit(30) \
                .all()
        else:
            messages = Message.query.filter_by(chat_id=chat_id) \
                .order_by(Message.timestamp.desc()) \
                .limit(30) \
                .all()

        return jsonify({
            'messages': [{
                'message_id': msg.id,
                'content': msg.content,
                'sender_id': msg.sender_id,
                'timestamp': msg.timestamp.isoformat(),
                'is_read': msg.is_read
            } for msg in reversed(messages)],
            'meta': {
                'has_more': len(messages) == 30
            }
        })

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

        message_data = {
            'message_id': message.id,
            'content': message.content,
            'sender_id': current_user_id,
            'chat_id': chat_id,
            'timestamp': message.timestamp.isoformat(),
            'is_read': False
        }
        
        print(f"Sending new_message_sended to room {chat_id}")
        socketio.emit('new_message_sended', message_data, room=str(chat_id))
        
        print("ДАЛЕЕ")
        for participant in chat.participants:
            print(participant.id + "-------")
            if participant.id != current_user_id:
                print(f"Sending chat_updated to user_{participant.id}")
                socketio.emit('chat_updated', message_data, room=f'user_{participant.id}')

        return {'message_id': message.id}, 201

class MessageResource(AuthenticatedResource):
    def put(self, chat_id, message_id):
        current_user_id = request.user_id
        message = Message.query.get_or_404(message_id)
        
        # Проверяем, что сообщение принадлежит текущему пользователю
        if message.sender_id != current_user_id:
            return {'error': 'Вы не можете редактировать чужие сообщения'}, 403
            
        # Проверяем, что сообщение принадлежит указанному чату
        if message.chat_id != chat_id:
            return {'error': 'Сообщение не найдено в этом чате'}, 404
            
        args = message_edit_parser.parse_args()
        message.content = args['content']
        message.edited = True  # Добавим флаг, что сообщение было отредактировано
        
        db.session.commit()
        print("message.chat_id", message.chat_id)
        
        # Отправляем уведомление через WebSocket
        socketio.emit('message_edited', {
            'message_id': message.id,
            'chat_id': message.chat_id,
            'content': message.content,
            'edited': True
        }, room=str(chat_id))

        # Проверяем, является ли это сообщение последним в чате
        last_message = Message.query.filter_by(chat_id=chat_id)\
            .order_by(Message.timestamp.desc())\
            .first()
            
        if last_message and last_message.id == message_id:
            socketio.emit('chat_updated', {
                'message_id': message.id,
                'content': message.content,
                'sender_id': message.sender_id,
                'chat_id': chat_id,
                'timestamp': message.timestamp.isoformat(),
                'is_read': message.is_read
            }, room=str(chat_id))
        
        return {
            'message_id': message.id,
            'content': message.content,
            'edited': True
        }

messenger_api.add_resource(ChatListResource, '/chats')
messenger_api.add_resource(MessageListResource, '/chats/<int:chat_id>/messages')
messenger_api.add_resource(MessageResource, '/chats/<int:chat_id>/messages/<int:message_id>')
