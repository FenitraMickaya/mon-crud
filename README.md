# mon-crud

CRUD complet : API Node/Express + PostgreSQL, front React/Vite.

## Démarrage

```bash
# 1. Backend (terminal 1)
cd backend
npm run db:init     # applique db/schema.sql (idempotent)
npm run dev         # http://localhost:4000

# 2. Frontend (terminal 2)
cd frontend
npm run dev         # http://localhost:5173
```

`npm run build` (frontend) et `npm test` (backend) sont également câblés.

## Structure

```
backend/
  .env                 # config locale (ne pas commiter)
  .env.example         # gabarit
  db/
    schema.sql         # tables
    init.js            # applique le schéma (npm run db:init)
  src/
    db.js              # pool pg + helpers query / queryOne / execute / ping
    server.js          # app Express, /api/health, gestion d'erreurs
  tests/               # vitest + supertest
frontend/
  .env
  src/
    api/client.js      # instance axios + intercepteur d'erreur
    App.jsx            # ← l'UI CRUD est à écrire
```

## Base de données

PostgreSQL local (v18), base `mon_crud` (crédifiants dans `backend/.env`).

```bash
psql -U crud -h localhost -d mon_crud          # console
psql -U crud -h localhost -d mon_crud -c "\dt"  # lister les tables
psql -U postgres -c "\l"                       # superuser
```

Table de départ : `items (id, name, description, created_at, updated_at)` —
à adapter à ton modèle métier dans `backend/db/schema.sql`.

## Rappel SQL PostgreSQL

- Placeholders **$1, $2, $3** (`WHERE id = $1`), pas de `?`
- `SERIAL` / `BIGSERIAL` pour l'auto-incrément (à la place de `AUTO_INCREMENT`)
- `NOW()` pour l'horodatage, `TIMESTAMPTZ` plutôt que `TIMESTAMP`
- `RETURNING id` pour récupérer la clé insérée :
  ```sql
  INSERT INTO items (name) VALUES ($1) RETURNING *
  ```


## Reste à coder

- `backend/src/routes/` — les routes CRUD
- `backend/src/repositories/` — les requêtes SQL
- `frontend/src/pages/` — liste, formulaire, détail
- `backend/tests/` — tests des routes

## Conventions

- L'API répond en JSON : `{ "data": ... }` pour les succès, `{ "error": "..." }` pour les erreurs.
- Le proxy `/api` → `http://localhost:4000` est configuré dans `frontend/vite.config.js`.
