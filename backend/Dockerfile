FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend application code
COPY backend/app.py .
COPY backend/csv_historical_data.py .
COPY backend/historical_data_fetcher.py .
COPY backend/usda_pa_grain_scraper.py .

# ML modules, trained models, and training data
COPY models/ .

ENV MODELS_DIR=/app
ENV PORT=5000

EXPOSE 5000

CMD ["gunicorn", "--workers", "2", "--threads", "2", "--timeout", "120", "--bind", "0.0.0.0:5000", "app:app"]
