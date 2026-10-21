# RankFlow Lite

Keyword in, publish-ready SEO article out. Five steps, each one reviewed by you before the next starts:

1. **Keyword** – what the article should rank for, who reads it, how long.
2. **Research** – top Google results, People Also Ask, web sources with real numbers, keyword map.
3. **Outline** – generated from the research; you edit and approve it.
4. **Draft** – the full article, streamed live and saved as it goes.
5. **SEO & export** – title, description, slug, on-page score, copy or download as Markdown/HTML.

Every article belongs to a signed-in user and is saved at every step, so you can close the tab and continue later from the dashboard.

This is a deliberately small rebuild of [RankFlowHQ](https://rankflowhq.com): same proven pipeline, none of the extras.

## Run it

```bash
npm install
cp .env.example .env     # then add GEMINI_API_KEY (required), SERPER_API_KEY and TAVILY_API_KEY (optional)
npm run db:setup         # creates the local SQLite database
npm run dev              # http://localhost:3124
```

Want to see the flow before adding keys? Set `MOCK_PROVIDERS=1` in `.env`; every step then runs on canned sample data.

## Keys

| Key | Needed for | Get it |
| --- | --- | --- |
| `GEMINI_API_KEY` | keyword map, outline, draft, SEO fields | https://aistudio.google.com/apikey |
| `SERPER_API_KEY` | real Google results, People Also Ask, related searches | https://serper.dev |
| `TAVILY_API_KEY` | research sources with statistics the draft can cite | https://tavily.com |
| `AUTH_SECRET` | signing login cookies | `openssl rand -base64 32` |

Only Gemini is required. Without Serper/Tavily the flow still works; research is just thinner and the dashboard says so.

## Layout

```
app/
  page.tsx                 landing (redirects to /dashboard when signed in)
  login, signup            email + password auth
  dashboard                your articles, with the next step for each
  new                      step 1 form
  articles/[id]            steps 2–5 (ArticleFlow)
  api/auth/*               signup, login, logout
  api/articles             create / list
  api/articles/[id]        get / patch (edits, step pointer) / delete
  api/articles/[id]/research|outline|draft|seo   one route per step; draft streams SSE
lib/
  pipeline/*               prompts and provider calls for each step
  providers/*              Gemini (with model fallback), Serper, Tavily, mock data
  seo-score.ts             on-page score (no network)
  auth.ts, db.ts           JWT cookie sessions, Prisma client
components/
  ArticleFlow.tsx          stepper + active step panel
  steps/*                  one component per step
prisma/schema.prisma       User, Article
```

## Deploying

SQLite is for local use. For Vercel or any host without a writable disk, change `provider` in `prisma/schema.prisma` to `postgresql`, set `DATABASE_URL` to a Neon/Supabase connection string, run `npx prisma migrate dev --name init` once, and set `AUTH_SECRET` plus your API keys in the host's environment variables.
