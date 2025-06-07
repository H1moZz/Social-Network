import pytest
from social_network.app import create_app, db
from social_network.models import User, Chat, Message
from social_network.config import TestConfig
import bcrypt
from datetime import datetime
import os
from io import BytesIO
from social_network.routes.web_socket import socketio

@pytest.fixture(scope="session")
def app():
    app = create_app(TestConfig)
    socketio.init_app(app, async_mode='threading')
    return app

@pytest.fixture(scope="function")
def client(app):
    with app.app_context():
        db.create_all()
        # Создаем администратора
        admin_password = bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt())
        admin = User(
            username="admin",
            email="admin@example.com",
            password=admin_password.decode("utf-8"),
            is_admin=True
        )
        db.session.add(admin)
        db.session.commit()
        
        yield app.test_client()
        
        db.session.remove()
        db.drop_all()

@pytest.fixture
def admin_auth(client):
    # Логинимся как администратор
    response = client.post("/api/auth/login", json={
        "email": "admin@example.com",
        "password": "admin123"
    })
    return response

@pytest.fixture
def regular_user(client):
    """Фикстура для создания обычного пользователя"""
    with client.application.app_context():
        user = User(
            username="regular",
            email="regular@example.com",
            password=bcrypt.hashpw("regular123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
            is_admin=False
        )
        db.session.add(user)
        db.session.commit()
        # Обновляем объект из базы данных
        user = db.session.get(User, user.id)
        return user

@pytest.fixture
def chat(client, admin_auth, regular_user):
    """Фикстура для создания чата между админом и обычным пользователем"""
    with client.application.app_context():
        # Получаем актуальный объект пользователя
        user = db.session.get(User, regular_user.id)
        chat = Chat.get_or_create_personal_chat(1, user.id)  # 1 - это ID админа
        db.session.commit()
        # Обновляем объект чата из базы данных
        chat = db.session.get(Chat, chat.id)
        return chat

def test_create_chat(client, admin_auth, regular_user):
    """Тест создания нового чата"""
    with client.application.app_context():
        user = db.session.get(User, regular_user.id)
        response = client.post(
            "/api/messenger/chats",
            json={"participant_id": user.id}
        )
        assert response.status_code == 201
        data = response.get_json()
        assert "id" in data
        assert data["participant"]["username"] == user.username

def test_get_chat_list(client, admin_auth, chat):
    """Тест получения списка чатов"""
    with client.application.app_context():
        current_chat = db.session.get(Chat, chat.id)
        response = client.get("/api/messenger/chats")
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]["id"] == current_chat.id

def test_send_text_message(client, admin_auth, chat):
    """Тест отправки текстового сообщения"""
    with client.application.app_context():
        current_chat = db.session.get(Chat, chat.id)
        response = client.post(
            f"/api/messenger/chats/{current_chat.id}/messages",
            data={"content": "Привет, это тестовое сообщение!"}
        )
        assert response.status_code == 201
        data = response.get_json()
        assert "message_id" in data

def test_send_media_message(client, admin_auth, chat):
    """Тест отправки сообщения с медиафайлом"""
    with client.application.app_context():
        current_chat = db.session.get(Chat, chat.id)
        # Создаем тестовый файл
        test_file = (BytesIO(b"test file content"), "test.jpg")
        
        response = client.post(
            f"/api/messenger/chats/{current_chat.id}/messages",
            data={
                "content": "Сообщение с картинкой",
                "media": test_file
            },
            content_type="multipart/form-data"
        )
        assert response.status_code == 201
        data = response.get_json()
        assert "message_id" in data

def test_get_messages(client, admin_auth, chat):
    """Тест получения сообщений из чата"""
    with client.application.app_context():
        current_chat = db.session.get(Chat, chat.id)
        # Сначала отправляем тестовое сообщение
        client.post(
            f"/api/messenger/chats/{current_chat.id}/messages",
            data={"content": "Тестовое сообщение"}
        )
        
        # Получаем сообщения
        response = client.get(f"/api/messenger/chats/{current_chat.id}/messages")
        assert response.status_code == 200
        data = response.get_json()
        assert "messages" in data
        assert len(data["messages"]) > 0
        assert data["messages"][0]["content"] == "Тестовое сообщение"

def test_edit_message(client, admin_auth, chat):
    """Тест редактирования сообщения"""
    with client.application.app_context():
        current_chat = db.session.get(Chat, chat.id)
        # Сначала отправляем сообщение
        response = client.post(
            f"/api/messenger/chats/{current_chat.id}/messages",
            data={"content": "Исходное сообщение"}
        )
        message_id = response.get_json()["message_id"]
        
        # Редактируем сообщение
        response = client.put(
            f"/api/messenger/chats/{current_chat.id}/messages/{message_id}",
            json={"content": "Отредактированное сообщение"}
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["content"] == "Отредактированное сообщение"
        assert data["edited"] is True

def test_delete_message(client, admin_auth, chat):
    """Тест удаления сообщения"""
    with client.application.app_context():
        current_chat = db.session.get(Chat, chat.id)
        # Сначала отправляем сообщение
        response = client.post(
            f"/api/messenger/chats/{current_chat.id}/messages",
            data={"content": "Сообщение для удаления"}
        )
        message_id = response.get_json()["message_id"]
        
        # Удаляем сообщение
        response = client.delete(f"/api/messenger/chats/{current_chat.id}/messages/{message_id}")
        assert response.status_code == 200
        
        # Проверяем, что сообщение действительно удалено
        response = client.get(f"/api/messenger/chats/{current_chat.id}/messages")
        data = response.get_json()
        assert not any(msg["message_id"] == message_id for msg in data["messages"])

def test_search_users(client, admin_auth, regular_user):
    """Тест поиска пользователей"""
    with client.application.app_context():
        user = db.session.get(User, regular_user.id)
        response = client.get("/api/messenger/users/search?query=regular")
        assert response.status_code == 200
        data = response.get_json()
        assert "users" in data
        assert len(data["users"]) > 0
        assert any(u["username"] == user.username for u in data["users"])

def test_user_online_status(client, admin_auth, regular_user):
    """Тест получения статуса пользователей"""
    with client.application.app_context():
        user = db.session.get(User, regular_user.id)
        response = client.get("/api/messenger/users/online-status")
        assert response.status_code == 200
        data = response.get_json()
        assert "online_users" in data
        assert str(user.id) in data["online_users"]

def test_message_read_status(client, admin_auth, chat, regular_user):
    """Тест статуса прочтения сообщений"""
    with client.application.app_context():
        current_chat = db.session.get(Chat, chat.id)
        # Отправляем сообщение от админа
        response = client.post(
            f"/api/messenger/chats/{current_chat.id}/messages",
            data={"content": "Непрочитанное сообщение"}
        )
        message_id = response.get_json()["message_id"]
        
        # Логинимся как обычный пользователь
        client.post("/api/auth/login", json={
            "email": "regular@example.com",
            "password": "regular123"
        })
        
        # Получаем сообщения как обычный пользователь (это должно отметить их как прочитанные)
        response = client.get(f"/api/messenger/chats/{current_chat.id}/messages")
        assert response.status_code == 200
        data = response.get_json()
        assert any(msg["message_id"] == message_id and msg["is_read"] for msg in data["messages"]) 