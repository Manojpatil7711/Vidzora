# Vidzora media engine

Vidzora's Next.js API is already wired for:

- COBALT_API_URL
- COBALT_API_KEY

This folder provides a self-hosted Cobalt instance configuration.

## 1. Create the API key

Generate a UUID on the server:

node -e "console.log(crypto.randomUUID())"

Copy the UUID into keys.json.

## 2. Configure the engine

Copy keys.json.example to keys.json and replace:

- REPLACE-WITH-YOUR-UUID
- YOUR-COBALT-DOMAIN

Keep keys.json private and never commit it.

## 3. Start

docker compose up -d

## 4. Connect Vidzora

Set these server-side environment variables in the Vidzora deployment:

COBALT_API_URL=https://YOUR-COBALT-DOMAIN/
COBALT_API_KEY=YOUR_GENERATED_UUID

Do not expose COBALT_API_KEY to the browser.

## 5. Supported-content rule

Use the engine only for public content that the user has permission to download. This setup does not attempt to bypass private accounts, DRM, paywalls, or access controls.

## Security

Keep the Cobalt API authenticated. If the engine is exposed to the internet, put it behind HTTPS and a reverse proxy/firewall. The official Cobalt documentation recommends API-key or Turnstile protection for public-facing instances.
