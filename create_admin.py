import sys
import os
import bcrypt

# Добавляем корневую директорию проекта в sys.path
# Это может потребоваться, если вы запускаете скрипт не из корневой директории
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '', '', 'social_network')) # Исправлен путь
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    # Импортируем функцию create_app и базу данных из app.py
    from social_network.app import create_app, db # Изменено: импортируем create_app
    # Импортируем модель User
    from social_network.models import User
except ImportError as e:
    print(f"Ошибка импорта модулей: {e}")
    print("Убедитесь, что вы находитесь в виртуальном окружении проекта и запускаете скрипт из корневой директории или настроили sys.path правильно.")
    sys.exit(1)

def create_admin_user(username, email, password, profession=None):
    """
    Создает нового пользователя с правами администратора в базе данных.
    """
    # Создаем экземпляр приложения
    app = create_app()
    
    # Хешируем пароль
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    try:
        # Используем контекст приложения для работы с базой данных
        with app.app_context():
            # Проверяем, существует ли пользователь с таким email
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                print(f"Ошибка: Пользователь с email '{email}' уже существует!")
                return None

            try:
                # Создаем нового пользователя
                new_admin = User(
                    username=username,
                    email=email,
                    password=hashed_password.decode('utf-8'), # Сохраняем хеш как строку
                    profession=profession,
                    is_admin=True # Устанавливаем флаг администратора
                )

                # Добавляем пользователя в сессию и сохраняем в БД
                db.session.add(new_admin)
                db.session.commit()

                print(f"Пользователь '{username}' с правами администратора успешно создан!")
                return new_admin

            except Exception as e:
                db.session.rollback() # Откатываем изменения в случае ошибки
                print(f"Произошла ошибка при создании пользователя: {e}")
                return None
    finally:
        # Закрываем соединение с базой данных
        db.session.close()

if __name__ == "__main__":
    # Пример использования:
    # Замените данные на те, которые вы хотите использовать для нового админа
    admin_username = "admin_user"
    admin_email = "admin@example.com"
    admin_password = "securepassword123"
    admin_profession = "System Administrator" # Необязательно

    print(f"Попытка создать пользователя: {admin_username} <{admin_email}> с правами администратора...")

    created_user = create_admin_user(admin_username, admin_email, admin_password, admin_profession)

    if created_user:
        print("Скрипт завершен.")
    else:
         print("Создание пользователя не удалось.")




