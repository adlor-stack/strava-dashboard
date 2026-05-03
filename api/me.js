import cookie from 'cookie';

export default function handler(req, res) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const raw = cookies.strava_session;

  if (!raw) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const session = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    res.json({
      authenticated: true,
      athlete: session.athlete,
      expiresAt: session.expiresAt,
    });
  } catch {
    res.status(401).json({ authenticated: false });
  }
}
