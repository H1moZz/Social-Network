# Базовый образ с Python
FROM python:3.13.1

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем файлы проекта в контейнер
COPY pyproject.toml poetry.lock ./
COPY social_network ./social_network
COPY run.py ./

# Устанавливаем Poetry
RUN pip install poetry

# Устанавливаем зависимости
RUN poetry install --no-root

# Открываем порт для Flask
EXPOSE 3001

# Запускаем приложение
CMD ["poetry", "run", "gunicorn", "-k", "eventlet", "-b", "0.0.0.0:3001", "run:socketio"]

