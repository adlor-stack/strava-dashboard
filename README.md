# Strava Dashboard

Dashboard personnel Strava, déployable sur Vercel en 5 minutes.

## Déploiement

### 1. Créer l'app Strava

Va sur https://www.strava.com/settings/api et crée une application.

- **Authorization Callback Domain** : ton-projet.vercel.app  
  (ou `localhost` pour tester en local)

Note ton **Client ID** et **Client Secret**.

### 2. Déployer sur Vercel

```bash
npm i -g vercel
vercel
```

Ou connecte le repo sur https://vercel.com/new.

### 3. Ajouter les variables d'environnement

Dans **Vercel > Settings > Environment Variables**, ajoute :

| Variable | Valeur |
|----------|--------|
| `STRAVA_CLIENT_ID` | ton Client ID |
| `STRAVA_CLIENT_SECRET` | ton Client Secret |
| `STRAVA_REDIRECT_URI` | `https://ton-projet.vercel.app/api/callback` |
| `NODE_ENV` | `production` |

### 4. Retourner dans l'app Strava

Remets l'URL de callback exacte :
```
https://ton-projet.vercel.app/api/callback
```

### Tester en local

```bash
npm install
STRAVA_CLIENT_ID=xxx STRAVA_CLIENT_SECRET=yyy STRAVA_REDIRECT_URI=http://localhost:3000/api/callback vercel dev
```

## Architecture

```
/api/login.js      → redirige vers Strava OAuth
/api/callback.js   → reçoit le code, échange les tokens, stocke en cookie
/api/me.js         → renvoie le profil depuis le cookie (pas d'appel Strava)
/api/strava.js     → proxy authentifié vers l'API Strava (rafraîchit le token si besoin)
/api/logout.js     → efface le cookie
/public/index.html → le dashboard complet
```

Les tokens ne sont jamais exposés au client JS. Tout passe par les API routes Vercel.

## Partage

Chaque utilisateur (toi + ton ami) se connecte avec **son propre compte Strava**.  
Les sessions sont indépendantes via cookie HttpOnly.
