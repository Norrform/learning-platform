import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Workspace = {
  notes: Array<{ id: string; title: string; body: string; updatedAt: string }>;
  decks: Array<{ id: string; title: string; subject: string; cards: Array<{ id: string; front: string; back: string; rating?: string }> }>;
  savedResourceIds: string[];
  studyTasks: Array<{ id: string; title: string; subject: string; date: string; time: string; durationMinutes: number; completed: boolean; completedAt?: string }>;
  projects: Array<{ id: string; name: string; topic: string; description: string; stage: string; updatedAt: string }>;
  practiceHistory: Array<{ id: string; mode: string; title: string; reflection: string; createdAt: string }>;
  preferences: { dailyGoalMinutes: number; styleSuggestions: boolean; reminders: boolean; progressInsights: boolean; difficulty: string };
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = (value: unknown, max: number, fallback = "") => typeof value === "string" ? value.trim().slice(0, max) : fallback;
const list = (value: unknown) => Array.isArray(value) ? value : [];

function sanitizeWorkspace(value: unknown): Workspace | null {
  if (!isRecord(value)) return null;
  const notes = list(value.notes).slice(0, 100).filter(isRecord).map((item) => ({
    id: text(item.id, 80), title: text(item.title, 120, "Untitled note"),
    body: text(item.body, 12000), updatedAt: text(item.updatedAt, 40, new Date().toISOString()),
  })).filter((item) => item.id);
  const decks = list(value.decks).slice(0, 50).filter(isRecord).map((item) => ({
    id: text(item.id, 80), title: text(item.title, 100, "Untitled deck"),
    subject: text(item.subject, 80, "General"),
    cards: list(item.cards).slice(0, 100).filter(isRecord).map((card) => ({
      id: text(card.id, 80), front: text(card.front, 500), back: text(card.back, 1500),
      rating: text(card.rating, 20),
    })).filter((card) => card.id && card.front && card.back),
  })).filter((item) => item.id);
  const studyTasks = list(value.studyTasks).slice(0, 200).filter(isRecord).map((item) => ({
    id: text(item.id, 80), title: text(item.title, 160), subject: text(item.subject, 80),
    date: text(item.date, 10), time: text(item.time, 5),
    durationMinutes: Math.max(5, Math.min(240, Number(item.durationMinutes) || 20)),
    completed: item.completed === true,
    completedAt: text(item.completedAt, 40),
  })).filter((item) => item.id && item.title);
  const projects = list(value.projects).slice(0, 100).filter(isRecord).map((item) => ({
    id: text(item.id, 80), name: text(item.name, 120), topic: text(item.topic, 100),
    description: text(item.description, 3000), stage: text(item.stage, 30, "Idea"),
    updatedAt: text(item.updatedAt, 40, new Date().toISOString()),
  })).filter((item) => item.id && item.name);
  const practiceHistory = list(value.practiceHistory).slice(0, 200).filter(isRecord).map((item) => ({
    id: text(item.id, 80), mode: text(item.mode, 30), title: text(item.title, 160),
    reflection: text(item.reflection, 5000), createdAt: text(item.createdAt, 40, new Date().toISOString()),
    learningPathId: text(item.learningPathId, 80), courseTitle: text(item.courseTitle, 120),
  })).filter((item) => item.id);
  const preferences = isRecord(value.preferences) ? value.preferences : {};
  const goal = Number(preferences.dailyGoalMinutes);
  return {
    notes, decks,
    savedResourceIds: [...new Set(list(value.savedResourceIds).map((id) => text(id, 80)).filter(Boolean))].slice(0, 150),
    studyTasks, projects, practiceHistory,
    preferences: {
      dailyGoalMinutes: [15, 30, 60, 120].includes(goal) ? goal : 30,
      styleSuggestions: preferences.styleSuggestions !== false,
      reminders: preferences.reminders === true,
      progressInsights: preferences.progressInsights !== false,
      difficulty: ["gentle", "balanced", "challenging"].includes(String(preferences.difficulty)) ? String(preferences.difficulty) : "balanced",
    },
  };
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in to save your workspace." }, { status: 401 });

  const raw = await request.text();
  if (raw.length > 250_000) return NextResponse.json({ error: "Your workspace is too large to save." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid workspace data." }, { status: 400 }); }
  if (!isRecord(body) || !("workspace" in body)) return NextResponse.json({ error: "Workspace data is missing." }, { status: 400 });
  const workspace = sanitizeWorkspace(body.workspace);
  if (!workspace) return NextResponse.json({ error: "Workspace data is invalid." }, { status: 400 });

  const { error } = await supabase.from("profiles").upsert(
    { id: userId, workspace_data: workspace, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );
  if (error) return NextResponse.json({ error: "Could not save your workspace. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
