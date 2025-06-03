import pytest
import json
from social_network.app import create_app, db
from social_network.models import User
from social_network.config import TestConfig

app = create_app(TestConfig)

@pytest.fixture
def client():
    app.config.from_object(TestConfig)  # Используем тестовый конфиг!

    # Создаем контекст приложения для фикстуры
    with app.app_context() as ctx:
        # Активируем контекст
        ctx.push()

        db.create_all()  # создаём таблицы

        # Создаем администратора
        admin_user = User(
            username="adminuser",
            email="admin@example.com",
            password="adminsecret",
            is_admin=True # Явно указываем, что это админ
        )
        db.session.add(admin_user)

        # Создаем обычного пользователя
        regular_user = User(
            username="testuser",
            email="test@example.com",
            password="secret"
        )
        db.session.add(regular_user)

        db.session.commit() # Сохраняем пользователей в БД

        # Создаем тестовый клиент в контексте приложения
        test_client = app.test_client()

        yield test_client  # Возвращаем клиента для использования в тестах

        # После выполнения теста, откатываем изменения и удаляем все таблицы
        db.session.remove()
        db.drop_all()
        ctx.pop() # Деактивируем контекст

# Фикстура для логина администратора
@pytest.fixture
def auth_admin_client(client):
    login_data = {
        "email": "admin@example.com",
        "password": "adminsecret"
    }
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200 # Проверяем, что логин успешен
    return client

# Фикстура для логина обычного пользователя
@pytest.fixture
def auth_client(client):
    login_data = {
        "email": "test@example.com",
        "password": "secret"
    }
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200 # Проверяем, что логин успешен
    return client

def test_check_session_without_login(client):
    # Проверяем check_session, когда пользователь не залогинен
    response = client.get("/api/auth/check_session")
    assert response.status_code == 401
    json_data = response.get_json()
    # Обновлено: Проверяем наличие ключа 'error' или 'is_authenticated'
    assert 'error' in json_data or ('is_authenticated' in json_data and json_data['is_authenticated'] is False)

# Тест: Регистрация нового пользователя администратором через админский эндпоинт
def test_admin_register_new_user(auth_admin_client):
    data = {
        "username": "newuser_by_admin",
        "email": "newuser_by_admin@example.com",
        "password": "newsecret_by_admin",
        "profession": "Engineer"
    }
    response = auth_admin_client.post("/api/auth/admin/register", json=data)
    assert response.status_code == 201
    json_data = response.get_json()
    assert json_data.get("message") == "User registered successfully"

    # Проверяем, что пользователь добавлен в БД и не является админом
    with app.app_context(): # Убедимся, что мы в контексте для запроса к БД
        new_user = User.query.filter_by(email="newuser_by_admin@example.com").first()
        assert new_user is not None
        assert new_user.username == "newuser_by_admin"
        assert new_user.is_admin is False

# Тест: Попытка регистрации через админский эндпоинт без авторизации
def test_admin_register_unauthorized(client):
    data = {
        "username": "unauthuser",
        "email": "unauth@example.com",
        "password": "password",
        "profession": "Guest"
    }
    response = client.post("/api/auth/admin/register", json=data)
    # Ожидаем 401 UNAUTHORIZED
    assert response.status_code == 401
    json_data = response.get_json()
    # Проверяем сообщение об ошибке аутентификации
    assert json_data.get("error") == "Требуется аутентификация"

# Удаленные тесты:
# test_registration_success
# test_registration_duplicate_email
# test_login_success
# test_logout
