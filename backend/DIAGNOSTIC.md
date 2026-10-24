# Diagnostic — `mon-crud`

Rapports d'analyse successifs, chacun validé par exécution réelle.

| Date | Portée | Verdict |
|---|---|---|
| 22/10 — 14:52 | Backend | 14 corrections sur 17 appliquées. CRUD fonctionnel, 4 bugs bloquants restants |
| 23/10 — 19:10 | Backend + Frontend | Frontend créé (React Query + Tailwind 4). **8 nouveaux bugs**, dont 3 fonctionnels bloquants |
| 23/10 — 20:15 | Backend + Frontend | **Les 8 bugs frontend et les 12 rappels backend sont corrigés.** 4 nouveaux bugs trouvés à l'exécution, dont 2 qui cassaient le bouton « Ajouter » |

---

# Analyse du 23/10 — 20:15 — état final

## Ce qui a été corrigé

### Backend — les 12 rappels (R1 → R12) sont tous appliqués

| ID | Correction appliquée | Fichier |
|---|---|---|
| R1 | `res.status(err.status \|\| 500)` — le status n'est plus écrasé par 5000 | `src/server.js` |
| R2 | `next(error)` au lieu de `next(error.message)` — le message PG est conservé | `controllers/employeeControllers.js` |
| R3 | `export default app` | `src/server.js` |
| R4 | `app.listen()` conditionné à `NODE_ENV !== 'test'` | `src/server.js` |
| R5 | handler 404 JSON (au lieu du HTML Express) | `src/server.js` |
| R6 | mapping `err.code` PostgreSQL → statut HTTP + message français | `src/server.js` |
| R7 | validation `salary` et `role` **avant** l'écriture → 400 clair | `controllers/employeeControllers.js` |
| R8 | `console.log(response)` supprimé | `controllers/employeeControllers.js` |
| R9 | `client.release()` après le test de connexion | `utils/connectDB.js` |
| R10 | `process.exit(1)` avec un code | `utils/connectDB.js` |
| R11 | le schéma n'est plus créé par le `GET` — source unique `db/schema.sql` | `utils/schema.js` |
| R12 | `index.html` vide supprimé | racine |

### Frontend — les 8 bugs (F1 → F8) sont tous appliqués

| ID | Correction appliquée | Fichier |
|---|---|---|
| F1 | **une seule instance** de `QueryClient`, importée par `main.jsx` et par les composants | `utils/queryClients.js` |
| F2 | mutation `DELETE` fonctionnelle, précédée d'une fenêtre de confirmation | `App.jsx`, `components/ConfirmDialog.jsx` |
| F3 | `<Toaster />` monté | `main.jsx` |
| F4 | le select « rôle » suit l'enum PostgreSQL (`Developer`, `Manager`, `Sales`, `Admin`, `Intern`) | `api/config.js` |
| F5 | `ORDER BY id` sur la liste | `utils/sqlQuery.js` |
| F6 | URL sortie de `App.jsx` → `/api/employee`, plus d'import circulaire | `api/config.js` |
| F7 | `import React` inutile supprimé | `components/EmployeeTable.jsx` |
| F8 | `axios`, `lucide-react`, `react-router-dom` désinstallés ; `api/client.js` orphelin supprimé | `package.json` |

## Les 4 bugs trouvés pendant la vérification finale

### 🔴 N1 — le bouton « Ajouter » ne déclenchait rien quand un champ obligatoire manquait

**Cause** : à la sortie d'un champ, le message d'erreur apparaissait et **décalait la mise en page**.
Le bouton d'enregistrement bougeait entre le `mousedown` et le `mouseup` : le `click` partait sur le
`<footer>` et aucun événement `submit` n'était émis. La saisie était donc silencieusement ignorée.

Preuve (événements capturés au niveau du `document`) :
```
>> MOUSEDOWN sur BUTTON.rounded-lg bg-blue-600
>> FOCUSOUT employee-age
>> CLICK sur FOOTER.flex items-center justify-end      ← le bouton n'est plus sous le curseur
(aucun >> SUBMIT)
```

**Correctif** : la place du message d'erreur est réservée en permanence (`min-h-[1.25rem]`),
la mise en page ne bouge plus à l'apparition de l'erreur.

### 🔴 N2 — le toast de suppression affichait « undefined »

**Cause** : `useMutation` reçoit en 2ᵉ argument de `onSuccess` les **variables de la mutation**.
La mutation prenait un `id`, donc `employee.name` était `undefined`.

**Correctif** : la mutation prend l'objet employé (`mutationFn: (employee) => deleteEmployee(employee.id)`).

### 🟠 N3 — l'annulation de suppression ne s'affichait pas

**Cause** : `react-hot-toast` 2.6.1 n'a **pas** d'option `action` dans `ToastOptions` — elle est
silencieusement ignorée. (Et les toasts `custom` sont rendus sans le `ToastBar`, donc sans
`role="status"`.)

**Correctif** : la suppression demande désormais une **fenêtre de confirmation** explicite
(`<dialog>` natif, bouton « Supprimer » rouge, bouton « Annuler », focus sur « Annuler »,
fermeture par Échap).

### 🟠 N4 — le focus ne partait pas sur le premier champ invalide

**Cause** : `setErrors()` n'a pas encore reflété `aria-invalid` dans le DOM au moment de la
sélection `[aria-invalid="true"]`. Le champ visé n'était pas trouvé.

**Correctif** : le premier champ invalide est calculé à partir de `nextErrors` puis ciblé par son `id`.

## Périmètre de l'interface — CRUD simple

L'application est un **CRUD simple**, pas un outil de gestion d'employé. La couche « gestion »
a donc été retirée de l'interface :

| Retiré | Raison |
|---|---|
| `components/StatsBar.jsx` (effectif, masse salariale, salaire médian) | tableau de bord RH, pas du CRUD |
| champ de recherche | hors du périmètre CRUD demandé |
| filtre par rôle + état « aucun résultat » | segmentation de l'effectif, hors périmètre |
| ligne de total du tableau (`Total · N employés` + somme des salaires) | agrégat de masse salariale |

L'écran final tient en trois blocs : **titre + bouton d'ajout**, **carte « Liste des employés » avec
le compteur**, **table avec modification et suppression**.

## Vérification finale

| Contrôle | Résultat |
|---|---|
| `backend` — `npm test` | ✅ 10 tests passés |
| `frontend` — `npx eslint .` | ✅ 0 erreur |
| `frontend` — `npx vite build` | ✅ 291 Ko / 89,9 Ko gzip |
| Parcours navigateur (Playwright) | ✅ **19/19** vérifications passées |
| Erreurs JavaScript console | ✅ aucune |
| Contraste WCAG AA (mesure composée, 4,5:1) | ✅ aucun texte hors seuil |

---

# Analyse du 23/10 — 19:10

## État général

Le frontend a été écrit (TanStack Query 5, Tailwind 4, `react-hot-toast`, `react-icons`).
Build Vite OK, ESLint : 1 erreur. Backend : inchangé depuis le 22/10.

**Vérifié en exécution réelle** (API + navigateur Playwright) :

| Scénario UI | Résultat |
|---|---|
| Affichage de la table | ✅ 6 lignes, tri non garanti |
| Ouverture modale Add | ✅ |
| Ouverture modale Edit | ✅ pré-remplissage correct (nom, salaire `"1234.56"`) |
| **Ajout d'un employé** | ⚠️ **la ligne est créée en base mais la table ne se rafraîchit pas** |
| **Modification d'un employé** | ⚠️ **la ligne est modifiée en base mais la table ne se rafraîchit pas** |
| **Suppression** | ❌ **bouton inerte, rien ne se passe** |
| Choix du rôle « HR » | ❌ **rejeté par PostgreSQL** |
| Notifications | ❌ **aucune n'apparaît** |
| Erreurs JS console | aucune |

## 🔴 F1 — La liste ne se rafraîchit jamais après un ajout ou une modification

**Le bug le plus important du projet.**

`src/utils/queryClients.js` crée un `QueryClient` :
```js
export const queryClient = new QueryClient()
```

`src/main.jsx` en crée **un autre** et le passe au provider :
```js
const queryClient = new QueryClient()          // ← une 2e instance
createRoot(...).render(
  <QueryClientProvider client={queryClient}>    // ← celle-ci fait foi
```

`EmployeeModel.jsx:5` invalide la **mauvaise** instance :
```js
import { queryClient } from '../utils/queryClients'   // ← instance orpheline
...
queryClient.invalidateQueries({ queryKey: ['employee_details'] })
```

`useQuery` / `useMutation` utilisent le client du **context** (le bon). Mais l'invalidation porte sur
l'instance orpheline → **elle neRafraîchit rien**.

Preuve (Playwright, requêtes réseau capturées) :
```
POST http://localhost:4000/api/employee        → 201   (créé en base ✓)
lignes au tableau : 8  →  lignes après ajout : 8      (pas de rafraîchissement ✗)

PUT http://localhost:4000/api/employee/8       → 200   {"id":8,"name":"UPDATED-..."}  (modifié ✓)
1ere ligne affichee : "8  Nanoa  ..."   →   après : "8  Nanoa  ..."   (toujours l'ancien nom ✗)
```

**Correctif** — une seule instance, importée partout :

```js
// src/utils/queryClients.js
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
})
```

```jsx
// src/main.jsx
import { queryClient } from './utils/queryClients'
// ...
<QueryClientProvider client={queryClient}>
```

```jsx
// src/components/EmployeeModel.jsx  (déjà correct)
import { queryClient } from '../utils/queryClients'
```

Alternative encore plus simple : supprimer `src/utils/queryClients.js` et utiliser le hook
`useQueryClient()` dans les composants :
```jsx
import { useQueryClient } from '@tanstack/react-query'
const queryClient = useQueryClient()
```

---

## 🔴 F2 — Le bouton DELETE ne fait rien

`src/components/EmployeeTable.jsx:67-69`

```jsx
onClick={() => {
  // Ajouter ici la mutation de suppression
}}
```

Le CRUD n'a donc que 3 opérations sur 4. Le backend `DELETE /api/employee/:id` fonctionne (vérifié :
`200 {"message":"Employee successfully deleted"}`).

**Correctif** :
```jsx
const deleteMutation = useMutation({
  mutationFn: async (id) => {
    const res = await fetch(`${backendUrl}/${id}`, { method: 'DELETE' })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Unable to delete employee')
    return result
  },
  onSuccess: () => {
    toast.success('Employee deleted successfully')
    queryClient.invalidateQueries({ queryKey: ['employee_details'] })
  },
  onError: (err) => toast.error(err.message),
})
```
Et sur le bouton : `onClick={() => deleteMutation.mutate(item.id)}`.

> ⚠️ Prévoir une **confirmation** avant suppression — un clic suffit sinon à perdre une ligne.

---

## 🔴 F3 — Aucune notification ne s'affiche

`react-hot-toast` est installé et appelé (`toast.success(...)`, `toast.error(...)`) mais **`<Toaster />`
n'est monté nulle part** :

```
grep -rn "Toaster" src/  →  ABSENT
```

Sans le composant `<Toaster />`, les toasts sont créés dans le store mais **jamais rendus dans le DOM**.
Conséquence : l'utilisateur ne reçoit aucun retour sur une création, une modification ou une erreur.

```jsx
// src/main.jsx
import { Toaster } from 'react-hot-toast'
// ...
<QueryClientProvider client={queryClient}>
  <App />
  <Toaster position="top-right" />
</QueryClientProvider>
```

Vérifié : `elements toast dans le DOM : 0` après un ajout réussi.

---

## 🔴 F4 — Le rôle « HR » offered par le select n'existe pas dans l'enum

`src/components/EmployeeModel.jsx:191-197`

```jsx
<option value="">Select role</option>
<option value="HR">HR</option>          {/* ← pas dans l'enum */}
<option value="Developer">Developer</option>
<option value="Manager">Manager</option>
<option value="Sales">Sales</option>
<option value="Intern">Intern</option>
  {/* ← « Admin » manque, alors qu'il EST dans l'enum */}
```

Enum PostgreSQL : `Developer, Manager, Sales, Admin, Intern`

Choisir « HR » →
```json
{"error":"valeur en entrée invalide pour le enum role_type : « HR »"}
```
Et comme l'erreur part en **HTTP 200** (bug R1 côté backend), le toast affiche... rien (F3).

**Correctif** — aligner le select sur l'enum :
```jsx
{['Developer', 'Manager', 'Sales', 'Admin', 'Intern'].map((r) => (
  <option key={r} value={r}>{r}</option>
))}
```
Et côté backend, valider le rôle avant la requête pour renvoyer un 400 clair (cf. R7).

---

## 🟠 F5 — L'ordre des lignes n'est pas garanti

`backend/utils/sqlQuery.js:22-24`

```sql
SELECT * FROM employee_details     -- pas de ORDER BY
```

PostgreSQL renvoie les lignes dans l'ordre physique du tas, pas dans l'ordre d'insertion. Après un
`UPDATE`, PostgreSQL **déplace** la ligne dans le tas → elle change de place dans le tableau.

Preuve : après un update, la réponse de l'API ne commence plus par la même ligne.
Ordre observé au chargement : `["9","11","12","10","45","46","6","47","7","8"]` — ni trié par id,
ni trié par insertion.

**Correctif** :
```sql
SELECT * FROM employee_details ORDER BY id
```

---

## 🟠 F6 — URL de l'API codée en dur + dépendance circulaire

`src/App.jsx:5`
```js
export const backendUrl = 'http://localhost:4000/api/employee'
```

- **URL absolue** : le front calling `http://localhost:4000` directement. Le proxy `/api` configuré dans
  `vite.config.js:11-16` est donc **inutilisé**. En build de production, le front déployé essaierait de
  joindre le `localhost:4000` **du navigateur de l'utilisateur** → l'app ne fonctionne pas déployée.
- **Dépendance circulaire** : `App.jsx` importe `EmployeeModel`, et `EmployeeModel.jsx:4` importe
  `{ backendUrl } from '../App'`. Ça fonctionne grâce aux live bindings ESM, mais c'est fragile.

**Correctif** — sortir l'URL dans un module dédié et utiliser le proxy :
```js
// src/api/config.js
export const backendUrl = '/api/employee'
```
Le proxy Vite renvoie déjà `/api` → `http://localhost:4000` en dev.
En production, définir `VITE_API_URL` via `import.meta.env`.

---

## 🟠 F7 — ESLint : 1 erreur

```
src/components/EmployeeTable.jsx
  1:8  error  'React' is defined but never used  no-unused-vars
```
React 19 + le nouveau transform JSX n'a plus besoin de `import React`.

## 🟠 F8 — Dépendances installées mais inutilisées

`axios`, `lucide-react` et `react-router-dom` sont dans `frontend/package.json` mais **importés nulle part**.
`src/api/client.js` (créé pour axios) est un fichier orphelin :
```
grep -rn "api/client" src/  →  NON UTILISE
```
Le code utilise `fetch` et `react-icons`. Soit on utilise ces libs, soit on les retire du `package.json`.

---

# 🟡 Rappels — bugs backend toujours ouverts (22/10)

Ces 4 bugs n'ont pas été corrigés et **se combinent maintenant avec les bugs frontend**.

| ID | Fichier | Ligne | Problème |
|---|---|---|---|
| **R1** | `backend/src/server.js` | 19 | `res.statusCode \|\| 5000` → `res.statusCode` vaut 200 par défaut → **toutes les erreurs PG partent en HTTP 200** |
| **R2** | `backend/controllers/employeeControllers.js` | 26 | `next(error.message)` → le message réel est perdu (`err.message` vaut `undefined`) |
| **R3** | `backend/src/server.js` | 30 | pas de `export default app` → **les 2 tests vitest échouent** (`Cannot read properties of undefined`) |
| **R4** | `backend/src/server.js` | 28 | `app.listen()` au top-level → démarre un vrai serveur pendant les tests |
| R5 | `backend/src/server.js` | — | pas de handler 404 JSON (Express renvoie du HTML) |
| R6 | `backend/src/server.js` | 18 | messages d'erreur PostgreSQL bruts, en français de la DB, fuite des noms de tables/contraintes ; pas de mapping `err.code` → status |
| R7 | `backend/controllers/employeeControllers.js` | 72 | `salary` et `role` ne sont pas validés → erreurs PG au lieu d'un 400 clair |
| R8 | `backend/controllers/employeeControllers.js` | 15 | `console.log(response)` journalise l'objet `pg` complet à chaque GET → **le log est noyé** (plusieurs Ko) |
| R9 | `backend/utils/connectDB.js` | 28 | `db.connect()` sans `client.release()` → fuite de connexion |
| R10 | `backend/utils/connectDB.js` | 16 | `process.exit()` sans code → sortie 0 |
| R11 | `backend/controllers/employeeControllers.js` | 14-20 | le `GET` crée encore le schéma (effet de bord sur une route de lecture) |
| R12 | `/index.html` | — | fichier vide de 0 octet à la racine du dépôt → `git rm index.html` |

### Impact de R1 sur le frontend

C'est ce qui rend F4 invisible : le select « HR » produit bien une erreur, mais elle arrive avec un
**status 200**. Le `if (!res.ok)` du front ne se déclenche jamais.

Correction backend :
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

---

# Accessibilité de la modale — à améliorer

| Point | Constat |
|---|---|
| `role="dialog"` / `aria-modal` | ❌ absents |
| Fermeture au clavier (Échap) | ❌ non gérée |
| Piège de focus (focus trap) | ❌ absent — le focus peut sortir de la modale |
| Focus à l'ouverture | ❌ pas déplacé sur le premier champ |
| Restitution du focus à la fermeture | ❌ absente |
| `aria-label` du backdrop | un `<button>` pleine page dans l'ordre de tabulation, étiqueté « Close modal » — sémantique bancale |

`EmployeeModel.jsx:124-131` :
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <button type="button" aria-label="Close modal" onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/40" />
```
Le backdrop devrait être un `<div aria-hidden="true">` avec un `onClick` sur le conteneur, et la modale
devrait porter `role="dialog" aria-modal="true" aria-labelledby="..."`.

---

# Ce qui est bon

- Le **build Vite** passe (`274 Ko`, 2.85 s) ✅
- La structure des composants est propre : `App` / `EmployeeTable` / `EmployeeModel` ✅
- Les états de chargement et d'erreur de `useQuery` sont gérés (`isPending`, `isError`) ✅
- `useMutation` avec `onSuccess` / `onError` / `isPending` → bouton désactivé pendant l'envoi ✅
- La validation client avant envoi (`handleFormSubmission`) ✅
- L'invalidation de cache est **correctement écrite** — c'est juste l'instance visée qui est mauvaise (F1) ✅
- Le pré-remplissage du formulaire d'édition fonctionne (`"Y"`, `"1234.56"`) ✅
- `queryKey: ['employee_details']` est cohérent partout ✅
- L'injection SQL est bloquée côté backend (requêtes paramétrées) ✅
- Le proxy Vite `/api` est correctement configuré (mais inutilisé, cf. F6) ✅
- `index.html` vide supprimé ✅ (`git status` ne le montre plus)

---

# Plan de correction

**Frontend (priorité)**
1. **F1** — une seule instance de `QueryClient` → le rafraîchissement marche
2. **F3** — monter `<Toaster />` → les retours utilisateur apparaissent
3. **F2** — implémenter la mutation DELETE (+ confirmation)
4. **F4** — aligner le select sur l'enum PostgreSQL
5. **F5** — `ORDER BY id` dans la requête de liste
6. **F6** — sortir `backendUrl` dans `src/api/config.js` et passer par `/api/employee`
7. **F7/F8** — corriger l'import React inutile ; nettoyer les deps non utilisées

**Backend**
8. **R1/R2/R3/R4** — `server.js` (4 lignes) + `next(error)` dans le contrôleur
9. **R6/R7** — mapping des erreurs PostgreSQL + validation de `salary`/`role`
10. **R8** — supprimer le `console.log(response)`

**Accessibilité**
11. `role="dialog"`, `aria-modal`, gestion d'Échap, focus trap, focus à l'ouverture
