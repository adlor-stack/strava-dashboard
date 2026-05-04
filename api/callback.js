import cookie from 'cookie';

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect('/?error=access_denied');
  }

  try {
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const data = await tokenRes.json();

    if (!data.access_token) {
      console.error('Token exchange failed:', data);
      return res.redirect('/?error=token_exchange');
    }

    const session = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      athlete: {
        id: data.athlete.id,
        firstname: data.athlete.firstname,
        lastname: data.athlete.lastname,
        profile: data.athlete.profile_medium,
      },
    };

    const encoded = Buffer.from(JSON.stringify(session)).toString('base64');

    // Détecter si on est en HTTPS via les headers de Vercel
    const isHttps = req.headers['x-forwarded-proto'] === 'https' ||
                    process.env.VERCEL_ENV === 'production' ||
                    process.env.VERCEL_ENV === 'preview';

    res.setHeader(
      'Set-Cookie',
      cookie.serialize('strava_session', encoded, {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
    );

    res.redirect('/');
  } catch (err) {
    console.error('Callback error:', err);
    res.redirect('/?error=server_error');
  }
}
