"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AIProviderError, createAICompletion, parseAIJson, type ChatMessage } from "@/lib/ai/provider";

type PlanStep = {
  title: string;
  purpose: string;
  concepts: string[];
  outcomes: string[];
  estimated_minutes: number;
};

type LearningPlan = {
  overview: string;
  modules: PlanStep[];
};

function isLearningPlan(value: unknown): value is LearningPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as LearningPlan;
  return typeof plan.overview === "string"
    && Array.isArray(plan.modules)
    && plan.modules.length >= 3
    && plan.modules.length <= 8
    && plan.modules.every((step) =>
      step
      && typeof step.title === "string"
      && typeof step.purpose === "string"
      && Array.isArray(step.concepts)
      && step.concepts.length >= 1
      && step.concepts.every((item) => typeof item === "string")
      && Array.isArray(step.outcomes)
      && step.outcomes.length >= 1
      && step.outcomes.every((item) => typeof item === "string")
      && Number.isInteger(step.estimated_minutes)
      && step.estimated_minutes >= 5
      && step.estimated_minutes <= 240
    );
}

export async function generateLearningPlan(formData: FormData) {
  const pathId = String(formData.get("pathId") || "");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");
  if (!pathId) redirect("/app");

  const { data: path } = await supabase
    .from("learning_paths")
    .select("id,title,subject,goal,current_level,target_level,preferences")
    .eq("id", pathId)
    .eq("user_id", userId)
    .single();

  if (!path) redirect("/app?error=Learning%20path%20not%20found.");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "You are Learnly's expert curriculum planner.",
        "Design a realistic, coherent learning roadmap for one learner, not a generic topic list.",
        "Start with prerequisites and fundamentals, then build toward the learner's goal.",
        "Avoid unnecessary complexity, repeated topics, and unsupported claims about the learner.",
        "Make each module teachable as one focused study session. Include practical application when appropriate.",
        "Return valid JSON only with overview and modules. Each module must have title, purpose, concepts (string array), outcomes (string array), and estimated_minutes (integer).",
        "Create between 3 and 6 modules.",
      ].join(" "),
    },
    {
      role: "user",
      content: `Path: ${path.title}\nSubject: ${path.subject}\nGoal: ${path.goal || "Build a strong understanding"}\nCurrent level: ${path.current_level || "Not specified"}\nTarget level: ${path.target_level || "Confident understanding"}\nLearner preferences: ${JSON.stringify(path.preferences || {})}`,
    },
  ];

  try {
    const raw = await createAICompletion(messages, { json: true, temperature: 0.25, maxTokens: 1800 });
    const plan = parseAIJson(raw, isLearningPlan);
    const preferences = {
      ...(path.preferences && typeof path.preferences === "object" ? path.preferences : {}),
      plan,
      plan_generated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("learning_paths")
      .update({ preferences })
      .eq("id", pathId)
      .eq("user_id", userId);

    if (error) throw new Error("The learning plan was generated but could not be saved.");
  } catch (error) {
    const message = error instanceof AIProviderError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Could not generate the learning plan.";
    redirect(`/paths/${pathId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/paths/${pathId}?message=Your%20learning%20roadmap%20is%20ready.`);
}
