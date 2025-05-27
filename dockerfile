FROM python:3.13.1

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем зависимости и код
COPY pyproject.toml poetry.lock ./  
COPY social_network ./social_network
COPY run.py ./

# Устанавливаем Poetry
RUN pip install poetry

# Устанавливаем зависимости проекта
RUN poetry install --no-root

# Открываем порт
EXPOSE 3001

# Запуск через gunicorn + eventlet
CMD ["poetry", "run", "gunicorn", "-k", "eventlet", "-b", "0.0.0.0:3001", "run:socketio"]