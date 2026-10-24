import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import employeeRoutes from '../routes/employeeRoutes.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 4000

app.use(express.json())
app.use(cors({ origin: '*' }))

app.use('/api/employee', employeeRoutes)

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API mon-crud' })
})


app.use((req, res) => {
  res.status(404).json({ error: 'Ressource introuvable.', path: req.originalUrl })
})


const PG_ERRORS = {
  '23505': [409, 'Un employé utilise déjà cette adresse email.'],
  '23514': [400, "La valeur refusée par une contrainte de l'employé."],
  '23502': [400, 'Un champ obligatoire est manquant.'],
  '22P02': [400, 'Identifiant ou valeur numérique invalide.'],
  '22001': [400, 'Une valeur dépasse la longueur maximale autorisée.'],
}


app.use((err, req, res, next) => {
  if (err.code && PG_ERRORS[err.code]) {
    const [status, message] = PG_ERRORS[err.code]
    return res.status(status).json({ error: message })
  }

  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Erreur interne du serveur.' })
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${port}`)
  })
}

export default app
