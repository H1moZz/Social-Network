from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request, jsonify
from social_network.models import Message, Session, User, Chat
from social_network.app import db
from datetime import datetime
from flask_cors import CORS

socketio = SocketIO(cors_allowed_origins="*",  resources={r"/api/*": {"origins": "*"}})

def auntificate_websocket():
    session_token = request.cookies.get('session_token')
    if not session_token:
        print("Ошибка аутентификации: отсутствует session_token")
        return False

    session = Session.query.filter_by(session_token=session_token).first()
    if not session or session.expires_at < datetime.today():
        print("Ошибка аутентификации: недействительная или истекшая сессия")
        return False

    request.user_id = session.user_id
    print("АЙДИ ПОЛЬЗОВАТЕЛЯ: ",session.user_id)
    emit('user_connected', {'user_id': request.user_id}, room=request.sid)
    return True

@socketio.on('connect')
def handle_connect():
    if not auntificate_websocket():
        print("Соединение отклонено: ошибка аутентификации")
        return False
    print(f"User {request.user_id} connected to chat")
    
    user = User.query.get(request.user_id)
    if user:
        user.is_online = True
        user.last_seen = datetime.today()
        db.session.commit()
        

        emit('user_status_changed', {
            'user_id': user.id,
            'is_online': True
        }, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    # Получаем user_id из сессии
    session_token = request.cookies.get('session_token')
    if not session_token:
        return
    
    session = Session.query.filter_by(session_token=session_token).first()
    if not session:
        return
    
    user = User.query.get(session.user_id)
    if user:
        user.is_online = False
        user.last_seen = datetime.today()
        db.session.commit()
        
        # Уведомляем всех пользователей об изменении статуса
        emit('user_status_changed', {
            'user_id': user.id,
            'is_online': False
        }, broadcast=True)

@socketio.on('join_chat')
def handle_join(data):
    if not auntificate_websocket():
        print("Присоединение к чату отклонено: ошибка аутентификации")
        return False
    chat_id = data["chat_id"]
    print(f"User {request.user_id} joining chat room {chat_id}")
    join_room(str(chat_id))
    print(f"User {request.user_id} successfully joined chat room {chat_id}")

@socketio.on('send_message')
def handle_message(data):
    sender = User.query.get(data["user_id"])
    new_message = Message(
        content=data['content'],
        sender_id=data["user_id"],
        chat_id=data['chat_id'],
        timestamp=datetime.today(),
        is_read=False
    )
    
    db.session.add(new_message)
    db.session.commit()

    print(f"📩 Отправка нового сообщения в чат {data['chat_id']}")
    print(f"📩 Отправка нового сообщения в чат от {sender.username}")
    
    message_data = {
        'message_id': new_message.id,
        'content': new_message.content,
        'sender_id': sender.id,
        'sender_name': sender.username,
        'chat_id': new_message.chat_id,
        'timestamp': new_message.timestamp.isoformat(),
        'is_read': new_message.is_read
    }

    emit('new_message_sended', message_data, room=str(data['chat_id']))

    chat = Chat.query.get(data['chat_id'])
    
    for participant in chat.participants:
        if participant.id != sender.id:
            # Исправляем подсчет непрочитанных сообщений
            # Теперь считаем только сообщения, отправленные другими пользователями
            unread_count = Message.query.filter_by(
                chat_id=chat.id,
                is_read=False,
                sender_id=sender.id  # Добавляем фильтр по отправителю
            ).count()
            
            print(f"Непрочитанных сообщений для пользователя {participant.id}: {unread_count}")
            
            chat_update_data = {
                'message_id': new_message.id,
                'content': new_message.content,
                'sender_id': sender.id,
                'chat_id': chat.id,
                'timestamp': new_message.timestamp.isoformat(),
                'is_read': new_message.is_read,
                'unread_count': unread_count
            }
            socketio.emit('chat_updated', chat_update_data, room=f'user_{participant.id}')

@socketio.on('message_read')
def handle_message_read(data):
    message_id = data['message_id']
    reader_id = data['user_id']
    chat_id = data['chat_id']
    
    print(f"📩 СОБЩЕНИЕ ЧИТАЕМ {data['chat_id']}")
    message = Message.query.get(int(message_id))
    if message and message.sender_id != reader_id:
        print("хуня")
        message.is_read = True
        db.session.commit()
        
        emit('message_status_updated', {
            'message_id': message_id,
            "chat_id": message.chat_id,
            'is_read': True
        }, room=str(chat_id))

@socketio.on('join_user_room')
def on_join_user_room(data):
    user_id = data.get('user_id')
    if user_id:
        print(f"User {user_id} joining personal room user_{user_id}")
        join_room(f'user_{user_id}')
        print(f"User {user_id} successfully joined personal room")

@socketio.on('leave_user_room')
def on_leave_user_room(data):
    user_id = data.get('user_id')
    if user_id:
        leave_room(f'user_{user_id}')

@socketio.on('leave_chat')
def handle_leave_chat(data):
    chat_id = data.get('chat_id')
    if chat_id:
        leave_room(str(chat_id))