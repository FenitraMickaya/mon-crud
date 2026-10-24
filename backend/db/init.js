// Applique db/schema.sql sur la base configurée dans .env
// Usage : npm run db:init
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Client } from 'pg'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const sql = fs.readFileSync(path.join(dirname, 'schema.sql'), 'utf8')

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

try {
  await client.connect()
  await client.query(sql)
  console.log(`✅ Schéma appliqué sur « ${process.env.DB_NAME} »`)
} catch (err) {
  console.error("❌ Échec de l'application du schéma :", err.message)
  process.exit(1)
} finally {
  await client.end()
}
