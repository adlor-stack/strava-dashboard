import cookie from 'cookie';

function parseSession(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const raw = cookies.strava_session;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function setSessionCookie(res, session) {
  const encoded = Buffer.from(JSON.stringify(session)).toString('base64');
  res.setHeader(
    'Set-Cookie',
    cookie.serialize('strava_session', encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
  );
}

async function refreshAccessToken(session) {
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: session.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await r.json();
  if (!data.access_token) throw new Error('Refresh failed');
  return {
    ...session,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || session.refreshToken,
    expiresAt: data.expires_at,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  let session = parseSession(req);

  if (!session) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  // Rafraîchir le token si expiré (marge 60s)
  if (Date.now() / 1000 > session.expiresAt - 60) {
    try {
      session = await refreshAccessToken(session);
      setSessionCookie(res, session);
    } catch (err) {
      return res.status(401).json({ error: 'Token expiré, reconnecte-toi.' });
    }
  }

  // Endpoint demandé (ex: /api/strava?path=/athlete/activities&per_page=100)
  const { path, ...params } = req.query;
  if (!path) return res.status(400).json({ error: 'Paramètre path manquant' });

  const url = new URL(`https://www.strava.com/api/v3${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const stravaRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const data = await stravaRes.json();
    res.status(stravaRes.status).json(data);
  } catch (err) {
    console.error('Strava proxy error:', err);
    res.status(500).json({ error: 'Erreur Strava' });
  }
}
