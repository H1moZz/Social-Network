from flask_socketio import SocketIO, emit, join_room
from flask import request, jsonify
from social_network.models import Message, Session, User
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

@socketio.on('join_chat')
def handle_join(data):
    if not auntificate_websocket():
        print("Присоединение к чату отклонено: ошибка аутентификации")
        return False
    chat_id=data["chat_id"]
    print(f"Пользователь  в руме {chat_id}")
    join_room(str(chat_id))

@socketio.on('send_message')
def handle_message(data):
    sender = User.query.get(data["user_id"])
    new_message = Message(
        content=data['content'],
        sender_id=data["user_id"],
        chat_id=data['chat_id'],
        timestamp=datetime.today()
    )
    
    db.session.add(new_message)
    db.session.commit()

    print(f"📩 Отправка нового сообщения в чат {data['chat_id']}")
    print(f"📩 Отправка нового сообщения в чат от {sender.username}")
    
    emit('new_message_sended', {
        'id': new_message.id,
        'content': new_message.content,
        'sender_id': new_message.sender_id,
        'sender_name':sender.username,
        'timestamp': new_message.timestamp.isoformat()}, room=str(data['chat_id'])), 200