FROM python:3.11-slim AS runtime
WORKDIR /app
COPY core /app/core
COPY services/api /app/services/api
RUN pip install --no-cache-dir -e /app/core -r /app/services/api/requirements.txt
EXPOSE 8000
CMD ["uvicorn", "services.api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
