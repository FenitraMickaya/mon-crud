import axios from 'axios'

// En dev, Vite redirige /api vers le backend (voir vite.config.js).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Intercepteur d'erreur : normalise le message d'erreur de l'API.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.statusText ||
      error.message ||
      'Une erreur est survenue'
    error.userMessage = message
    return Promise.reject(error)
  },
)
