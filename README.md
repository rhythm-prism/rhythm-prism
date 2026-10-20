# rhythm-prism
RhythmPrismで使用するサーバー。

<br>

## 構成
- <u>**rp-backend**</u>
    - Python3.14
    - FastAPI + SQLAlchemy + PostgreSQL + Celery + Redis

<br>

- <u>**rp-frontend**</u>
    - React 19 + TypeScript
    - Vite + Tailwind CSS v4

<br>

- <u>**rp-level-converter**</u>
    - Node.js 24
    - Hono + usctool

<br>

## 要件
- [Docker](https://www.docker.com/)（Docker Desktopでも可）

<br>

## 開発

### 開発環境を起動
```bash
docker compose -f docker-compose-dev.yml --env-file .env.dev.test up
```

### 開発環境を削除
```bash
docker compose -f docker-compose-dev.yml down -v
```

### 開発用バケットにアクセス（rustfs）
```
http://localhost:9001
```

<br>

## 本番
```bash
docker compose up
```