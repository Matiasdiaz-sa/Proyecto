# Plan de Instalación y Despliegue: Sistema de Análisis de Sentimientos

Este documento detalla la estrategia de contenedorización y despliegue en un entorno productivo para el sistema de análisis de sentimientos masivo.

## 1. Preparación

### Estructura de Directorios (Monorepo)
Se propone la siguiente estructura para separar responsabilidades y facilitar el orquestado:

```text
sentiment-analysis-system/
├── backend/                  # FastAPI Application
│   ├── app/                  # Application code
│   ├── requirements.txt      # dependencias exactas
│   └── Dockerfile            # Multi-stage Dockerfile
├── frontend/                 # Next.js 14 Application
│   ├── src/                  # Application code
│   ├── package.json          # Node dependencies
│   └── Dockerfile            # Multi-stage Dockerfile
├── docker/                   # Configuración y scripts
│   └── mongo/
│       └── init-vector.js    # Inicialización en BD (Data stubbing)
├── scripts/                  # Scripts de utilería
│   └── init-vector-index.py  # Script de migración Vector Index
├── .env                      # Variables de entorno unificadas
└── docker-compose.yml        # Orquestación de contenedores
```

### Configuración de Variables de Entorno (`.env`)
Debes crear un archivo `.env` en la raíz del proyecto. **Importante**: No versionar este archivo en Git.

```env
# ==== COMUNES ====
DOMAIN=tu-dominio.com
EMAIL_SSL=tu-email@dominio.com

# ==== BACKEND (FastAPI) ====
API_V1_STR=/api/v1
PROJECT_NAME="Sentiment AI System"
BACKEND_CORS_ORIGINS=["https://dashboard.tu-dominio.com"]
JWT_SECRET_KEY=generar_con_openssl_rand_hex_32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ==== BASE DE DATOS (MongoDB) ====
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=password_seguro_db
MONGO_DB_NAME=sentiment_db
# URI usada por la App
MONGO_URI=mongodb://admin:password_seguro_db@mongodb:27017/sentiment_db?authSource=admin

# ==== IA (OpenAI) ====
OPENAI_API_KEY=sk-proj-tu-api-key-de-openai

# ==== NOTIFICACIONES (Telegram) ====
TELEGRAM_BOT_TOKEN=tu_token_de_bot
TELEGRAM_CHAT_ID=chat_id_o_channel_id

# ==== FRONTEND (Next.js) ====
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api/v1
```

## 2. Configuración de Servicios

### Dockerfile Backend (FastAPI) - Image Optimization
Se usa *multi-stage build* para descartar el compilador C y reducir la superficie de ataque y el peso final.

```dockerfile
# /backend/Dockerfile
FROM python:3.11-slim as builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc build-essential
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache /wheels/*
COPY ./app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dockerfile Frontend (Next.js 14) - Standalone Mode
Next.js permite usar `output: 'standalone'` en `next.config.js` para reducir agresivamente el tamaño del contenedor y omitir los `node_modules` no requeridos en runtime.

```dockerfile
# /frontend/Dockerfile
FROM node:18-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build # Requiere next.config.js con output: "standalone"

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

### Orquestación: `docker-compose.yml`
Provee redes internas, volúmenes de persistencia y un *Reverse Proxy* (Traefik) transparente que gestionará Let's Encrypt automáticamente.

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
    restart: unless-stopped
    env_file: .env
    depends_on:
      - mongodb
    networks:
      - sentiment-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`api.${DOMAIN}`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=myresolver"
      - "traefik.http.services.backend.loadbalancer.server.port=8000"

  frontend:
    build:
      context: ./frontend
    restart: unless-stopped
    env_file: .env
    networks:
      - sentiment-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`dashboard.${DOMAIN}`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=myresolver"
      - "traefik.http.services.frontend.loadbalancer.server.port=3000"

  mongodb:
    image: mongo:7.0 # Requiere v7.0.x para soporte de Vector Search interno en local
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD}
    volumes:
      - mongo_data:/data/db
    networks:
      - sentiment-network

  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=${EMAIL_SSL}"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/letsencrypt
    networks:
      - sentiment-network

networks:
  sentiment-network:

volumes:
  mongo_data:
  traefik_certs:
```

## 3. Scripts de Inicialización

### Configuración de Atlas Search / Local Vector Index (MongoDB)
Para que el sistema de Chat de consultas RAG funcione, debemos indexar los campos. MongoDB local a partir de la versión 7 soporta índices de búsqueda vectorial, pero tradicionalmente esto se hace sobre **MongoDB Atlas**. Si estamos con Mongo puro como contenedor, crearemos el índice usando un script de Python en el contenedor del backend después del despliegue.

En `scripts/init-vector-index.py`:
```python
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def index_vector():
    client = AsyncIOMotorClient(os.getenv("MONGO_URI"))
    db = client[os.getenv("MONGO_DB_NAME", "sentiment_db")]
    
    # Parámetros del índice (Manejo para text-embedding-3-small u otro con 1536 dimensiones)
    search_index_model = {
        "name": "vector_index",
        "definition": {
            "fields": [
                {
                    "type": "vector",
                    "path": "embedding",
                    "numDimensions": 1536,
                    "similarity": "cosine"
                }
            ]
        }
    }
    
    try:
        await db.reviews.create_search_index(search_index_model)
        print("Vector search index successfully mapped.")
    except Exception as e:
        print(f"Index error: {e}")

if __name__ == "__main__":
    asyncio.run(index_vector())
```

## 4. Despliegue

En la terminal de la VM o servidor de producción Ubuntu/Debian, ejecuta secuencialmente:

1. **Clonar Repo e ingresar al directorio root**:
   ```bash
   git clone <tu-repo-url> /var/www/sentiment-system
   cd /var/www/sentiment-system
   ```

2. **Configurar los Secretos**:
   ```bash
   cp .env.example .env
   nano .env
   # Asegúrate de escribir certificados correctos y definir dominio apuntando a la IP de la VM.
   ```

3. **Construir Imágenes y Levantar Contenedores** (en modo background):
   ```bash
   docker compose up -d --build
   ```

4. **Ejecutar el script de Migración / Vector Search**:
   Una vez que el backend esté vivo y conectado a la BD, levanta un proceso aislado para inyectar los índices:
   ```bash
   docker compose exec backend python scripts/init-vector-index.py
   ```

## 5. Verificación de Salud (Healthchecks) y Monitoreo

### 5.1 Verificar estado y redes
Toda la aplicación debe figurar "Up".
```bash
docker compose ps
docker compose network ls
```

### 5.2 Testeo de Endpoints Ruteados y SSL (Traefik)
Traefik resolverá de forma silente el certificado SSL de Let's Encrypt. Validar usando CURL ignorando cache:
```bash
# Validar app Next.js Frontend
curl -I https://dashboard.tu-dominio.com

# Validar Health endpoint FastAPI (Asegúrate de tener un endpoint /health)
curl -I https://api.tu-dominio.com/api/v1/health
```

### 5.3 Logging Constante y Monitoreo de Recursos
Para revisar logs si un contenedor arroja un error o verificar peticiones entrantes:
```bash
# Seguir los logs en vivo del Frontend Next.js
docker compose logs -f frontend

# Observar las colas asíncronas / logs de peticiones en FastAPI
docker compose logs -f backend

# Depurar SSL de Traefik:
docker compose logs -f traefik
```

Si prefieres monitoreo estadístico rápido de consumo por servicio, puedes usar `docker stats`.
