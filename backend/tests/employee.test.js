import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import app from '../src/server.js'
import { pool } from '../utils/connectDB.js'

const uniqueEmail = `test-${Date.now()}@exemple.fr`

afterAll(async () => {
  await pool.query('DELETE FROM employee_details WHERE email = $1', [uniqueEmail])
  await pool.end()
})

describe('API Employés', () => {
  it('liste les employés', async () => {
    const res = await request(app).get('/api/employee')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('renvoie 404 JSON sur une route inconnue', async () => {
    const res = await request(app).get('/api/inexistant')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Ressource introuvable.')
  })

  it('crée un employé', async () => {
    const res = await request(app).post('/api/employee').send({
      name: 'Camille Test',
      email: uniqueEmail,
      age: 30,
      salary: 4200,
      role: 'Developer',
    })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      name: 'Camille Test',
      email: uniqueEmail,
      age: 30,
      role: 'Developer',
    })
    expect(Number(res.body.salary)).toBe(4200)
  })

  it('refuse un email déjà utilisé avec un 409', async () => {
    const res = await request(app).post('/api/employee').send({
      name: 'Doublon',
      email: uniqueEmail,
      age: 30,
      salary: 1000,
      role: 'Intern',
    })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/déjà/i)
  })

  it('refuse les champs manquants avec un 400 et le détail par champ', async () => {
    const res = await request(app).post('/api/employee').send({ name: 'Sans rien' })

    expect(res.status).toBe(400)
    expect(res.body.fields).toHaveProperty('email')
    expect(res.body.fields).toHaveProperty('age')
    expect(res.body.fields).toHaveProperty('salary')
  })

  it('refuse un âge inférieur à 18 ans', async () => {
    const res = await request(app).post('/api/employee').send({
      name: 'Mineur',
      email: `mineur-${Date.now()}@exemple.fr`,
      age: 12,
      salary: 100,
    })

    expect(res.status).toBe(400)
    expect(res.body.fields.age).toMatch(/18/)
  })

  it('refuse un rôle hors de l’énumération', async () => {
    const res = await request(app).post('/api/employee').send({
      name: 'Role Invalide',
      email: `role-${Date.now()}@exemple.fr`,
      age: 30,
      salary: 100,
      role: 'HR',
    })

    expect(res.status).toBe(400)
    expect(res.body.fields.role).toBeTruthy()
  })

  it('met à jour un employé sans écraser les autres champs', async () => {
    const list = await request(app).get('/api/employee')
    const target = list.body.find((e) => e.email === uniqueEmail)

    const res = await request(app)
      .put(`/api/employee/${target.id}`)
      .send({ name: 'Camille Modifiée' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Camille Modifiée')
    expect(res.body.email).toBe(uniqueEmail)
    expect(res.body.role).toBe('Developer')
  })

  it('renvoie 404 pour un identifiant inconnu', async () => {
    const res = await request(app).get('/api/employee/99999999')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Employé introuvable.')
  })

  it('supprime un employé', async () => {
    const list = await request(app).get('/api/employee')
    const target = list.body.find((e) => e.email === uniqueEmail)

    const res = await request(app).delete(`/api/employee/${target.id}`)
    expect(res.status).toBe(200)

    const after = await request(app).get(`/api/employee/${target.id}`)
    expect(after.status).toBe(404)
  })
})
