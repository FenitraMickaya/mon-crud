import { QueryClient } from '@tanstack/react-query'

/**
 * Instance unique de QueryClient.
 *
 * Elle est importée par main.jsx (qui la fournit via QueryClientProvider)
 * ET par les composants qui invalident le cache. Si deux instances coexistent,
 * invalidateQueries() ne rafraîchit rien : c'est l'erreur qui faisait que la
 * table ne se mettait jamais à jour après un ajout ou une modification.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})

/** Clé de cache unique pour la liste des employés. */
export const EMPLOYEES_KEY = ['employes']
