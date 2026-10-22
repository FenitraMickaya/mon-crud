import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/server.js'

describe('API — health', () => {
  it('répond ok et confirme l’accès à la base', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.database).toBe(true)
  })

  it('renvoie un 404 JSON sur une route inconnue', async () => {
    const res = await request(app).get('/api/inexistant')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })
})
