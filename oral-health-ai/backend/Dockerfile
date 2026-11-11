# ── OralAI Flask Backend — Dockerfile ──
FROM python:3.11-slim

LABEL maintainer="Bearys Institute of Technology"
LABEL description="OralAI Real-Time Oral Disease Detection — Flask API"

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create model directory (model file mounted at runtime)
RUN mkdir -p model

# Non-root user for security
RUN useradd -m -u 1001 oralai && chown -R oralai:oralai /app
USER oralai

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Use gunicorn in production, flask dev server otherwise
CMD ["python", "app.py"]
