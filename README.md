# TicketMigration V1

Local web app to **manually** generate GitLab issues from Trello cards using simple IFTTT-style rules.

## Run locally

Install:

```bash
npm install
```

Start server + web:

```bash
npm run dev
```

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8787/api/health`

## Setup

- **Server env**: copy `server/.env.example` to `server/.env`.
- **Tokens**: add credentials in **Connections**, or paste them **inline in the New rule wizard** (you can optionally save as profiles there). Rules always store references to saved connection rows; inline-only flows create connections automatically when you create the rule if you did not save a profile first.

## Data & security notes (V1)

- Credentials and state are stored in a local SQLite DB at `server/dev.db`.
- `.env` and `*.db` are ignored by `.gitignore`.
- For V1 we store tokens in SQLite as provided; rotate/revoke tokens if needed.

