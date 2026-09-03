# DiscordShrink — Render deployment

This project is configured for **two Render services**:

1. `discordshrink-api` — Node + FFmpeg compression backend (`server/`)
2. `discordshrink-web` — React/Vite website (root project)

## Recommended deployment

### 1. Push the whole repository to GitHub

Keep the `server/` directory in the same repository. Do not deploy only `server/` for the website.

### 2. Create the backend

In Render, create a **Web Service** from the repository.

- Root Directory: `server`
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check Path: `/health`

The backend URL should show:

`DiscordShrink compression server is online`

That page is normal. It is the API, not the public website.

### 3. Create the frontend

Create a **Static Site** from the same repository.

- Root Directory: leave blank
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`

Set this environment variable on the frontend:

`VITE_COMPRESSION_SERVER_URL=https://YOUR-BACKEND-SERVICE.onrender.com`

If the Render Blueprint (`render.yaml`) is used, it is configured to connect the frontend variable to the API service automatically.

### 4. Public URL

Give users the **frontend/static-site URL**. They should not need the backend URL.

## Target sizes

The compressor supports:

- Discord Shrinker — 20 MB (`20480 KB` target)
- `19,765 KB`
- `30,000 KB`

The server keeps encoding headroom for MP4/container overhead and rejects a result that is still above the selected limit.

## Support tickets & Discord notifications

Submissions from the Support page's contact form are saved to `server/support-tickets.log` and each one gets a reference code (e.g. `DS-00001-8F3K`) shown to the user.

To also get notified in Discord when a ticket comes in:

1. In Discord, go to the channel you want tickets posted to → **Edit Channel → Integrations → Webhooks → New Webhook**.
2. Copy the webhook URL.
3. Set it as an environment variable on the **backend** (`discordshrink-api`) service in Render: `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...`

No webhook URL set = the contact form still works and tickets still get saved and reference codes issued; Discord posting is just skipped.
