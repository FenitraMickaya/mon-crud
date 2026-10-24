import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './connectDB.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = path.join(dirname, '..', 'db', 'schema.sql')

let promise = null

/**
 * Applique le schéma une seule fois par process.
 * Le schéma est idempotent (IF NOT EXISTS), la sécurité est donc assurée.
 */
export function ensureSchema() {
  if (!promise) {
    const sql = fs.readFileSync(SCHEMA_PATH, 'utf8')
    promise = pool.query(sql).catch((err) => {
      // On réinitialise pour permettre une nouvelle tentative
      promise = null
      throw err
    })
  }
  return promise
}
