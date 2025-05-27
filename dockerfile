FROM python:3.13.1

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем Poetry (официальный метод)
RUN pip install --upgrade pip && \
    curl -sSL https://install.python-poetry.org | python3 - && \
    export PATH="/root/.local/bin:$PATH"

# Копируем зависимости и устанавливаем их
COPY pyproject.toml poetry.lock ./
RUN poetry install --no-interaction --no-ansi

# Копируем исходный код
COPY social_network ./social_network
COPY run.py ./

EXPOSE 3001

# Запускаем через Gunicorn + Eventlet
CMD ["poetry", "run", "gunicorn", "-k", "eventlet", "-b", "0.0.0.0:3001", "--reload", "run:myapp"]