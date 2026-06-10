const AWARDS_PASSWORD =
  (typeof process !== 'undefined' && process.env && process.env.AWARDS_PASSWORD) ||
  'metagri';

function isAuthorized(request) {
  const authorization = request.headers.get('authorization') || '';
  const [scheme, encoded] = authorization.split(' ');

  if (scheme !== 'Basic' || !encoded) return false;

  try {
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(':');
    const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : decoded;
    return password === AWARDS_PASSWORD;
  } catch {
    return false;
  }
}

function challenge() {
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Awards Preview", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}

export default function middleware(request) {
  if (!isAuthorized(request)) return challenge();
}

export const config = {
  matcher: ['/awards', '/awards.html'],
};
