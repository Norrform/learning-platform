# Learnly

Next.js + Supabase learning platform prototype.

## Routes
- `/` public landing page
- `/signup`, `/login`, `/forgot-password`, `/reset-password` Supabase account flows
- `/app` authenticated learner workspace: overview, learning paths, discover, flashcards, practice reflections, projects, planner, saved resources, notes, insights and preferences
- `/paths/[id]` learning roadmap, generated lessons, quiz assessments, progress and tutor
- `/legacy-demo.html` original local-storage visual prototype (kept for reference)

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (optional)
- `OPENAI_API_KEY` (optional; required for real AI generation and tutoring)
- `OPENAI_MODEL` (optional; defaults to `gpt-4o-mini`)

Never expose an AI provider key in a `NEXT_PUBLIC_` variable or commit it. Add it only through encrypted environment variables. Provider usage may cost money; no AI key has been added.

## Database
Supabase contains profiles, learning_paths, modules, learning_activities, learning_attempts, concept_mastery and review_schedule. All existing tables have Row Level Security enabled.

The `profiles.workspace_data` JSONB column stores the signed-in user's private dashboard workspace (notes, decks, saved resource IDs, study tasks, projects, practice reflections and learning preferences). The workspace API uses the authenticated Supabase session and the existing profile ownership policies; no service-role key is exposed.

## Current dashboard scope
- Personal workspace features persist to the user's account across sessions.
- Study groups and public community posting are intentionally not enabled yet. They require private-by-default group access, reporting, blocking and moderation before being opened to learners.
- AI roadmap generation, lesson generation, quiz creation and tutor responses require an approved provider configuration and are deferred until the dashboard is ready.
- Discover currently uses a small curated starter catalog; trusted external-source retrieval and citations are not implemented.
- Practice reflections are saved, but AI feedback and automatic grading are not enabled.
- Flashcards include starter decks and user-created decks. Each new deck currently starts with one card.

## Run locally
Run `npm install`, then `npm run dev`.

Review privacy, terms, age requirements, moderation and data protection before public launch.
