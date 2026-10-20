FROM ghcr.io/astral-sh/uv:0.12.22-python3.14-trixie

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN apt-get update && apt-get install -y \
    ffmpeg\
    curl\
    libpq-dev \
    gcc \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN uv sync --frozen --no-cache

COPY . .

CMD ["uv", "run", "gunicorn", "--config", "gunicorn_config.py", "main:app"]
#CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001"]