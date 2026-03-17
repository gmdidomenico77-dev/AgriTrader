FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (if pdfplumber or other libs need them)
RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy project
COPY . /app

# Install backend Python dependencies
RUN pip install --no-cache-dir -r AgriTrader/backend/requirements.txt

# Environment configuration
ENV PYTHONUNBUFFERED=1 \\
    PORT=5000

EXPOSE 5000

# Default command: run the Flask app
CMD ["python", "AgriTrader/backend/app.py"]

