// GET /api/data?key=xxx → lire une valeur
// POST /api/data { key, value } → écrire une valeur

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
  const r = await fetch(`${KV_URL}/get/${athleteId}:${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  const data = await r.json();
  if (data.result === null || data.result === undefined) return null;
  try { return JSON.parse(data.result); } catch { return data.result; }
}

async function kvSet(athleteId, key, value) {
  const r = await fetch(`${KV_URL}/set/${athleteId}:${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value))
  });
  return r.json();
}

export default async function handler(req, res) {
  const session = parseSession(req);
  if (!session || !session.athlete?.id) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  const athleteId = session.athlete.id;

  if (req.method === 'GET') {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'key manquant' });
    const value = await kvGet(athleteId, key);
    return res.status(200).json({ key, value });
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
    const { key, value } = body || {};
    if (!key) return res.status(400).json({ error: 'key manquant' });
    await kvSet(athleteId, key, value);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Méthode non supportée' });
}
