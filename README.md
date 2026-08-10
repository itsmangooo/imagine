# Imagine

A free, open-source photo editor in the browser — crop, color grade, add text, draw, build collages, and generate AI portraits from a single selfie. No subscription, no watermarks. AI features use your own Replicate API key, so you only ever pay Replicate directly for what you use.

![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Crop** — freeform or preset aspect ratios (LinkedIn, X/Twitter, Instagram Post/Story/Profile Picture)
- **Filters** — 14 built-in presets (Cinematic Teal, Vintage Film, B&W Noir, and more) plus full manual control over brightness, contrast, saturation, temperature, tint, exposure, highlights/shadows, vignette, sharpness, and grain
- **Selective color grading** — lasso-select part of an image (freeform or edge-snapping/magnetic mode) and grade just that region, independent of the rest. Selections are editable after the fact (drag points to reshape) and can be turned into a movable piece of the image.
- **Text** — full styling control (font, size, color, outline, shadow, background bar, rotation) with smart center-snap alignment guides
- **Doodle** — freehand drawing with adjustable brush size, color, and opacity
- **Collage** — combine multiple images into one canvas with flexible grid layouts
- **Music** — attach a trimmed audio clip (your own upload, or a track from a licensed royalty-free library) to an image and export as a short MP4
- **AI Generate** — turn a single selfie into a studio-quality portrait in one of several styles (Corporate, Studio, Outdoor, Editorial, Black & White, Cinematic), sized for the platform you need it for
- **AI Auto-Edit** — let AI suggest a starting color grade you can then fine-tune manually
- **Multi-image workspace** — load several images into one session and switch between them, each with its own independent edit history
- **Real zoom & pan** — scroll-to-zoom, fit-to-screen, 100% view, and keyboard shortcuts, so precise selection and masking work at any image size

All editing tools run entirely client-side and are free and unlimited. AI Generate and AI Auto-Edit call Replicate using **your own API key** (see [AI features](#ai-features) below) — Imagine never charges you or sees your key in plaintext.

## Screenshots

*(add screenshots/GIFs here once available — the editor, the AI generate flow, and an example before/after)*

## Tech stack

- [Nuxt 3/4](https://nuxt.com/) (Vue 3 + Nitro) — frontend and backend in one framework
- [Postgres](https://www.postgresql.org/) via [Drizzle ORM](https://orm.drizzle.team/)
- [Redis](https://redis.io/) — background job queue ([BullMQ](https://docs.bullmq.io/)) for AI calls/exports, and rate limiting ([rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible))
- [Fabric.js](http://fabricjs.com/) — canvas engine powering crop, text, doodle, collage, masking, and filters
- [Replicate](https://replicate.com/) ([`bytedance/flux-pulid`](https://replicate.com/bytedance/flux-pulid)) for AI portrait generation
- [ffmpeg.wasm](https://ffmpegwasm.netlify.app/) for client-side photo + audio → MP4 export
- [Cloudflare R2](https://developers.cloudflare.com/r2/) (S3-compatible) for image storage
- [Resend](https://resend.com/) for transactional email (verification, one-time login codes, password resets)
- [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) for sessions and Google OAuth
- [GSAP](https://gsap.com/) + [Lenis](https://lenis.darkroom.engineering/) for the landing page's scroll animations
- Docker Compose for local development and deployment

## Self-hosting

### Prerequisites
- Docker and Docker Compose
- A [Cloudflare R2](https://developers.cloudflare.com/r2/) bucket (or another S3-compatible storage provider)
- A [Resend](https://resend.com/) account for sending email
- (Optional, for Google sign-in) Google OAuth credentials

### Setup

1. Clone the repo and copy the example environment file:
   ```bash
   git clone https://github.com/<your-username>/imagine.git
   cd imagine
   cp .env.example .env
   ```

2. Fill in `.env` with your own values — database credentials, R2 bucket/access keys, Resend API key, session secret, an encryption key for stored API keys, and (optionally) Google OAuth credentials. **Never commit your real `.env` file.**

3. Start everything:
   ```bash
   docker compose up
   ```
   This starts the Nuxt app, Postgres, and Redis. Migrations run automatically on startup.

4. Open `http://localhost:3000`.

### AI features

Imagine doesn't hold or resell access to any AI provider — each user connects their own [Replicate](https://replicate.com/) account:

1. Create a free Replicate account and generate an API token at [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens).
2. In Imagine, go to **Settings → API Keys** and paste your token. It's encrypted at rest and only decrypted server-side at the moment of an API call — Imagine never displays it back to you in full once saved.
3. Generation costs roughly **$0.02 per portrait**, billed by Replicate directly to your account — Imagine has no visibility into or markup on this cost.

Without a key set, every other tool (crop, filters, color grading, text, doodle, collage, music/export) still works fully — only AI Generate and AI Auto-Edit require one.

## Privacy & data handling

- Uploaded selfies used for AI generation are deleted immediately after the generation completes — they are never retained or used to train any model.
- See [`/legal/privacy`](./legal/privacy-policy.md) and [`/legal/terms`](./legal/terms-of-service.md) for the full policy, including handling of facial/biometric data under GDPR and US state biometric privacy laws.

## Contributing

Issues and pull requests are welcome. If you're proposing a larger change, please open an issue first to discuss the approach. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for notes on extending the Music tool's audio-source system and other extension points.

## License

[MIT](./LICENSE)