FROM python:3.11-slim
WORKDIR /app
COPY core /app/core
COPY services/worker /app/services/worker
RUN pip install --no-cache-dir -e /app/core -r /app/services/worker/requirements.txt
CMD ["celery", "-A", "services.worker.tasks", "worker", "--loglevel=INFO"]
