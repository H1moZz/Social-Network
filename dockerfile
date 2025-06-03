FROM python:3.13.1

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем Poetry (официальный метод)
RUN pip install --upgrade pip && \
    pip install poetry==1.7.1

# Устанавливаем Gunicorn и gevent
RUN pip install gunicorn gevent

# Копируем зависимости и устанавливаем их
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi

# Копируем исходный код
COPY social_network ./social_network
COPY run.py ./

EXPOSE 10000

# Запускаем через Gunicorn с gevent
CMD ["gunicorn", "--worker-class", "eventlet", "--workers", "1", "--bind", "0.0.0.0:10000", "run:myapp"]