# Official Playwright Python image - includes Chromium and all dependencies
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install playwright-stealth separately (may not be in base image)
RUN pip install --no-cache-dir playwright-stealth>=1.0.6

# Copy application code
COPY . .

# Expose port (Render uses PORT env var, default to 8080)
EXPOSE 8080

# Start FastAPI with uvicorn
CMD ["sh", "-c", "uvicorn scraper:app --host 0.0.0.0 --port ${PORT:-8080}"]
