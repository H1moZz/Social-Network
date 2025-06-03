import pytest
import json
from social_network.app import create_app, db
from social_network.models import User, Chat, Message
from social_network.config import TestConfig
from werkzeug.datastructures import FileStorage
import io
import os

app = create_app(TestConfig)

@pytest.fixture
def client():
    app.config.from_object(TestConfig)
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        with app.app_context():
            db.drop_all()

# Фикстура для регистрации и логина обычного пользователя
@pytest.fixture
def auth_client(client):
    reg_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "secret"
    }
    client.post("/api/auth/registration", json=reg_data)
    login_data = {
        "email": "test@example.com",
        "password": "secret"
    }
    client.post("/api/auth/login", json=login_data)
    return client

# Фикстура для регистрации и логина второго обычного пользователя
@pytest.fixture
def auth_client2(client):
    reg_data = {
        "username": "testuser2",
        "email": "test2@example.com",
        "password": "secret"
    }
    client.post("/api/auth/registration", json=reg_data)
    login_data = {
        "email": "test2@example.com",
        "password": "secret"
    }
    client.post("/api/auth/login", json=login_data)
    return client

# Тест: Создание чата между двумя пользователями
def test_create_chat(auth_client, auth_client2):
    with app.app_context():
        user2 = User.query.filter_by(email="test2@example.com").first()
        assert user2 is not None
        
    response = auth_client.post("/api/messenger/chats", json={
        "participant_id": user2.id
    })
    assert response.status_code == 201
    chat_data = response.get_json()
    assert "id" in chat_data
    assert "participant" in chat_data
    assert chat_data["participant"]["username"] == "testuser2"

# Тест: Отправка текстового сообщения
def test_send_message(auth_client, auth_client2):
    with app.app_context():
        user1 = User.query.filter_by(email="test@example.com").first()
        user2 = User.query.filter_by(email="test2@example.com").first()
        chat = Chat.get_or_create_personal_chat(user1.id, user2.id)
        db.session.commit()

    response = auth_client.post(f"/api/messenger/chats/{chat.id}/messages", json={
        "content": "Hello, world!"
    })
    assert response.status_code == 201
    message_data = response.get_json()
    assert "message_id" in message_data
    
    with app.app_context():
        message = Message.query.get(message_data["message_id"])
        assert message is not None
        assert message.content == "Hello, world!"
        assert message.chat_id == chat.id
        assert message.sender_id == user1.id

# Тест: Получение списка сообщений в чате
def test_get_messages(auth_client, auth_client2):
    with app.app_context():
        user1 = User.query.filter_by(email="test@example.com").first()
        user2 = User.query.filter_by(email="test2@example.com").first()
        chat = Chat.get_or_create_personal_chat(user1.id, user2.id)
        db.session.commit()
        
        # Отправляем несколько сообщений
        msg1 = Message(content="Message 1", sender_id=user1.id, chat_id=chat.id)
        msg2 = Message(content="Message 2", sender_id=user2.id, chat_id=chat.id)
        db.session.add_all([msg1, msg2])
        db.session.commit()

    response = auth_client.get(f"/api/messenger/chats/{chat.id}/messages")
    assert response.status_code == 200
    json_data = response.get_json()
    assert "messages" in json_data
    assert len(json_data["messages"]) == 2
    assert json_data["messages"][0]["content"] == "Message 1"
    assert json_data["messages"][1]["content"] == "Message 2"

# Тест: Отправка сообщения с файлом (изображение)
def test_send_file_message_image(auth_client, auth_client2, client):
    with app.app_context():
        user1 = User.query.filter_by(email="test@example.com").first()
        user2 = User.query.filter_by(email="test2@example.com").first()
        chat = Chat.get_or_create_personal_chat(user1.id, user2.id)
        db.session.commit()

    # Создаем фиктивный файл
    image_data = io.BytesIO(b"fake image data")
    image_file = FileStorage(
        image_data,
        filename="test_image.jpg",
        content_type="image/jpeg"
    )

    # Отправляем сообщение с файлом
    # Используем multipart/form-data
    response = auth_client.post(f"/api/messenger/chats/{chat.id}/messages",
                                data={'media': image_file},
                                content_type='multipart/form-data')

    assert response.status_code == 201
    message_data = response.get_json()
    assert "message_id" in message_data

    with app.app_context():
        message = Message.query.get(message_data["message_id"])
        assert message is not None
        assert message.chat_id == chat.id
        assert message.sender_id == user1.id
        assert message.media_path is not None
        assert message.media_type == "image"
        assert message.file_name == "test_image.jpg"

    # Удаляем фиктивный файл после теста, если он был сохранен
    if message and message.media_path:
        filepath = os.path.join(app.static_folder, message.media_path.lstrip('/static/'))
        if os.path.exists(filepath):
            os.remove(filepath)

# Тест: Редактирование сообщения
def test_edit_message(auth_client, auth_client2):
    with app.app_context():
        user1 = User.query.filter_by(email="test@example.com").first()
        user2 = User.query.filter_by(email="test2@example.com").first()
        chat = Chat.get_or_create_personal_chat(user1.id, user2.id)
        db.session.commit()
        
        # Отправляем сообщение
        msg = Message(content="Original content", sender_id=user1.id, chat_id=chat.id)
        db.session.add(msg)
        db.session.commit()
        
    response = auth_client.put(f"/api/messenger/chats/{chat.id}/messages/{msg.id}", json={
        "content": "Edited content"
    })
    assert response.status_code == 200
    json_data = response.get_json()
    assert "message_id" in json_data
    assert json_data["content"] == "Edited content"
    assert json_data["edited"] is True
    
    with app.app_context():
        edited_msg = Message.query.get(msg.id)
        assert edited_msg.content == "Edited content"
        assert edited_msg.edited is True

# Тест: Удаление сообщения
def test_delete_message(auth_client, auth_client2):
    with app.app_context():
        user1 = User.query.filter_by(email="test@example.com").first()
        user2 = User.query.filter_by(email="test2@example.com").first()
        chat = Chat.get_or_create_personal_chat(user1.id, user2.id)
        db.session.commit()
        
        # Отправляем сообщение
        msg = Message(content="Message to delete", sender_id=user1.id, chat_id=chat.id)
        db.session.add(msg)
        db.session.commit()
        msg_id = msg.id

    response = auth_client.delete(f"/api/messenger/chats/{chat.id}/messages/{msg_id}")
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data.get("message") == "Сообщение успешно удалено"
    
    with app.app_context():
        deleted_msg = Message.query.get(msg_id)
        assert deleted_msg is None

# Тест: Поиск пользователей
def test_user_search(auth_client, auth_client2):
    # user1 уже зарегистрирован через auth_client фикстуру
    # user2 уже зарегистрирован через auth_client2 фикстуру
    with app.app_context():
        user1 = User.query.filter_by(email="test@example.com").first()
        user2 = User.query.filter_by(email="test2@example.com").first()
        # Добавим профессию для поиска
        user2.profession = "Engineer"
        db.session.commit()

    # Поиск по username
    response = auth_client.get(f"/api/messenger/users/search?query={user2.username}")
    assert response.status_code == 200
    json_data = response.get_json()
    assert "users" in json_data
    # Должен найти user2, но не user1 (текущего пользователя)
    assert len(json_data["users"]) == 1
    assert json_data["users"][0]["username"] == user2.username
    assert json_data["users"][0]["profession"] == user2.profession

    # Поиск по профессии
    response = auth_client.get("/api/messenger/users/search?query=Engineer")
    assert response.status_code == 200
    json_data = response.get_json()
    assert "users" in json_data
    assert len(json_data["users"]) == 1
    assert json_data["users"][0]["username"] == user2.username

    # Поиск несуществующего пользователя
    response = auth_client.get("/api/messenger/users/search?query=nonexistent")
    assert response.status_code == 200
    json_data = response.get_json()
    assert "users" in json_data
    assert len(json_data["users"]) == 0

# Тест: Получение списка чатов
def test_get_chat_list(auth_client, auth_client2):
    with app.app_context():
        user1 = User.query.filter_by(email="test@example.com").first()
        user2 = User.query.filter_by(email="test2@example.com").first()
        # Создаем чат
        chat = Chat.get_or_create_personal_chat(user1.id, user2.id)
        db.session.commit()
        
        # Отправляем сообщение, чтобы чат появился в списке
        msg = Message(content="Hello", sender_id=user2.id, chat_id=chat.id)
        db.session.add(msg)
        db.session.commit()

    # Получаем список чатов для user1 (auth_client)
    response = auth_client.get("/api/messenger/chats")
    assert response.status_code == 200
    json_data = response.get_json()
    assert isinstance(json_data, list)
    assert len(json_data) == 1
    chat_info = json_data[0]
    assert chat_info["id"] == chat.id
    assert chat_info["participant"]["username"] == user2.username
    assert chat_info["last_message"]["content"] == "Hello"
    assert chat_info["unread_count"] == 1 # user1 не читал сообщение от user2
    
    # Получаем список чатов для user2 (auth_client2)
    response2 = auth_client2.get("/api/messenger/chats")
    assert response2.status_code == 200
    json_data2 = response2.get_json()
    assert isinstance(json_data2, list)
    assert len(json_data2) == 1
    chat_info2 = json_data2[0]
    assert chat_info2["id"] == chat.id
    assert chat_info2["participant"]["username"] == user1.username
    assert chat_info2["last_message"]["content"] == "Hello"
    assert chat_info2["unread_count"] == 0 # user2 отправил сообщение, оно для него прочитано 