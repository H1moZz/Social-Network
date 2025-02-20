import pytest
import json
from social_network.app import create_app, db  # импортируй приложение и базу данных
from social_network.models import User
from social_network.config import TestConfig

app = create_app(TestConfig)

@pytest.fixture
def client():

    app.config.from_object(TestConfig)  # Используем тестовый конфиг!

    with app.test_client() as client:
        with app.app_context():
            db.create_all()  # создаём таблицы
        yield client
        with app.app_context():
            db.drop_all()  # очищаем базу после теста

def test_registration_success(client):
    # Тестируем регистрацию нового пользователя
    data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "secret"
    }
    response = client.post("/api/auth/registration", json=data)
    assert response.status_code == 201
    json_data = response.get_json()
    assert json_data.get("message") == "User registered successfully"
    
    # Проверяем, что пользователь добавлен в БД
    with app.app_context():
        user = User.query.filter_by(email="test@example.com").first()
        assert user is not None
        assert user.username == "testuser"

def test_registration_duplicate_email(client):
    # Сначала регистрируем пользователя
    data = {
        "username": "user1",
        "email": "duplicate@example.com",
        "password": "secret"
    }
    client.post("/api/auth/registration", json=data)
    
    # Повторная регистрация с тем же email должна вернуть ошибку
    response = client.post("/api/auth/registration", json=data)
    assert response.status_code == 400
    json_data = response.get_json()
    assert "error" in json_data
    assert json_data["error"] == "User with this email already exists!"

def test_login_success(client):
    # Сначала регистрируем пользователя
    reg_data = {
        "username": "testuser",
        "email": "login@example.com",
        "password": "secret"
    }
    client.post("/api/auth/registration", json=reg_data)
    
    # Теперь тестируем вход
    login_data = {
        "email": "login@example.com",
        "password": "secret"
    }
    response = client.post("api/auth/login", json=login_data)
    # Вход, если успешный, может вернуть пустой ответ, но установить cookie
    assert response.status_code == 200 or response.status_code == 201
    # Проверяем, что в куках присутствует session_token
    cookies = response.headers.getlist('Set-Cookie')
    assert any("session_token=" in cookie for cookie in cookies)

def test_login_invalid_credentials(client):
    # Тестируем вход с неверными данными
    login_data = {
        "email": "nonexistent@example.com",
        "password": "wrong"
    }
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 401
    json_data = response.get_json()
    assert "error" in json_data
    assert json_data["error"] == "Неверная почта или пароль!"

def test_logout(client):
    # Регистрируем пользователя и логинимся
    reg_data = {
        "username": "testuser",
        "email": "logout@example.com",
        "password": "secret"
    }
    client.post("/api/auth/registration", json=reg_data)
    
    login_data = {
        "email": "logout@example.com",
        "password": "secret"
    }
    login_response = client.post("/api/auth/login", json=login_data)
    # Извлекаем cookie session_token
    cookies = login_response.headers.getlist('Set-Cookie')
    session_cookie = None
    for cookie in cookies:
        if "session_token=" in cookie:
            session_cookie = cookie
            break
    assert session_cookie is not None
    
    # При logout надо передать cookie session_token
    # test_client сохраняет куки автоматически, если используется один и тот же клиент
    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    json_data = logout_response.get_json()
    assert json_data.get("message") == "Logged out successfully"

def test_check_session_without_login(client):
    # Проверяем check_session, когда пользователь не залогинен
    response = client.get("/api/auth/check_session")
    assert response.status_code == 401
    json_data = response.get_json()
    assert json_data.get("is_authenticated") is False
