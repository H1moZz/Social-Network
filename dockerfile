FROM python:3.13.1
WORKDIR /app

COPY pyproject.toml poetry.lock ./
COPY social_network ./social_network
COPY run.py ./

RUN pip install poetry
RUN poetry install --no-root

EXPOSE 3001

CMD ["poetry", "run", "python3", "run.py"]