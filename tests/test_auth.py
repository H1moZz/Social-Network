import pytest
import json
from social_network.app import create_app, db
from social_network.models import User, Session
import bcrypt
from datetime import datetime

@pytest.fixture(scope="session")
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
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

def test_registration_by_admin(client, admin_auth):
    # Проверяем, что администратор успешно залогинился
    assert admin_auth.status_code == 200
    
    # Регистрируем нового пользователя через администратора
    data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "secret",
        "profession": "Developer"
    }
    response = client.post("/api/auth/registration", data=data)
    assert response.status_code == 201
    json_data = response.get_json()
    assert json_data.get("message") == "Пользователь зарегистрирован успешно"
    
    # Проверяем, что пользователь добавлен в БД
    with app.app_context():
        user = User.query.filter_by(email="test@example.com").first()
        assert user is not None
        assert user.username == "testuser"
        assert user.profession == "Developer"

def test_registration_by_non_admin(client):
    # Сначала регистрируем обычного пользователя
    data = {
        "username": "regular_user",
        "email": "regular@example.com",
        "password": "secret"
    }
    response = client.post("/api/auth/registration", data=data)
    assert response.status_code == 403
    json_data = response.get_json()
    assert "error" in json_data
    assert json_data["error"] == "Только администраторы могут регистрировать новых пользователей"

def test_registration_duplicate_email(client, admin_auth):
    # Регистрируем первого пользователя
    data = {
        "username": "user1",
        "email": "duplicate@example.com",
        "password": "secret"
    }
    client.post("/api/auth/registration", data=data)
    
    # Пытаемся зарегистрировать второго пользователя с тем же email
    response = client.post("/api/auth/registration", data=data)
    assert response.status_code == 400
    json_data = response.get_json()
    assert "error" in json_data
    assert json_data["error"] == "Пользователь с такой почтой уже существует!"

def test_login_success(client, admin_auth):
    # Тестируем вход администратора
    login_data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    json_data = response.get_json()
    assert "user" in json_data
    assert json_data["user"]["email"] == "admin@example.com"
    assert json_data["user"]["is_admin"] is True
    
    # Проверяем наличие session_token в куках
    cookies = response.headers.getlist('Set-Cookie')
    assert any("session_token=" in cookie for cookie in cookies)

def test_login_invalid_credentials(client):
    login_data = {
        "email": "nonexistent@example.com",
        "password": "wrong"
    }
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 401
    json_data = response.get_json()
    assert "error" in json_data
    assert json_data["error"] == "Неверная почта или пароль!"

def test_check_session(client, admin_auth):
    # Проверяем сессию администратора
    response = client.get("/api/auth/check_session")
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["is_authenticated"] is True
    assert json_data["user"]["email"] == "admin@example.com"

def test_logout(client, admin_auth):
    # Выход из системы
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data.get("message") == "Logged out successfully"
    
    # Проверяем, что сессия действительно завершена
    check_response = client.get("/api/auth/check_session")
    assert check_response.status_code == 401
    json_data = check_response.get_json()
    assert json_data.get("is_authenticated") is False
