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

    // Stocker les tokens dans un cookie signé HttpOnly
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

    res.setHeader(
      'Set-Cookie',
      cookie.serialize('strava_session', encoded, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 jours
        path: '/',
      })
    );

    res.redirect('/');
  } catch (err) {
    console.error('Callback error:', err);
    res.redirect('/?error=server_error');
  }
}
