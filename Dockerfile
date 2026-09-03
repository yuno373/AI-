FROM python:3.11-slim

WORKDIR /app

COPY backend/ ./backend/
RUN cd backend && pip install -r requirements.txt

COPY frontend/dist/ ./backend/static/

WORKDIR /app/backend

EXPOSE 10000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
