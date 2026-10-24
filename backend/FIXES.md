# Correctifs backend — `mon-crud`

> **État au 23/10 — 20:15** : **les 17 bugs de ce document et les 12 rappels
> (`DIAGNOSTIC.md`) sont corrigés et vérifiés**. Le CRUD fonctionne de bout en bout,
> `npm test` passe (10/10) et le parcours navigateur est validé (22/22).
>
> Ce document est conservé tel quel comme **trace de l'analyse du 22/10** :
> chaque bug y est classé par impact réel avec la correction exacte.
> Pour l'état complet, voir `DIAGNOSTIC.md`.

Diagnostic réalisé en exécution réelle (PostgreSQL 18.6, Express 5, pg 8.23).
Chaque bug est classé par **impact réel** et accompagné de la correction exacte.

**État initial : les 5 endpoints `/api/employee` ne répondaient pas correctement.**

| Requête | Comportement observé |
|---|---|
| `GET /api/employee` | timeout (15 s) — status `000` |
| `GET /api/employee/1` | `500` + page HTML Express |
| `POST /api/employee` | timeout (15 s) |
| `PUT /api/employee/1` | timeout (15 s) |
| `DELETE /api/employee/1` | `500` + HTML, puis `{error:"..."}` en `200` |
| `npm test` | 2 tests échouent (`TypeError: Cannot read properties of undefined`) |

**Ordre de correction recommandé : B1 → B2 (SQL) → B3 (Express) → B4 (contrôleur) → B5 (tests/outillage).**

---

# Bloc A — SQL (`backend/utils/sqlQuery.js`)

## A1 — Guillemet non fermé dans le `CREATE TYPE`

`sqlQuery.js:2`

```js
// AVANT
export const createRoleQuery = `
  CREATE TYPE role_type AS ENUM('Developer', 'Manager', 'Sales', 'Admin', 'Intern)
`;

// APRÈS
export const createRoleQuery = `
  CREATE TYPE role_type AS ENUM('Developer', 'Manager', 'Sales', 'Admin', 'Intern')
`;
```

**Erreur réelle :** `chaîne entre guillemets non terminée sur ou près de « 'Intern) »`

---

## A2 — Type de cast invalide : `role-type` au lieu de `role_type`

`sqlQuery.js:26`

```js
// AVANT
    COALESCE ($4::role-type, 'Intern'::role_type),

// APRÈS
    COALESCE ($4::role_type, 'Intern'::role_type),
```

**Erreur réelle :** `le type « role » n'existe pas`
(PostgreSQL interprète `role-type` comme `role` moins `type`.)

---

## A3 — `INSERT` : 4 colonnes mais 5 valeurs

`sqlQuery.js:20-30` — deux problèmes distincts sur le même bloc.

### A3-a — le mapping des paramètres est désaligné

Le contrôleur envoie les paramètres dans cet ordre (`employeeControllers.js:66-68`) :

```js
[name, email, salary, age, role]   // $1 $2 $3 $4 $5
```

Mais la requête place `$3` dans `role` et `$4` dans `salary` :

```js
// AVANT
export const createEmployeeQuery = `
  INSERT INTO employee_details (name, email, role, salary)
  VALUES(
    $1,
    $2,
    $3,
    COALESCE ($4::role_type, 'Intern'::role_type),
    $5
  )
    RETURNING *
`

// APRÈS
export const createEmployeeQuery = `
  INSERT INTO employee_details (name, email, age, salary, role)
  VALUES(
    $1,
    $2,
    $3,
    $4,
    COALESCE($5::role_type, 'Intern'::role_type)
  )
  RETURNING *
`
```

**Conséquence avant correction :**
`role` recevait `salary`, `salary` recevait `age` casté en enum, et `$5` (`role`) n'était utilisé nulle part.

### A3-b — le nombre de valeurs ne correspondait pas au nombre de colonnes

4 colonnes (`name, email, role, salary`) mais 5 valeurs → `INSERT has more expressions than target columns`.
La version corrigée ci-dessus a 5 colonnes et 5 valeurs, alignées avec l'ordre du contrôleur.

### A3-c — ⚠️ l'ordre des paramètres doit être le même partout

**C'est la source de confusion principale.** Le `CREATE` et l'`UPDATE` doivent partager **un seul et même
ordre de paramètres**, sinon il faut lesrée un par un à chaque modification.

| Requête | Ordre des paramètres |
|---|---|
| `CREATE` | `[name, email, age, salary, role]` |
| `UPDATE` | `[name, email, age, salary, role, id]` |

`id` n'est qu'en dernier, tout le reste est dans le même ordre. C'est l'ordre retenu dans ce document
et celui qui a été vérifié en exécution réelle (voir section « Vérification du SQL corrigé »).

**Pour adop cet ordre, modifie aussi le contrôleur** (`employeeControllers.js:66-68`) :

```js
// AVANT
    const data = await query(createEmployeeQuery, [
      name, email, salary, age, role
    ]);

// APRÈS
    const data = await query(createEmployeeQuery, [
      name, email, age, salary, role
    ]);
```

> **Attention** : le `CREATE` reçoit `role` en dernier, et `salary` est le 4ᵉ paramètre.
> Si tu préfères conserver l'ordre `[name, email, salary, age, role]` du contrôleur, alors la
> requête doit être `VALUES($1, $2, $3, $4, COALESCE($5::role_type, ...))` avec les colonnes
> `(name, email, salary, age, role)` — **et** l'`UPDATE` doit être réaligné sur le même ordre.
> Choisis un ordre et applique-le aux deux requêtes.

---

## A4 — Syntaxe de cast invalide dans l'UPDATE

`sqlQuery.js:48`

```js
// AVANT
    role = COALESCE($4:role_type, role)

// APRÈS
    role = COALESCE($5::role_type, role)
```

**Erreur réelle :** `erreur de syntaxe sur ou près de « : »`
Le cast PostgreSQL s'écrit `::`. Et `$4:role_type` était de toute façon faux : `$4` est `salary`, pas `role`.

---

## A5 — L'UPDATE écrase le salaire avec le nom

`sqlQuery.js:45-51`

```js
// AVANT
export const updateEmployeeQuery = `
  UPDATE employee_details
  SET
  name = COALESCE($1, name)
  email = COALESCE($2, email)
  age = COALESCE($3, age)
  role = COALESCE($4:role_type, role)
  salary = COALESCE($1, salary)

  WHERE id= $6
  RETURNING *
`;

// APRÈS
export const updateEmployeeQuery = `
  UPDATE employee_details
  SET
    name   = COALESCE($1, name),
    email  = COALESCE($2, email),
    age    = COALESCE($3, age),
    salary = COALESCE($4, salary),
    role   = COALESCE($5::role_type, role)
  WHERE id = $6
  RETURNING *
`;
```

**Erreur réelle :** `salary = COALESCE($1, salary)` — `$1` est `name`. Le salaire prenait la valeur du nom.
Le contrôleur passe bien `[name, email, age, salary, role, id]` → `$4` = salary, `$5` = role, `$6` = id.

> Note : la virgule après chaque `colonne = ...` est obligatoire. Sans elle, PostgreSQL rejette l'`UPDATE`.

---

## A6 — Le DELETE ne supprime rien (`SELECT FROM`)

`sqlQuery.js:37-40`

```js
// AVANT
export const deleteEmployeeQuery = `
  SELECT FROM employee_details
  WHERE id = $1
`;

// APRÈS
export const deleteEmployeeQuery = `
  DELETE FROM employee_details
  WHERE id = $1
  RETURNING *
`;
```

**Piège important :** `SELECT FROM employee_details WHERE id = $1` **ne lève aucune erreur**.
PostgreSQL l'accepte comme une liste de cibles vide et renvoie `rowCount = 1`, `rows = [{}]`.
Le DELETE échouait donc **en silence** — aucune erreur visible dans les logs, rien n'était supprimé.

`RETURNING *` a été ajouté pour que le contrôleur puisse savoir ce qui a été supprimé (cf. B6).

---

## A7 — Idempotence du `CREATE TYPE`

`sqlQuery.js:1-3` et `sqlQuery.js:5-14`

Le contrôleur (`employeeControllers.js:18-19`) crée le type puis la table, mais **sans `IF NOT EXISTS`**.
Tant que les deux vont de pair, ça fonctionne : le `to_regclass` (`employeeControllers.js:14,17`) fait sauter la
création dès que la table existe.

En revanche, si le `CREATE TYPE` réussit et que le `CREATE TABLE` échoue (ou l'inverse), les deux objets divergent :
le `GET` suivant échoue sur `le type « role_type » existe déjà` → la requête pend (cf. B1).

```js
// APRÈS
export const createRoleQuery = `
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
      CREATE TYPE role_type AS ENUM('Developer', 'Manager', 'Sales', 'Admin', 'Intern');
    END IF;
  END
  $$;
`;

export const createEmployeeTableQuery = `
  CREATE TABLE IF NOT EXISTS employee_details (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    age SMALLINT NOT NULL CHECK (age > 18),
    role role_type NOT NULL DEFAULT 'Intern',
    salary DECIMAL(8, 2) NOT NULL
  );
`;
```

**Alternative plus simple** (et recommandée) : sortir la création du schéma du chemin `GET`.
Voir la section D1.

---

## A8 — Virgule finale avant la parenthèse fermante du `CREATE TABLE`

`sqlQuery.js:12` — **introduit par la correction partielle de la faute A1.**

```js
// AVANT (actuel)
  salary DECIMAL(8, 2) NOT NULL,
  )

// APRÈS
  salary DECIMAL(8, 2) NOT NULL
  )
```

**Erreur réelle :** `erreur de syntaxe sur ou près de « ) »`

PostgreSQL n'accepte **pas** de virgule avant `)` dans une liste de colonnes — contrairement à MySQL
qui la tolère. Vérifié :

```
CREATE TABLE t2 (id SERIAL PRIMARY KEY, salary DECIMAL(8, 2) NOT NULL,);
ERREUR:  erreur de syntaxe sur ou près de « ) »
CREATE TABLE t3 (id SERIAL PRIMARY KEY, salary DECIMAL(8, 2) NOT NULL);
CREATE TABLE
```

**Impact :** le `CREATE TABLE` échoue → le `GET /api/employee` plante (et laisse le type `role_type`
créé sans la table, cf. A7). Le `POST` n'est pas affecté (il ne passe pas par là), mais il échoue
de son côté sur A3.

---

# Bloc B — Contrôleur (`backend/controllers/employeeControllers.js`)

## B1 — `SELEST` : faute de frappe

`employeeControllers.js:14`

```js
// AVANT
    const response = await query(`SELEST to_regclass('employee_details')`)

// APRÈS
    const response = await query(`SELECT to_regclass('employee_details') AS table_name`)
```

**Erreur réelle (log serveur) :** `erreur de syntaxe sur ou près de « SELEST »`

---

## B2 — Le `catch` avale l'erreur et ne répond jamais

`employeeControllers.js:25-27` et `employeeControllers.js:71-73`

C'est **la cause du timeout HTTP**. L'erreur est journalisée mais aucune réponse n'est envoyée :
Express ne termine jamais la requête → le client expire.

```js
// AVANT
  } catch (error) {
    console.log(error.message);
  }
}

// APRÈS
  } catch (error) {
    next(error)   // transmet au middleware d'erreur global de server.js
  }
```

```js
// AVANT
  } catch (error) {
    console.log(error.message)
  }
}

// APRÈS
  } catch (error) {
    next(error)
  }
```

> `next` est déjà dans la signature des deux handlers (`async (req, res, next)`), rien à ajouter.

---

## B3 — `getEmployee` n'a aucun `try/catch`

`employeeControllers.js:29-38`

Une erreur SQL ici n'est pas rattrapée → elle remonte au middleware d'erreur global
(qui est lui-même cassé, cf. C2) → réponse HTML 500 au lieu de JSON.

```js
// AVANT
const getEmployee = async (req, res, next) => {
  const id = req.params.id;
  const data = await query(getEmployeeQuery, [id]);
  console.log(data)

  if (!data.rows.length) {
    return res.json({ error: 'Employee record not found' })
  }
  res.json(data.rows[0])
}

// APRÈS
const getEmployee = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { rows } = await query(getEmployeeQuery, [id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Employee record not found' })
    }
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
}
```

---

## B4 — `data.rowcontent` : propriété inexistante

`employeeControllers.js:81`

```js
// AVANT
  if (!data.rowcontent) {
    return res.json({ error: 'Employee record not found' })
  }
  res.json({ message: 'Employee succesfully deleted' })
```

`rowcontent` n'existe pas sur le résultat `pg` → toujours `undefined` → `!undefined` → toujours vrai.
**Le DELETE répondait donc toujours « not found », même après un succès.**

```js
// APRÈS
  const data = await query(deleteEmployeeQuery, [id])

  if (data.rowCount === 0) {
    return res.status(404).json({ error: 'Employee record not found' })
  }
  res.json({ message: 'Employee successfully deleted' })
```

*(la property correcte est `rowCount`, cohérente avec `updateEmployee` ligne 48)*

---

## B5 — Les erreurs sont renvoyées en HTTP 200

`employeeControllers.js:35`, `employeeControllers.js:49`, `employeeControllers.js:64`

```js
// AVANT
    return res.json({ error: 'Employee record not found' })   // 200 !
    return res.json({ error: 'Employee not updated' })        // 200 !
    return res.json({ error: 'Missing fields' })              // 200 !

// APRÈS
    return res.status(404).json({ error: 'Employee record not found' })
    return res.status(404).json({ error: 'Employee not updated' })
    return res.status(400).json({ error: 'Missing fields' })
```

**Pourquoi c'est bloquant pour le frontend :** sans code HTTP distinct, le client ne peut pas distinguer
une création réussie d'une erreur. `axios` ne rejetera pas la promesse, l'erreur s'affichera comme un succès.

---

## B6 — `res.json(result.rows[0])` quand `rows` est vide

`employeeControllers.js:49-51` et `employeeControllers.js:70`

Si `rowCount === 0`, `rows[0]` vaut `undefined` → `res.json(undefined)` renvoie un corps vide.

```js
// APRÈS
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Employee not updated' })
    }
    res.json(result.rows[0])
```

---

## B7 — Validation `!age` rejette `0`

`employeeControllers.js:63`

```js
// AVANT
    if (!name || !role || !age || !email) {
```

`!age` est vrai pour `age === 0`. La contrainte `CHECK (age > 18)` le rejeterait de toute façon,
mais le message d'erreur serait alors celui de PostgreSQL, pas le tien.

```js
// APRÈS
    if (!name || !role || age === undefined || !email) {
```

`salary` n'est pas vérifié non plus alors que la colonne est `NOT NULL` — ajoute-le si tu veux
un message clair :

```js
    if (!name || !role || age === undefined || !email || salary === undefined) {
```

---

# Bloc C — Serveur Express (`backend/src/server.js`)

## C1 — `app.status` n'existe pas

`server.js:21`

```js
// AVANT
  return app.status(statusCode).json({error: message})
```

**Erreur réelle :** `TypeError: app.status is not a function`
→ toute erreur non rattrapée renvoie une **page HTML** d'Express au lieu d'un JSON.
C'est ce qui produisait le `500` + HTML observé sur `GET /api/employee/1` et `DELETE /api/employee/1`.

```js
// APRÈS
  return res.status(statusCode).json({ error: message })
```

---

## C2 — `res.statusCode || 5000` : deux bugs sur une ligne

`server.js:19`

```js
// AVANT
  const statusCode = res.statusCode || 5000;
```

**(a)** `res.statusCode` vaut **200 par défaut** dans Express → l'expression renvoie `200`, jamais `5000`.
Le `5000` est du code mort. Même avec `res.status()` corrigé (C1), **les erreurs partiraient en HTTP 200**.

**(b)** `5000` n'est pas un code HTTP valide. Testé :
`RangeError: Invalid status code: 5000. Status code must be greater than 99 and less than 1000.`

```js
// APRÈS
  const statusCode = err.status || err.statusCode || 500;
```

`err.status` permet à un handler de choisir son code (`err.status = 404`).

---

## C3 — Le middleware d'erreur est placé trop tôt

`server.js:18-22` vs `server.js:24-26`

Express exécute les middlewares **dans l'ordre d'enregistrement**. Un handler d'erreur enregistré
**avant** une route ne rattrape pas les erreurs de cette route.

**Vérifié empiriquement :** une route enregistrée après le handler d'erreur qui `throw` →
réponse `500` avec le **HTML par défaut d'Express**, le handler n'est jamais appelé.

```js
// APRÈS
app.use("/api/employee", employeeRoutes)

app.get("/", (req, res) => {
  res.send("API works")
})

// 404 — doit être AVANT le handler d'erreur, mais APRÈS toutes les routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl })
})

// Handler d'erreur — TOUJOURS en dernier
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'
  console.error(err)
  return res.status(statusCode).json({ error: message })
})
```

---

## C4 — `app` n'est pas exporté → les tests sont cassés

`server.js:30` (fin de fichier)

**C'est la cause racine de l'échec des tests.** `tests/health.test.js:3` fait
`import app from '../src/server.js'` → `app` vaut `undefined`.

**Erreur réelle :** `TypeError: Cannot read properties of undefined (reading 'address')`
(dans `supertest/lib/test.js:65`).

```js
// APRÈS (fin du fichier)
app.listen(port, () => {
  console.log("Server started on http://localhost:" + port);
})

export default app
```

---

## C5 — `app.listen()` au top-level démarre un serveur pendant les tests

`server.js:28-30`

Pendant `npm test`, l'import de `server.js` démarre un **vrai serveur sur le port 4000**
(visible dans la sortie vitest : `Server started on http://localhost:4000`).
Deux conséquences : les tests peuvent entrer en conflit de port, et le serveur n'est jamais arrêté.

```js
// APRÈS
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log("Server started on http://localhost:" + port);
  })
}

export default app
```

Puis, dans `package.json` :

```json
"test": "NODE_ENV=test vitest run --passWithNoTests"
```

---

## C6 — Pas de handler 404

`server.js` (après les routes, avant le handler d'erreur)

Sans ça, Express renvoie son 404 par défaut en **HTML**, et ton `tests/health.test.js:18`
attend `{ error: 'Not found' }` en JSON.

```js
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl })
})
```

*(voir C3 pour l Placement exact)*

---

# Bloc D — Outillage

## D1 — Le schéma SQL n'a plus de source de vérité

`git status` montre `D backend/db/schema.sql` et `D backend/db/ainit.js` (supprimés).
Et `package.json:10` pointe vers un fichier qui ne fait qu'ouvrir une connexion :

```json
"db:init": "node utils/connectDB.js"
```

`utils/connectDB.js` ne contient **aucun** `CREATE TABLE` — la commande ne crée rien.

**Deux options :**

**Option 1 — recréer `backend/db/schema.sql` :**

```sql
-- backend/db/schema.sql
CREATE TYPE IF NOT EXISTS role_type AS ENUM('Developer', 'Manager', 'Sales', 'Admin', 'Intern');
```
> ⚠️ PostgreSQL ne supporte pas `CREATE TYPE IF NOT EXISTS`. Utilise le bloc `DO $$` de la section A7.

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
    CREATE TYPE role_type AS ENUM('Developer', 'Manager', 'Sales', 'Admin', 'Intern');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS employee_details (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(50) NOT NULL UNIQUE,
  age SMALLINT NOT NULL CHECK (age > 18),
  role role_type NOT NULL DEFAULT 'Intern',
  salary DECIMAL(8, 2) NOT NULL
);
```

et un `backend/db/init.js` :

```js
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'

const sql = fs.readFileSync(path.join(import.meta.dirname, 'schema.sql'), 'utf8')
const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})
await client.connect()
await client.query(sql)
await client.end()
console.log(`✅ Schéma appliqué sur ${process.env.DB_NAME}`)
```

puis `"db:init": "node db/init.js"`.

**Option 2 — sortir la création du schéma du contrôleur (recommandé).**
C'est ce que fait le `if (!response.rows[0].to_regclass)` (`employeeControllers.js:17-20`) :
un `GET` qui crée le schéma est une effet de bord sur une route de lecture. Si la création échoue,
la route est cassée. Mieux :

- le schéma vit dans un fichier `schema.sql` versionné,
- `npm run db:init` l'applique,
- `employeeControllers.js` ne fait plus que `SELECT`.

```js
// employeeControllers.js — version nettoyée
const getAllEmployee = async (req, res, next) => {
  try {
    const { rows } = await query(getAllemployeeQuery)
    res.json(rows)
  } catch (error) {
    next(error)
  }
}
```

---

## D2 — Fuite de connexion dans le pool

`utils/connectDB.js:28`

```js
// AVANT
db.connect().then(()=> console.log("Database is connected")).catch((err)=>{
  console.log("Connection denied");
  process.exit(1)
})
```

`Pool.connect()` **acquiert** un client dans le pool. Sans `client.release()`, cette connexion
n'est jamais rendue → le pool perd une de ses 10 places à chaque import du module.

```js
// APRÈS
const client = await db.connect()
console.log("Database is connected")
client.release()
```

ou, plus simple, un test de connexion qui ne consomme rien :

```js
await db.query('SELECT 1')
console.log("Database is connected")
```

---

## D3 — `process.exit()` sans code

`utils/connectDB.js:16` et `utils/connectDB.js:30`

`process.exit()` sans argument sort avec le code **0** → un échec est indiscernable d'un succès
pour un script shell ou un CI.

```js
// APRÈS
process.exit(1)   // ligne 16
process.exit(1)   // ligne 30
```

---

## D4 — `tests/health.test.js` teste une route qui n'existe plus

`tests/health.test.js:7`

`/api/health` a été supprimé de `server.js` lors de ta réécriture. Deux options :

**Option 1 — réécrire le test pour viser la vraie API :**

```js
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/server.js'

describe('API — employee', () => {
  it('liste les employés', async () => {
    const res = await request(app).get('/api/employee')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('404 sur un id inexistant', async () => {
    const res = await request(app).get('/api/employee/999999')
    expect(res.status).toBe(404)
  })
})
```

**Option 2 — réintroduire une route de santé dans `server.js` :**

```js
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1')
    res.json({ status: 'ok', database: true })
  } catch {
    res.status(503).json({ status: 'degraded', database: false })
  }
})
```

---

# Bloc E — Frontend

## E1 — `App.jsx` est encore le template Vite

`frontend/src/App.jsx` (122 lignes)

C'est le fichier d'accueil par défaut de Vite (« Get started », compteur, logos React/Vite).
`axios` et `frontend/src/api/client.js` sont installés **mais importés nulle part**
(vérifié par grep sur `frontend/src/`) : aucune requête n'est émise.

## E2 — `index.html` vide à la racine du dépôt

`/index.html` — **0 octet**, commité dans `d59d387`.
À supprimer, c'est un fichier accidentel (le vrai est `frontend/index.html`).

```bash
git rm index.html
```

---

# Résumé des corrections

| ID | Fichier | Ligne | Correction | Impact |
|---|---|---|---|---|
| A1 | `utils/sqlQuery.js` | 2 | `'` après `Intern` | Bloquant |
| A2 | `utils/sqlQuery.js` | 26 | `role-type` → `role_type` | Bloquant |
| A3 | `utils/sqlQuery.js` | 20-30 | 5 colonnes / 5 valeurs, mapping aligné | Bloquant |
| A4 | `utils/sqlQuery.js` | 48 | `$4:role_type` → `$5::role_type` | Bloquant |
| A5 | `utils/sqlQuery.js` | 45-51 | `salary` ← `$4`, `role` ← `$5` | Bloquant |
| A6 | `utils/sqlQuery.js` | 37-40 | `SELECT FROM` → `DELETE FROM` | Bloquant (silencieux) |
| A7 | `utils/sqlQuery.js` | 1-14 | `IF NOT EXISTS` / bloc `DO $$` | Fragilité |
| B1 | `controllers/employeeControllers.js` | 14 | `SELEST` → `SELECT` | Bloquant |
| B2 | `controllers/employeeControllers.js` | 25-27, 71-73 | `next(error)` au lieu de ne rien faire | Bloquant (timeout) |
| B3 | `controllers/employeeControllers.js` | 29-38 | wrapper `try/catch` + `next(error)` | Bloquant |
| B4 | `controllers/employeeControllers.js` | 81 | `rowcontent` → `rowCount` | Bloquant |
| B5 | `controllers/employeeControllers.js` | 35, 49, 64 | `res.status(400/404)` | Bloquant (front) |
| B6 | `controllers/employeeControllers.js` | 49-51, 70 | garder `rows[0]` après contrôle de `rowCount` | Moyen |
| B7 | `controllers/employeeControllers.js` | 63 | `!age` → `age === undefined` | Mineur |
| C1 | `src/server.js` | 21 | `app.status` → `res.status` | Bloquant |
| C2 | `src/server.js` | 19 | `err.status \|\| 500` | Bloquant |
| C3 | `src/server.js` | 18-26 | handler d'erreur en dernier, 404 avant | Moyen |
| C4 | `src/server.js` | 30 | `export default app` | Bloquant (tests) |
| C5 | `src/server.js` | 28 | `if (NODE_ENV !== 'test')` autour du `listen` | Moyen |
| C6 | `src/server.js` | — | handler 404 JSON | Moyen |
| D1 | `package.json` / `db/` | 10 | recréer `schema.sql` + `db:init` | Outillage |
| D2 | `utils/connectDB.js` | 28 | `client.release()` | Fuite |
| D3 | `utils/connectDB.js` | 16, 30 | `process.exit(1)` | Mineur |
| D4 | `tests/health.test.js` | 7 | réécrire le test | Tests |
| E1 | `frontend/src/App.jsx` | — | écrire l'UI | À faire |
| E2 | `/index.html` | — | `git rm index.html` | Ménager |

---

# Vérification du SQL corrigé (A2, A3, A4, A5, A6)

Les trois requêtes corrigées ont été exécutées sur PostgreSQL 18.6 dans une transaction annulée.
**Ordre des paramètres utilisé : `[name, email, age, salary, role]` (+ `id` en dernier pour l'UPDATE) —
le même pour le CREATE et l'UPDATE** (voir A3-c).

Résultat réel :

```
✅ INSERT
   rows=[{"id":1,"name":"Ada","email":"ada@x.com","age":30,"role":"Developer","salary":"5000.00"}] rowCount=1
✅ UPDATE
   rows=[{"id":1,"name":"Ada L","email":"ada@x.com","age":31,"role":"Manager","salary":"6000.00"}] rowCount=1
✅ UPDATE partiel (email seul)
   rows=[{"id":1,"name":"Ada L","email":"ada.new@x.com","age":31,"role":"Manager","salary":"6000.00"}] rowCount=1
✅ DELETE
   rows=[{"id":1,"name":"Ada L","email":"ada.new@x.com","age":31,"role":"Manager","salary":"6000.00"}] rowCount=1

lignes restantes après DELETE = 0
```

Points validés :
- l'INSERT place bien `role` dans `role` et `salary` dans `salary` (mapping corrigé)
- l'UPDATE partiel préserve les champs non fournis (`COALESCE` fonctionne comme prévu)
- le DELETE supprime réellement la ligne (`rowCount = 1`) et renvoie la ligne supprimée

> ⚠️ **Le contrôleur doit passer les paramètres dans cet ordre exact.**
> `createEmployee` : `[name, email, age, salary, role]`
> `updateEmployee` : `[name, email, age, salary, role, id]` (déjà correct)

---

# Ce qui est déjà correct — ne pas y toucher

- `getEmployeeQuery` (`SELECT * ... WHERE id = $1`) ✅
- `getAllemployeeQuery` (`SELECT * FROM employee_details`) ✅
- `createEmployeeTableQuery` — le SQL est **valide** ✅
- L'idée de `COALESCE($n, colonne)` pour les mises à jour partielles ✅
- `RETURNING *` pour récupérer la ligne insérée / mise à jour ✅
- `requireEnvVars` dans `utils/connectDB.js` ✅
- `data.rows.length` dans `getEmployee` (ligne 34) ✅
- Le routage REST et l'ordre des verbes dans `routes/employeeRoutes.js` ✅
- `query` de `connectDB.js` renvoie bien le résultat `pg` complet (`rows` + `rowCount`) ✅
- La logique `to_regclass` comme garde de création ✅ (à déplacer, cf. D1)

---

# État de la base au moment du diagnostic

Table `employee_details` et type `role_type` **créés** (par le diagnostic, pas par ton code),
**0 ligne**. La table `items` de l'ancien schéma MySQL→PostgreSQL est également présente et vide.

```bash
psql -U crud -h localhost -d mon_crud -c "\dt"    # tables
psql -U crud -h localhost -d mon_crud -c "\dT"    # types
psql -U crud -h localhost -d mon_crud -c "TRUNCATE employee_details;"  # vider
```

---

# Analyse du 22/10 — 14:52 (état actuel)

Re-analyse complète après application des correctifs. 15 scénarios testés en exécution réelle.

## ✅ Ce qui marche maintenant

```
POST   /api/employee  (complet)              → 201 + la ligne créée
POST   /api/employee  (sans role)            → 201, role = "Intern" (COALESCE OK)
POST   /api/employee  (champs manquants)     → 400 {"error":"Missing required fields"}
GET    /api/employee                         → 200 + tableau JSON
GET    /api/employee/1                       → 200 + la ligne
GET    /api/employee/999                     → 404 {"error":"Employee record not found"}
PUT    /api/employee/1  (partiel)            → 200 + ligne mise à jour (COALESCE préserve les autres)
PUT    /api/employee/999                     → 404
DELETE /api/employee/2                       → 200 {"message":"Employee successfully deleted"}
DELETE /api/employee/2 (déjà supprimé)      → 404
```

Le mapping des paramètres est maintenant **cohérent** entre `CREATE` et `UPDATE` :
`[name, email, age, salary, role]` (+ `id` en dernier pour l'UPDATE). ✅

**L'injection SQL est bloquée** — les requêtes sont paramétrées :
`GET /api/employee/1 OR 1=1` → `syntaxe en entrée invalide pour le type integer`, pas d'exécution. ✅

## ❌ Bugs restants

### R1 — BLOQUANT : toutes les erreurs PostgreSQL partent en HTTP 200

`src/server.js:19`

```js
const statusCode = res.statusCode || 5000;
```

`res.statusCode` vaut **200 par défaut** dans Express → l'expression renvoie 200. Le `5000` est mort.
Vérifié : `res.statusCode par defaut = 200`.

6 scénarios sur 15 renvoient `{error: ...}` avec **status 200** au lieu de 4xx :

| Scénario | Status actuel | Status attendu |
|---|---|---|
| `salary` absent → NOT NULL | **200** | 400 |
| email en doublon → UNIQUE | **200** | 409 |
| `age < 18` → CHECK | **200** | 400 |
| `id` non numérique | **200** | 400 |
| `role` invalide → enum | **200** | 400 |
| body JSON invalide | **200** | 400 |

**Conséquence** : le frontend ne peut pas distinguer un succès d'une erreur. `axios` ne rejettera
jamais la promesse, l'erreur s'affichera comme un succès.

```js
// APRÈS
const statusCode = err.status || 500;
```

### R2 — BLOQUANT : `next(error.message)` perd le message d'erreur

`controllers/employeeControllers.js:26`

```js
// AVANT
  } catch (error) {
    next(error.message);
  }

// APRÈS
  } catch (error) {
    next(error)
  }
```

`next()` attend un objet `Error`. En lui passant une **chaîne**, le handler d'erreur reçoit la chaîne,
`err.message` vaut `undefined` → le message réel est perdu et remplacé par `'Internal server error'`.

Vérifié :
```
handler recoit: "VRAIE erreur SQL" | .message = undefined
-> status 200 | body {"error":"Internal server error"}
```

C'est la seule des 5 fonctions `catch` qui n'a pas été corrigée (les 4 autres font `next(error)`).

### R3 — BLOQUANT : `app` n'est toujours pas exporté → les 2 tests échouent

`src/server.js:30` — toujours pas de `export default app`.

```
TypeError: Cannot read properties of undefined (reading 'address')
 ❯ Test.serverAddress node_modules/supertest/lib/test.js:65:20
```

```js
// APRÈS (fin du fichier)
export default app
```

### R4 — BLOQUANT : `app.listen()` au top-level

`src/server.js:28-30`

Pendant `npm test`, l'import de `server.js` démarre un vrai serveur sur le port 4000
(visible dans la sortie vitest : `Server started on http://localhost:4000`).
Si ton `npm run dev` tourne déjà → **conflit de port**.

```js
// APRÈS
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log("Server started on http://localhost:" + port);
  })
}

export default app
```

+ dans `package.json` : `"test": "NODE_ENV=test vitest run --passWithNoTests"`

### R5 — MAJEUR : pas de handler 404 JSON

`src/server.js` — `GET /api/employee/inconnu/x` renvoie le **HTML** par défaut d'Express :

```html
<pre>Cannot GET /api/employee/inconnu/x</pre>
```

```js
// APRÈS — avant le handler d'erreur
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl })
})
```

### R6 — MAJEUR : les messages d'erreur PostgreSQL sont bruts et exposent l'internel

```
{"error":"la valeur d'une clé dupliquée rompt la contrainte unique « employee_details_email_key »"}
{"error":"une valeur NULL viole la contrainte NOT NULL de la colonne « salary » dans la relation « employee_details »"}
```

Trois problèmes : le message est en français de la DB, il fuite les noms de tables et de constraints,
et il n'y a pas de mapping vers un code HTTP. À mapper dans le handler d'erreur :

```js
const PG_ERRORS = {
  23505: [409, 'Email déjà utilisé'],
  23514: [400, 'Valeur invalide (contrainte CHECK)'],
  23502: [400, 'Champ obligatoire manquant'],
  22P02: [400, 'Format invalide (entier attendu)'],
  22001: [400, 'Valeur trop longue'],
}

app.use((err, req, res, next) => {
  if (err.code && PG_ERRORS[err.code]) {
    const [status, message] = PG_ERRORS[err.code]
    return res.status(status).json({ error: message })
  }
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})
```

### R7 — MAJEUR : `salary` n'est pas validé par le contrôleur

`controllers/employeeControllers.js:72` — tu valides `name`, `age`, `email` mais pas `salary` ni `role`.
`salary ?? null` (ligne 81) envoie `null` → PostgreSQL lève NOT NULL → erreur Postgres en 200.

```js
// APRÈS
if (!name || age == null || !email || salary == null) {
  return res.status(400).json({ error: "Missing required fields" });
}
```

Si `salary` doit être optionnel, change la colonne : `salary DECIMAL(8,2) NOT NULL DEFAULT 0`.

### R8 — MINEUR : `console.log(response)` à chaque GET

`controllers/employeeControllers.js:15` — journalise l'objet `pg` complet à chaque appel. À supprimer.

### R9 — MINEUR : fuite de connexion du pool (inchangé)

`utils/connectDB.js:28` — `db.connect()` acquire un client sans jamais le relâcher.

### R10 — MINEUR : `process.exit()` sans code (inchangé)

`utils/connectDB.js:16` — sort en 0, un échec est indiscernable d'un succès.

### R11 — MINEUR : le `GET` crée encore le schéma

`controllers/employeeControllers.js:14-20` — maintenant idempotent (`DO $$` + `IF NOT EXISTS`),
donc plus de blocage, mais c'est toujours un effet de bord sur une route de lecture. La source de
vérité du schéma devrait être `backend/db/schema.sql` + `npm run db:init` (cf. D1).

### R12 — MINEUR : `index.html` vide à la racine du dépôt

`/index.html` — 0 octet, commité. `git rm index.html`.

### R13 — MAJEUR : le frontend n'a pas commencé

`frontend/src/App.jsx` est toujours le template Vite. `axios` et `src/api/client.js` sont installés
mais **importés nulle part** (vérifié par grep). Aucune requête n'est émise.

## Tableau de bord

| | Initial | Actuel | Objectif |
|---|---|---|---|
| Endpoints qui répondent | 0/5 | **5/5** ✅ | 5/5 |
| `npm test` | 2 échecs | 2 échecs | ✅ 0 échec |
| Erreurs en 4xx | 0% | 0% | 100% |
| Injection SQL | bloquée ✅ | bloquée ✅ | bloquée |
| Frontend | 0% | 0% | — |

**Il reste 4 corrections pour que le backend soit propre** (R1, R2, R3, R4) —
toutes dans `src/server.js` et une ligne dans le contrôleur.
