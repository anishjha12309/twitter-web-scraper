# Lightweight Python image (no Playwright needed)
FROM python:3.10-slim

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Render uses PORT env var, default to 8080)
EXPOSE 8080

# Start FastAPI with uvicorn
CMD ["sh", "-c", "uvicorn scraper:app --host 0.0.0.0 --port ${PORT:-8080}"]

