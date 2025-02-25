from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app import myapp, db
from config import Config
from models import User, Post, Comment

# with myapp.app_context():

#     engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)

#     # Создание пользователей
#     user1 = User(username="User1", email="user1@example.com", password="password1")
#     user2 = User(username="User2", email="user2@example.com", password="password2")

#     # Добавляем пользователей в сессию
#     db.session.add(user1)
#     db.session.add(user2)
#     db.session.commit()  # Сохраняем изменения

#     # Создание постов
#     post1 = Post(title="First Post", content="This is the first post content", author_id=user1.id)
#     post2 = Post(title="Second Post", content="This is the second post content", author_id=user2.id)

#     # Добавляем посты в сессию
#     db.session.add(post1)
#     db.session.add(post2)
#     db.session.commit()  # Сохраняем изменения

#     # Создание комментариев
#     comment1 = Comment(content="Great post!", author_id=user2.id, post_id=post1.id)
#     comment2 = Comment(content="Thank you!", author_id=user1.id, post_id=post1.id)
#     comment3 = Comment(content="Nice article!", author_id=user1.id, post_id=post2.id)

#     # Добавляем комментарии в сессию
#     db.session.add(comment1)
#     db.session.add(comment2)
#     db.session.add(comment3)
#     db.session.commit()  # Сохраняем изменения

#     print("Данные успешно добавлены в базу данных!")


# with myapp.app_context():
#     users = User.query.all()
#     for user in users:
#         print(f"ID: {user.id}, Имя: {user.username}, Email: {user.email}")
