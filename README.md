# Learnly

Next.js + Supabase learning platform prototype.

## Routes
- `/` public landing page (preserved from the original site)
- `/signup`, `/login`, `/forgot-password`, `/reset-password` Supabase account flows
- `/app` authenticated learner dashboard and saved learning paths
- `/paths/[id]` learning modules, quiz assessment, and tutor UI
- `/legacy-demo.html` original local-storage workspace demo

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (optional; defaults to the Learnly production URL)
- `OPENAI_API_KEY` (optional; required for real AI module generation and tutoring)
- `OPENAI_MODEL` (optional; defaults to `gpt-4o-mini`)

Never expose an AI provider key in a `NEXT_PUBLIC_` variable or commit it. Add it only through Vercel encrypted environment variables. Provider usage may cost money; no AI key has been added by this change.

## Database
Supabase contains profiles, learning_paths, modules, learning_activities, learning_attempts, concept_mastery, and review_schedule. Row Level Security is enabled on every table.

## Run locally
Run `npm install`, then `npm run dev`.

## Current limitations
- Real AI generation and tutoring require `OPENAI_API_KEY`; without it, the app explains that AI is disabled.
- Trusted external-source retrieval and citations are not implemented yet.
- Quiz attempts update basic concept mastery and review scheduling; advanced adaptive scoring is future work.
- The previous broad study workspace remains available at `/legacy-demo.html`; its demo data is local to that browser.
- Configure Supabase Auth email confirmation and redirect URLs for your domain before inviting users. Review privacy, terms, age requirements, and data protection before public launch.
