import cookie from 'cookie';

export default function handler(req, res) {
  const isHttps = req.headers['x-forwarded-proto'] === 'https' ||
                  process.env.VERCEL_ENV === 'production' ||
                  process.env.VERCEL_ENV === 'preview';

  res.setHeader(
    'Set-Cookie',
    cookie.serialize('strava_session', '', {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  );
  res.redirect('/');
}
