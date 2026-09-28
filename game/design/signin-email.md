# Email sign-in (build signin1)

## Live now
- Worker + static assets at `afk-slayer` with D1 (`afk-slayer-db`) + KV (`afk-slayer-saves`).
- API routes: `GET /api/status`, `POST /api/auth/start`, `POST /api/auth/verify`, `GET|PUT /api/save`, `POST /api/logout`, `GET /api/me`.
- Session cookie: HttpOnly Secure SameSite=Lax.
- Codes: 6-digit, SHA-256 hashed, 10 min TTL, rate limits per email/IP.
- Save size cap ~750 KB; progress-score merge on first sign-in.
- UI: top-right account chip + Settings → Account. Guests keep localStorage.
- Autosave to server every ~45s + visibilitychange when signed in.

## Feature flag
`AUTH_EMAIL_ENABLED=0` (wrangler vars). Sign-in button shows **coming soon**. Auth endpoints return 503 with `needsFromAlex` payload until enabled.

## Why email is blocked
Cloudflare Email Sending needs:
1. **Workers Paid** (~$5/mo) — outbound to arbitrary player emails not on Free.
2. **Onboarded sender domain** on this account (SPF/DKIM). `*.workers.dev` cannot send. Current zones on the account are not AFK Slayer domains.
3. Token may need Email Sending Edit; deploy `send_email` binding; set `AUTH_FROM_EMAIL` and flip `AUTH_EMAIL_ENABLED=1`.

Alternative: Resend (or similar) API key + verified domain — new third-party account from Alex.

**Will not ship** email-without-verification login.
