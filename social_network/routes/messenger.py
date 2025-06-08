from flask import Blueprint, jsonify, request, current_app
from flask_restful import Api, reqparse
from flask_cors import CORS
from social_network.app import db
from social_network.models import Chat, Message, User, chat_participants
from social_network.routes.AuntResource import AuthenticatedResource
from social_network.routes.web_socket import socketio
from datetime import datetime
import os
from werkzeug.utils import secure_filename

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

# Расширяем список разрешенных расширений
ALLOWED_EXTENSIONS = {
    # Изображения
    'png', 'jpg', 'jpeg', 'gif',
    # Видео
    'mp4', 'mov', 'avi',
    # Документы
    'pdf', 'doc', 'docx', 'xls', 'xlsx',
    # Текстовые файлы
    'txt', 'csv',
    # Архивы
    'zip', 'rar'
}

def allowed_file(filename):
    if not filename:
        return False
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_type(filename):
    if not filename or '.' not in filename:
        return 'document'
    
    ext = filename.rsplit('.', 1)[1].lower()
    if ext in {'png', 'jpg', 'jpeg', 'gif'}:
        return 'image'
    elif ext in {'mp4', 'mov', 'avi'}:
        return 'video'
    else:
        return 'document'

class ChatListResource(AuthenticatedResource): 
    def get(self):
        current_user_id = request.user_id 
        
        # Получаем все чаты пользователя через связь в модели Chat
        user = User.query.get(current_user_id)
        if not user:
            return {'error': 'Пользователь не найден'}, 404
            
        chat_list = []
        
        for chat in user.chats:
            # Получаем информацию о другом участнике чата через промежуточную таблицу
            participant = db.session.query(User).join(chat_participants).filter(
                chat_participants.c.chat_id == chat.id,
                User.id != current_user_id
            ).first()
            
            # Пропускаем чаты только если участник не найден
            if not participant:
                continue
                
            # Получаем последнее сообщение
            last_message = Message.query.filter_by(chat_id=chat.id).order_by(Message.timestamp.desc()).first()
            
            # Получаем количество непрочитанных сообщений
            unread_count = Message.query.filter_by(
                chat_id=chat.id,
                is_read=False
            ).filter(Message.sender_id != current_user_id).count()
            
            last_message_content = None
            if last_message:
                if last_message.media_type == 'image':
                    last_message_content = '📷 Изображение'
                elif last_message.media_type == 'video':
                    last_message_content = '🎥 Видео'
                elif last_message.media_type == 'document':
                    last_message_content = '📄 Документ'
                else:
                    last_message_content = last_message.content
            
            chat_info = {
                'id': chat.id,
                'participant': {
                    'id': participant.id,
                    'username': participant.username,
                    'avatar': participant.avatar,
                    'profession': participant.profession,
                    'is_deleted': participant.is_deleted
                },
                'last_message': {
                    'content': last_message_content,
                    'timestamp': last_message.timestamp.isoformat() if last_message else None,
                    'is_read': last_message.is_read if last_message else None,
                    'sender_id': last_message.sender_id if last_message else None,
                    'media_type': last_message.media_type if last_message else None
                } if last_message else None,
                'unread_count': unread_count
            }
            chat_list.append(chat_info)
            
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
        participant = next((p for p in chat.participants if p.id != current_user_id), None)

        return {'id': chat.id,
                'participant': {
                'avatar': participant.avatar,
                'username': participant.username,
                'profession': participant.profession}},201

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
                .order_by(Message.id.desc(), Message.id.desc()) \
                .limit(30) \
                .all()
        else:
            messages = Message.query.filter_by(chat_id=chat_id) \
                .order_by(Message.id.desc(), Message.id.desc()) \
                .limit(30) \
                .all()

        return jsonify({
            'messages': [{
                'message_id': msg.id,
                'content': msg.content,
                'media_path': msg.media_path,
                'media_type': msg.media_type,
                'file_name': msg.file_name,
                'file_size': msg.file_size,
                'sender_id': msg.sender_id,
                'timestamp': msg.timestamp.isoformat(),
                'is_read': msg.is_read,
                'edited': msg.edited
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

        content = request.form.get('content', '')
        file = request.files.get('media')

        media_path = None
        media_type = None
        file_name = None
        file_size = None

        if file and allowed_file(file.filename):
            # Сохраняем оригинальное имя файла
            file_name = file.filename
            file_size = os.fstat(file.fileno()).st_size

            # Проверяем размер файла (50MB)
            if file_size > 50 * 1024 * 1024:
                return {'error': 'Файл слишком большой. Максимальный размер: 50МБ'}, 400

            media_type = get_file_type(file.filename)

            folder = os.path.join(current_app.static_folder, 'media')
            os.makedirs(folder, exist_ok=True)

            # Получаем расширение файла
            file_ext = os.path.splitext(file.filename)[1]
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
            # Создаем безопасное имя для сохранения на диске
            filename = f"{current_user_id}_{timestamp}{file_ext}"
            filepath = os.path.join(folder, filename)

            file.save(filepath)

            media_path = f"/static/media/{filename}"

        if not content and not media_path:
            return {'error': 'Пустое сообщение'}, 400

        message = Message(
            content=content,
            sender_id=current_user_id,
            chat_id=chat_id,
            media_path=media_path,
            media_type=media_type,
            file_name=file_name,
            file_size=file_size
        )

        db.session.add(message)
        db.session.commit()

        message_data = {
            'message_id': message.id,
            'content': message.content,
            'sender_id': current_user_id,
            'chat_id': chat_id,
            'timestamp': message.timestamp.isoformat(),
            'is_read': False,
            'media_path': media_path,
            'media_type': media_type,
            'file_name': file_name,
            'file_size': file_size
        }

        socketio.emit('new_message_sended', message_data, room=str(chat_id))

        for participant in chat.participants:
            if participant.id != current_user_id:
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

    def delete(self, chat_id, message_id):
        current_user_id = request.user_id
        message = Message.query.get_or_404(message_id)
        
        # Проверяем, что сообщение принадлежит текущему пользователю
        if message.sender_id != current_user_id:
            return {'error': 'Вы не можете удалять чужие сообщения'}, 403
            
        # Проверяем, что сообщение принадлежит указанному чату
        if message.chat_id != chat_id:
            return {'error': 'Сообщение не найдено в этом чате'}, 404

        # Если есть медиа-файл, удаляем его
        if message.media_path:
            try:
                file_path = os.path.join(current_app.static_folder, message.media_path.lstrip('/static/'))
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Ошибка при удалении файла: {e}")
        
        # Удаляем сообщение из базы данных
        db.session.delete(message)
        db.session.commit()
        
        # Отправляем уведомление через WebSocket
        socketio.emit('message_deleted', {
            'message_id': message_id,
            'chat_id': chat_id
        }, room=str(chat_id))

        # Проверяем, является ли это сообщение последним в чате
        last_message = Message.query.filter_by(chat_id=chat_id)\
            .order_by(Message.timestamp.desc())\
            .first()
            
        if last_message:
            socketio.emit('chat_updated', {
                'message_id': last_message.id,
                'content': last_message.content,
                'sender_id': last_message.sender_id,
                'chat_id': chat_id,
                'timestamp': last_message.timestamp.isoformat(),
                'is_read': last_message.is_read
            }, room=str(chat_id))
        
        return {'message': 'Сообщение успешно удалено'}, 200

class UserSearchResource(AuthenticatedResource):
    def get(self):
        current_user_id = request.user_id
        query = request.args.get('query', '').strip()
        
        if not query:
            return {'users': []}, 200
            
        # Ищем пользователей по username, исключая текущего пользователя
        users = User.query.filter(
            User.id != current_user_id,
            db.or_(
                User.username.ilike(f'%{query}%'),
                User.profession.ilike(f'%{query}%')
            )
        ).limit(10).all()
        
        return jsonify({
            'users': [{
                'id': user.id,
                'username': user.username,
                'avatar': user.avatar,
                'profession': user.profession
            } for user in users]
        })

class UserStatusResource(AuthenticatedResource):
    def get(self):
        current_user_id = request.user_id
        
        # Получаем всех пользователей, кроме текущего
        users = User.query.filter(
            User.id != current_user_id,
            User.is_deleted == False
        ).all()
        
        # Формируем словарь статусов
        online_users = {
            user.id: {
                'is_online': user.is_online,
                'last_seen': user.last_seen.isoformat() if user.last_seen else None
            }
            for user in users
        }
        
        return jsonify({
            'online_users': online_users
        })

messenger_api.add_resource(ChatListResource, '/chats')
messenger_api.add_resource(MessageListResource, '/chats/<int:chat_id>/messages')
messenger_api.add_resource(MessageResource, '/chats/<int:chat_id>/messages/<int:message_id>')
messenger_api.add_resource(UserSearchResource, '/users/search')
messenger_api.add_resource(UserStatusResource, '/users/online-status')
