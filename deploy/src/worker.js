/**
 * AFK Slayer Worker — static assets + Google sign-in + cloud saves.
 * Auth: GIS ID-token → POST /api/auth/google (verify JWKS RS256).
 * GOOGLE_CLIENT_ID empty ⇒ frontend shows "Sign in · soon".
 */
const COOKIE = 'afk_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SAVE_BYTES = 750_000;
const RATE_IP = { limit: 40, windowMs: 15 * 60 * 1000 };
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

let jwksCache = { keys: null, fetchedAt: 0 };
const JWKS_TTL_MS = 60 * 60 * 1000;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

function googleClientId(env) {
  return String(env.GOOGLE_CLIENT_ID || '').trim();
}

function authReady(env) {
  return !!googleClientId(env);
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function clientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

function parseCookies(request) {
  const raw = request.headers.get('cookie') || '';
  const out = {};
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i < 0) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function sessionCookie(token, maxAgeSec) {
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}`;
}

function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function b64urlToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function parseJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed_jwt');
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  return { header, payload, signingInput: parts[0] + '.' + parts[1], sig: parts[2] };
}

async function getGoogleJwks() {
  const now = Date.now();
  if (jwksCache.keys && now - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetch(JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!res.ok) throw new Error('jwks_fetch_failed');
  const data = await res.json();
  if (!data || !Array.isArray(data.keys)) throw new Error('jwks_invalid');
  jwksCache = { keys: data.keys, fetchedAt: now };
  return data.keys;
}

function jwkToCryptoKey(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

async function verifyGoogleIdToken(idToken, clientId) {
  const { header, payload, signingInput, sig } = parseJwt(idToken);
  if (header.alg !== 'RS256') throw new Error('bad_alg');
  const keys = await getGoogleJwks();
  const jwk = keys.find((k) => k.kid === header.kid && k.kty === 'RSA')
    || keys.find((k) => k.kty === 'RSA');
  if (!jwk) throw new Error('no_jwk');
  const key = await jwkToCryptoKey(jwk);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(sig),
    new TextEncoder().encode(signingInput)
  );
  if (!ok) throw new Error('bad_sig');

  const audOk = payload.aud === clientId
    || (Array.isArray(payload.aud) && payload.aud.includes(clientId));
  if (!audOk) throw new Error('bad_aud');
  if (!ISSUERS.has(payload.iss)) throw new Error('bad_iss');
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < nowSec) throw new Error('expired');
  if (typeof payload.nbf === 'number' && payload.nbf > nowSec + 30) throw new Error('nbf');
  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw new Error('email_unverified');
  }
  if (!payload.sub || typeof payload.sub !== 'string') throw new Error('no_sub');
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) throw new Error('no_email');
  return { sub: payload.sub, email, name: payload.name || null, picture: payload.picture || null };
}

async function rateLimit(env, key, cfg) {
  const now = Date.now();
  const row = await env.DB.prepare('SELECT count, window_start FROM rate_limits WHERE key = ?')
    .bind(key).first();
  if (!row || now - row.window_start > cfg.windowMs) {
    await env.DB.prepare(
      'INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start'
    ).bind(key, now).run();
    return { ok: true };
  }
  if (row.count >= cfg.limit) return { ok: false };
  await env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
  return { ok: true };
}

function progressScore(saveObj) {
  try {
    const s = saveObj || {};
    const gold = Number(s.gold) || 0;
    const points = Number(s.points) || 0;
    const playMs = Number(s.playMs) || 0;
    const kills = (s.stats && Number(s.stats.totalKills)) || 0;
    const ups = s.upgrades && typeof s.upgrades === 'object'
      ? Object.values(s.upgrades).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
    return playMs / 60000 + gold / 100 + points / 10 + kills + ups * 5;
  } catch {
    return 0;
  }
}

async function ensureSchema(env) {
  // Idempotent — v2 tables keyed by google_sub
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users_v2 (
      google_sub TEXT PRIMARY KEY, email TEXT NOT NULL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions_v2 (
      token_hash TEXT PRIMARY KEY, google_sub TEXT NOT NULL, email TEXT NOT NULL,
      expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS saves_v2 (
      google_sub TEXT PRIMARY KEY, email TEXT NOT NULL, payload TEXT NOT NULL,
      progress_score REAL NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY, count INTEGER NOT NULL, window_start INTEGER NOT NULL)`),
  ]);
}

async function getSession(env, request) {
  const cookies = parseCookies(request);
  const token = cookies[COOKIE];
  if (!token) return null;
  const hash = await sha256Hex(token);
  const row = await env.DB.prepare(
    'SELECT google_sub, email, expires_at FROM sessions_v2 WHERE token_hash = ?'
  ).bind(hash).first();
  if (!row || row.expires_at < Date.now()) {
    if (row) await env.DB.prepare('DELETE FROM sessions_v2 WHERE token_hash = ?').bind(hash).run();
    return null;
  }
  return { googleSub: row.google_sub, email: row.email, token, tokenHash: hash };
}

async function handleAuthGoogle(request, env) {
  await ensureSchema(env);
  const clientId = googleClientId(env);
  if (!clientId) {
    return json({
      ok: false,
      code: 'google_not_configured',
      message: 'GOOGLE_CLIENT_ID not set yet.',
    }, 503);
  }

  const ip = clientIp(request);
  const rl = await rateLimit(env, 'auth:google:ip:' + ip, RATE_IP);
  if (!rl.ok) return json({ ok: false, error: 'Too many sign-in attempts. Try later.' }, 429);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
  const idToken = body && (body.credential || body.idToken || body.token);
  if (!idToken || typeof idToken !== 'string' || idToken.length > 8192) {
    return json({ ok: false, error: 'credential required' }, 400);
  }

  let identity;
  try {
    identity = await verifyGoogleIdToken(idToken, clientId);
  } catch (err) {
    return json({ ok: false, error: 'Invalid Google token', detail: String(err && err.message || err) }, 401);
  }

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO users_v2 (google_sub, email, created_at, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, updated_at = excluded.updated_at`
  ).bind(identity.sub, identity.email, now, now).run();

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare(
    'INSERT INTO sessions_v2 (token_hash, google_sub, email, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(tokenHash, identity.sub, identity.email, now + SESSION_TTL_MS, now).run();

  const saveRow = await env.DB.prepare(
    'SELECT progress_score, updated_at FROM saves_v2 WHERE google_sub = ?'
  ).bind(identity.sub).first();

  return json(
    {
      ok: true,
      email: identity.email,
      hasCloudSave: !!saveRow,
      cloudProgress: saveRow ? saveRow.progress_score : 0,
      cloudUpdatedAt: saveRow ? saveRow.updated_at : null,
    },
    200,
    { 'Set-Cookie': sessionCookie(token, SESSION_TTL_MS / 1000) }
  );
}

async function handleLogout(request, env) {
  await ensureSchema(env);
  const sess = await getSession(env, request);
  if (sess) {
    await env.DB.prepare('DELETE FROM sessions_v2 WHERE token_hash = ?').bind(sess.tokenHash).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}

async function handleMe(request, env) {
  await ensureSchema(env);
  const sess = await getSession(env, request);
  if (!sess) return json({ ok: true, signedIn: false, googleReady: authReady(env) });
  return json({
    ok: true,
    signedIn: true,
    email: sess.email,
    googleReady: authReady(env),
  });
}

async function handleGetSave(request, env) {
  await ensureSchema(env);
  const sess = await getSession(env, request);
  if (!sess) return json({ ok: false, error: 'Not signed in' }, 401);
  const row = await env.DB.prepare(
    'SELECT payload, progress_score, updated_at FROM saves_v2 WHERE google_sub = ?'
  ).bind(sess.googleSub).first();
  if (!row) return json({ ok: true, save: null });
  let parsed;
  try { parsed = JSON.parse(row.payload); } catch { return json({ ok: false, error: 'Corrupt save' }, 500); }
  return json({ ok: true, save: parsed, progressScore: row.progress_score, updatedAt: row.updated_at });
}

async function handlePutSave(request, env) {
  await ensureSchema(env);
  const sess = await getSession(env, request);
  if (!sess) return json({ ok: false, error: 'Not signed in' }, 401);
  const rawText = await request.text();
  if (rawText.length > MAX_SAVE_BYTES) return json({ ok: false, error: 'Save too large' }, 413);
  let body;
  try { body = JSON.parse(rawText); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
  const saveObj = body && body.save;
  if (!saveObj || typeof saveObj !== 'object' || Array.isArray(saveObj)) {
    return json({ ok: false, error: 'save object required' }, 400);
  }
  const score = progressScore(saveObj);
  const force = !!(body && body.force);
  const existing = await env.DB.prepare(
    'SELECT progress_score FROM saves_v2 WHERE google_sub = ?'
  ).bind(sess.googleSub).first();
  if (existing && !force && score + 1 < existing.progress_score) {
    return json({
      ok: false,
      error: 'cloud_ahead',
      message: 'Cloud save has more progress. Pass force:true to overwrite, or pull cloud first.',
      cloudProgress: existing.progress_score,
      localProgress: score,
    }, 409);
  }
  const payload = JSON.stringify(saveObj);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO saves_v2 (google_sub, email, payload, progress_score, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, payload = excluded.payload,
       progress_score = excluded.progress_score, updated_at = excluded.updated_at`
  ).bind(sess.googleSub, sess.email, payload, score, now).run();
  if (env.SAVES) {
    try {
      await env.SAVES.put('save:' + sess.googleSub, payload, { expirationTtl: 60 * 60 * 24 * 400 });
    } catch (_) { /* soft */ }
  }
  return json({ ok: true, progressScore: score, updatedAt: now });
}

async function handleStatus(env) {
  const cid = googleClientId(env);
  return json({
    ok: true,
    build: 'boss1b',
    googleReady: !!cid,
    googleClientId: cid || null,
  });
}

function goneEmailAuth() {
  return json({
    ok: false,
    error: 'gone',
    message: 'Email-code sign-in removed. Use Sign in with Google.',
  }, 410);
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  if (path === '/api/status' && method === 'GET') return handleStatus(env);
  if (path === '/api/auth/google' && method === 'POST') return handleAuthGoogle(request, env);
  if (path === '/api/auth/start' && method === 'POST') return goneEmailAuth();
  if (path === '/api/auth/verify' && method === 'POST') return goneEmailAuth();
  if (path === '/api/logout' && method === 'POST') return handleLogout(request, env);
  if (path === '/api/me' && method === 'GET') return handleMe(request, env);
  if (path === '/api/save' && method === 'GET') return handleGetSave(request, env);
  if (path === '/api/save' && method === 'PUT') return handlePutSave(request, env);

  return json({ ok: false, error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
            'access-control-allow-headers': 'content-type',
            'access-control-allow-credentials': 'true',
            'access-control-max-age': '86400',
          },
        });
      }
      try {
        return await handleApi(request, env);
      } catch (err) {
        return json({ ok: false, error: 'Server error', detail: String(err && err.message || err) }, 500);
      }
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
