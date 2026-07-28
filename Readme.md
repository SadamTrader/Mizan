# Scrap ERP

A single-user ERP web application for managing a scrap trading business. Built with React + Vite (frontend), Fastify + Node.js (backend), and PostgreSQL via Prisma — all in a lean pnpm monorepo.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+
- [Docker](https://www.docker.com/) (for local PostgreSQL)

---

## Install

```bash
pnpm install
```

---

## Start the database

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Then start PostgreSQL with Docker:

```bash
docker compose -f docker/docker-compose.yml up -d
```

---

## Run the dev environment

```bash
pnpm dev
```

This starts both apps concurrently:
- **Web** → http://localhost:5173
- **API** → http://localhost:3001

---

## Folder structure

```
scrap-erp/
├── apps/
│   ├── web/              # React + Vite + TypeScript frontend
│   └── api/              # Fastify + TypeScript backend
├── packages/
│   └── shared-types/     # Types and Zod schemas shared across apps
├── docker/
│   └── docker-compose.yml  # Local PostgreSQL only
├── docs/                 # Architecture reference documents
├── .env.example          # Environment variable template
├── .gitignore
├── package.json          # Root workspace config
├── pnpm-workspace.yaml
└── README.md
```

---

## Other scripts

```bash
pnpm build     # Build all apps
pnpm lint      # Lint all workspaces
pnpm format    # Format all files with Prettier
```
