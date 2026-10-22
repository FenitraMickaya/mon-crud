// Applique db/schema.sql sur la base configurée dans .env
// Usage : npm run db:init
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  await client.connect()
  try {
    await client.query(sql)
    console.log(`✅ Schéma appliqué sur ${process.env.DB_NAME}`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('❌ Échec de l\'application du schéma :', err.message)
  process.exit(1)
})
