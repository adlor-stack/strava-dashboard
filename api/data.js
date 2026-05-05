import cookie from 'cookie';

const KV_URL   = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

function parseSession(req) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const raw = cookies.strava_session;
    if (!raw) return null;
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch { return null; }
}

async function kvGet(athleteId, key) {
  const url = `${KV_URL}/get/${encodeURIComponent(athleteId + ':' + key)}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  if (!r.ok) throw new Error(`KV GET ${r.status}`);
  const data = await r.json();
  if (data.result === null || data.result === undefined) return null;
  // Upstash peut retourner string ou objet selon ce qui a été stocké
  if (typeof data.result === 'string') {
    try { return JSON.parse(data.result); } catch { return data.result; }
  }
  return data.result; // déjà objet
}

async function kvSet(athleteId, key, value) {
  // Upstash REST API : POST /set/key avec le body = la valeur en JSON string
  const url = `${KV_URL}/set/${encodeURIComponent(athleteId + ':' + key)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    // Upstash attend le body comme ["SET", "key", "value"] OU via REST direct
    // Format REST direct : body = valeur sérialisée
    body: JSON.stringify(value)  // Upstash stocke la valeur sérialisée
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`KV SET ${r.status}: ${err}`);
  }
  return r.json();
}

export default async function handler(req, res) {
  // Log pour debug
  console.log(`[data] ${req.method} ${req.url}`);
  console.log('[data] KV_URL:', KV_URL ? 'défini' : 'MANQUANT');
  console.log('[data] KV_TOKEN:', KV_TOKEN ? 'défini' : 'MANQUANT');

  const session = parseSession(req);
  if (!session || !session.athlete?.id) {
    console.log('[data] Session invalide');
    return res.status(401).json({ error: 'Non authentifié' });
  }
  const athleteId = String(session.athlete.id);
  console.log('[data] athleteId:', athleteId);

  if (req.method === 'GET') {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'key manquant' });
    try {
      const value = await kvGet(athleteId, key);
      console.log('[data] GET', key, '→', value !== null ? 'trouvé' : 'null');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      return res.status(200).json({ key, value });
    } catch (e) {
      console.error('[data] GET error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
    const { key, value } = body || {};
    if (!key) return res.status(400).json({ error: 'key manquant' });
    try {
      await kvSet(athleteId, key, value);
      console.log('[data] SET', key, '→ ok');
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[data] SET error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Méthode non supportée' });
}
