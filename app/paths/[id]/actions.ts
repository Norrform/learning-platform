"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AIProviderError, createAICompletion, parseAIJson, type ChatMessage } from "@/lib/ai/provider";

type LessonModule = {
  title: string;
  summary: string;
  lesson: string;
  objectives: string[];
  concepts: string[];
  quiz_question: string;
  quiz_options: string[];
  quiz_answer_index: number;
  quiz_explanation: string;
};

function isLessonModule(value: unknown): value is LessonModule {
  if (!value || typeof value !== "object") return false;
  const lesson = value as LessonModule;
  return typeof lesson.title === "string" && lesson.title.length > 2
    && typeof lesson.summary === "string"
    && typeof lesson.lesson === "string" && lesson.lesson.length >= 250
    && Array.isArray(lesson.objectives) && lesson.objectives.length >= 2 && lesson.objectives.every((item) => typeof item === "string")
    && Array.isArray(lesson.concepts) && lesson.concepts.length >= 2 && lesson.concepts.every((item) => typeof item === "string")
    && typeof lesson.quiz_question === "string"
    && Array.isArray(lesson.quiz_options) && lesson.quiz_options.length === 4 && lesson.quiz_options.every((item) => typeof item === "string")
    && Number.isInteger(lesson.quiz_answer_index) && lesson.quiz_answer_index >= 0 && lesson.quiz_answer_index < 4
    && typeof lesson.quiz_explanation === "string";
}

export async function generateNextModule(formData: FormData) {
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

  const [{ data: previousModules }, { data: mastery }] = await Promise.all([
    supabase.from("modules").select("position,title,summary").eq("learning_path_id", pathId).order("position", { ascending: false }).limit(8),
    supabase.from("concept_mastery").select("concept_key,mastery_score,confidence").eq("learning_path_id", pathId).eq("user_id", userId).limit(12),
  ]);

  const position = (previousModules?.[0]?.position || 0) + 1;
  const plan = (path.preferences as { plan?: { modules?: Array<{ title: string; purpose: string; concepts: string[]; outcomes: string[] }> } } | null)?.plan;
  const plannedStep = plan?.modules?.[position - 1];
  const previousContext = (previousModules || []).reverse().map((module) =>
    `Lesson ${module.position}: ${module.title} — ${module.summary || ""}`
  ).join("\n");
  const masteryContext = (mastery || []).map((item) =>
    `${item.concept_key}: ${item.mastery_score}% (${item.confidence || "unknown"} confidence)`
  ).join("\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "You are Learnly's curriculum writer and expert teacher.",
        "Create exactly one complete, accurate, learner-friendly lesson as valid JSON.",
        "Teach the learner, do not merely summarize. Start with a clear explanation, build concepts in a logical order, and include at least one concrete worked example or real-world application.",
        "Use accessible language for the stated level, define technical terms, and avoid unnecessary jargon.",
        "Do not repeat previous lessons. Respect the roadmap step when one is provided. If learner mastery is weak, briefly reinforce prerequisites before introducing new material.",
        "The lesson must be 350 to 650 words and contain 2 to 5 objectives and 2 to 6 concepts.",
        "Create one meaningful four-option multiple-choice question. There must be exactly one best answer. The explanation must explain why the correct answer is right.",
        "Do not invent citations or claim to have consulted sources. Be precise and flag genuine uncertainty.",
        "Return JSON with title, summary, lesson, objectives, concepts, quiz_question, quiz_options, quiz_answer_index, quiz_explanation.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Learning path: ${path.title}`,
        `Subject: ${path.subject}`,
        `Goal: ${path.goal || "Build a strong understanding"}`,
        `Current level: ${path.current_level || "Beginner"}`,
        `Target level: ${path.target_level || "Confident understanding"}`,
        `This is lesson number: ${position}`,
        `Roadmap step: ${plannedStep ? JSON.stringify(plannedStep) : "No roadmap generated; choose the most logical next topic."}`,
        `Previous lessons (newest first):\n${previousContext || "None"}`,
        `Recorded concept mastery:\n${masteryContext || "No assessment data yet"}`,
      ].join("\n\n"),
    },
  ];

  try {
    const raw = await createAICompletion(messages, { json: true, temperature: 0.25, maxTokens: 2400 });
    const generated = parseAIJson(raw, isLessonModule);

    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .insert({
        learning_path_id: pathId,
        position,
        title: generated.title.slice(0, 160),
        summary: generated.summary.slice(0, 500),
        content: {
          lesson: generated.lesson,
          objectives: generated.objectives.slice(0, 5),
          concepts: generated.concepts.slice(0, 6),
        },
        status: "available",
      })
      .select("id")
      .single();

    if (moduleError || !module) {
      throw new Error("The lesson was generated but could not be saved. Please try again.");
    }

    const { error: activityError } = await supabase.from("learning_activities").insert({
      module_id: module.id,
      position: 1,
      activity_type: "quiz",
      title: "Check your understanding",
      content: {
        question: generated.quiz_question,
        options: generated.quiz_options,
        answer_index: generated.quiz_answer_index,
        explanation: generated.quiz_explanation,
      },
    });

    if (activityError) {
      await supabase.from("modules").delete().eq("id", module.id);
      throw new Error("The lesson could not be completed with its assessment. Please try again.");
    }
  } catch (error) {
    const message = error instanceof AIProviderError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Could not generate the next lesson.";
    redirect(`/paths/${pathId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/paths/${pathId}?message=Your%20next%20lesson%20is%20ready.`);
}
