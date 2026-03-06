# CandidateConnect OSS

Open-source workspace for building and testing candidate workflow automations with a visual builder.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- React Flow (`@xyflow/react`) for workflow editing

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to view the app.

## Available scripts

```bash
npm run dev        # start local development server
npm run build      # create production build
npm run start      # run production server
npm run lint       # run linting
```

## Deploy on Render (Web Service)

This repository includes a `render.yaml` Blueprint so Render can automatically configure the service.

1. Push the repository to GitHub.
2. In Render, create a new **Blueprint** instance from the repo.
3. Render uses:
   - Build command: `npm ci && npm run build`
   - Start command: `npm run start -- --hostname 0.0.0.0 --port $PORT`
4. Deploy.

The application is configured to run on the `PORT` provided by Render.
