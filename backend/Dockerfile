FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default command is overridden in docker-compose, but good to have
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
