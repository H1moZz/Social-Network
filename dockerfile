FROM python:3.11.11

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем Poetry (официальный метод)
RUN pip install --upgrade pip && \
    pip install poetry==1.7.1

# Устанавливаем Gunicorn и Eventlet
RUN pip install gunicorn eventlet

# Копируем зависимости и устанавливаем их
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi

# Копируем исходный код
COPY social_network ./social_network
COPY run.py ./

EXPOSE 3001

# Запускаем через Gunicorn + Eventlet с одним воркером
CMD ["gunicorn", "--worker-class", "eventlet", "--workers", "1", "--bind", "0.0.0.0:3001", "run:myapp"]