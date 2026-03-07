# CandidateConnect OSS

Open-source workspace for managing job applications and interview preparation.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to view the app.

Create `.env.local` from `.env.example` and set `OPENAI_API_KEY` for AI-customized CV/Cover generation.

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


## Product workflow

- **Profile**: store one-user base information (name, email, base CV text, CV notes, base cover letter).
- **Applications**: add each application with job link, company, JD, contact person, status, and optional expected salary.
- **Customization**: from each application row, generate a customized CV and cover letter using OpenAI and attach them automatically.
- **Dashboard filters**: view counts for today/yesterday and filter by date range + status.
