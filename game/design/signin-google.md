# Google sign-in (build signin2)

## Flow
1. Frontend loads GIS (`accounts.google.com/gsi/client`).
2. User clicks Sign in with Google → ID token `credential`.
3. `POST /api/auth/google` `{ credential }` — Worker verifies RS256 vs Google JWKS, `aud`==`GOOGLE_CLIENT_ID`, `iss`, `exp`, `email_verified`.
4. Account keyed by Google `sub` (email stored). Session cookie HttpOnly Secure SameSite=Lax.
5. Cloud save GET/PUT `/api/save`; first sign-in merge by progress score.

## Enable (1-minute flip)
Alex creates an OAuth Web client in Google Cloud Console with Authorized JavaScript origin:
`https://afk-slayer.ajchapman20.workers.dev`

Then from `/workspace/afk-slayer-cf` (or any machine with the token + this repo):

```bash
# ONE edit — set the Client ID, then deploy:
# In wrangler.jsonc vars.GOOGLE_CLIENT_ID, paste the Client ID, then:
cd /workspace/afk-slayer-cf && \
  export CLOUDFLARE_API_TOKEN="$(python3 -c "import json; print(json.load(open('/home/box/agent-data/box-secrets.json'))['card']['CLOUDFLARE_API_TOKEN'])")" && \
  ./node_modules/.bin/wrangler deploy && unset CLOUDFLARE_API_TOKEN
```

Or single-line set via sed (replace CLIENT_ID):

```bash
cd /workspace/afk-slayer-cf && \
  sed -i 's/"GOOGLE_CLIENT_ID": ""/"GOOGLE_CLIENT_ID": "CLIENT_ID.apps.googleusercontent.com"/' wrangler.jsonc && \
  export CLOUDFLARE_API_TOKEN="$(python3 -c "import json; print(json.load(open('/home/box/agent-data/box-secrets.json'))['card']['CLOUDFLARE_API_TOKEN'])")" && \
  ./node_modules/.bin/wrangler deploy && unset CLOUDFLARE_API_TOKEN
```

While `GOOGLE_CLIENT_ID` is empty, chip shows **Sign in · soon**.

Email OTP endpoints return **410 Gone**.
