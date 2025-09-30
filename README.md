## AI Interview Buddy

An AI-powered interview practice web app with a Go backend and a Next.js frontend.

### Tech Stack
- **Frontend**: Next.js 15 (App Router, TypeScript), React 19, Tailwind CSS v4
- **Backend**: Go (Gin), listening on port 8080
- **Database**: PostgreSQL 16
- **Containerization**: Docker + docker-compose

---

## Monorepo Structure
```
ai_interview_buddy/
  ai_interview/
    frontend/                # Next.js app
      src/app/
        layout.tsx
        page.tsx
        globals.css          # Tailwind v4 setup + CSS variables
      public/
      next.config.ts
      eslint.config.mjs
      postcss.config.mjs
      tsconfig.json
      Dockerfile.front
    backend/                 # Go service
      cmd/server/main.go     # Gin HTTP server (/:8080)
      go.mod
      go.sum
    db/
      data/                  # Postgres volume (created by Compose)
    docker-compose.yml       # Orchestrates frontend + db
```

---

## Quick Start (Docker)
From `ai_interview/`:
```bash
# Build and start services
docker compose up --build

# Stop
docker compose down
```

- Frontend: http://localhost:3000
- Backend (example health): http://localhost:8080/health
- Postgres: localhost:5432 (user: postgres, password: postgres, db: ai_interview)

Health check example:
```bash
curl http://localhost:8080/health
# {"message":"OK"}
```

### docker-compose overview
`ai_interview/docker-compose.yml` defines:
- `frontend`: builds from `frontend/Dockerfile.front`, mounts `./frontend:/app`, runs `npm run dev`
- `db`: Postgres 16 with a persisted volume at `./db/data`

You can add a `backend` service here later; currently the Go backend can be run locally during development (see below).

---

## Local Development (without Docker)
### Frontend
```bash
cd ai_interview/frontend
npm install
npm run dev
```
- Dev server at `http://localhost:3000`
- Edit `src/app/page.tsx` to see live updates

Lint/Build/Start:
```bash
npm run lint
npm run build
npm run start
```

### Backend (Go)
```bash
cd ai_interview/backend
go run ./cmd/server
```
- Server listens on `:8080`
- Test: `curl http://localhost:8080/health`

> Tip: Create a `Makefile` with `make dev-frontend`, `make dev-backend` for convenience.

---

## Environment Variables
Base template works without env. For AI and DB features you will likely add:
- `OPENAI_API_KEY` (frontend or backend)
- `DATABASE_URL` (backend, e.g., Postgres). Example:
```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ai_interview?sslmode=disable
```

Frontend runtime config (example):
- `NEXT_PUBLIC_API_BASE_URL` (e.g., `http://localhost:8080`)
- Create `ai_interview/frontend/.env.local` as needed

---

## Notes on Tailwind v4
- Global theme variables live in `src/app/globals.css`
- Ensure `:root { ... }` (not `::root`)
- Use `@theme { ... }` (no `inline` keyword) for Tailwind v4 theme tokens

---

## API Surface (backend)
- `GET /health` → `{"message":"OK"}`

You can add routes under `cmd/server/main.go` using Gin.

---

## Deploy
- Frontend: Vercel (recommended) with project root `ai_interview/frontend`
- Backend: Any Go-friendly host (Fly.io, Render, Railway, AWS, etc.). Expose port 8080
- Database: Managed Postgres or self-hosted

For a simple container deploy of the frontend, you can build from `Dockerfile.front`. For full-stack container deploy, extend `docker-compose.yml` to include the backend and configure networking and env vars.

---

## Scripts (frontend)
From `ai_interview/frontend/package.json`:
- `npm run dev` – Next dev with Turbopack
- `npm run build` – Production build
- `npm run start` – Start production server
- `npm run lint` – Run ESLint

---

## License
See `LICENSE`.
