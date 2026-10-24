import pg from 'pg'
import env from 'dotenv'

env.config()

const requireEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
]

const missing = requireEnvVars.filter((name) => !process.env[name])

if (missing.length > 0) {
  console.error(
    `Variable(s) d'environnement manquante(s) : ${missing.join(', ')}. Copiez .env.example vers .env.`,
  )
  process.exit(1)
}

export const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

// Vérifie la connexion au démarrage, sans retaining un client du pool.
try {
  await pool.query('SELECT 1')
  console.log('✅ Connexion à PostgreSQL établie')
} catch (err) {
  console.error('❌ Connexion à PostgreSQL impossible :', err.message)
  process.exit(1)
}

// Un client qui tombe du pool ne doit pas tuer le process.
pool.on('error', (err) => {
  console.error('Erreur du pool PostgreSQL :', err.message)
})

/**
 * Exécute une requête SQL et renvoie le résultat complet de `pg`
 * ({ rows, rowCount, ... }).
 */
export const query = (text, params) => pool.query(text, params)
