FROM python:3.13.1

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем Poetry (официальный метод)
RUN pip install --upgrade pip && \
    curl -sSL https://install.python-poetry.org | python3 - && \
    ln -s /root/.local/bin/poetry /usr/local/bin/poetry

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

# Запускаем через Gunicorn + Eventlet
CMD ["gunicorn", "-k", "eventlet", "-b", "0.0.0.0:3001", "run:myapp"]