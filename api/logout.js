import cookie from 'cookie';

export default function handler(req, res) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize('strava_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  );
  res.redirect('/');
}
