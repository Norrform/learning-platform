import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateNextModule } from "./actions";
import { generateLearningPlan } from "./plan-actions";
import Tutor from "@/app/components/Tutor";
import Quiz from "@/app/components/Quiz";

type PlanStep = {
  title: string;
  purpose: string;
  concepts: string[];
  outcomes: string[];
  estimated_minutes: number;
};

type LearningPlan = { overview: string; modules: PlanStep[] };

export default async function PathPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: path } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!path) notFound();

  const [{ data: modules }, { data: mastery }] = await Promise.all([
    supabase.from("modules").select("id,position,title,summary,content,status").eq("learning_path_id", id).order("position"),
    supabase.from("concept_mastery").select("concept_key,mastery_score,confidence").eq("learning_path_id", id).eq("user_id", userId).order("updated_at", { ascending: false }).limit(10),
  ]);

  const moduleIds = (modules || []).map((module) => module.id);
  const { data: activities } = moduleIds.length
    ? await supabase.from("learning_activities").select("id,module_id,title,content,activity_type").in("module_id", moduleIds).order("position")
    : { data: [] };

  const plan = (path.preferences as { plan?: LearningPlan } | null)?.plan;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/">✳ learnly<span>.</span></Link>
          <div className="muted"><Link href="/app">← Dashboard</Link> / Learning path</div>
        </div>
        <form action="/auth/signout" method="post"><button className="button">Sign out</button></form>
      </header>

      <section className="panel">
        <div className="eyebrow">{path.subject.toUpperCase()} · YOUR LEARNING PATH</div>
        <h1 style={{ font: "800 34px Manrope", margin: "8px 0" }}>{path.title}</h1>
        <p className="muted">{path.goal || "A learning journey shaped around your goal."}</p>
        <span className="tag">Starting: {path.current_level}</span>{" "}
        <span className="tag">Target: {path.target_level}</span>{" "}
        <span className="tag">{modules?.length || 0} modules generated</span>
        {query.error && <p className="error" style={{ marginTop: 16 }}>{query.error}</p>}
        {query.message && <p className="success" style={{ marginTop: 16 }}>{query.message}</p>}
      </section>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
          <div>
            <div className="eyebrow">YOUR PERSONAL ROADMAP</div>
            <h2>Learning plan</h2>
            <p className="muted">Learnly organizes the subject into connected steps based on your goal and starting level.</p>
          </div>
          <form action={generateLearningPlan}>
            <input type="hidden" name="pathId" value={id} />
            <button className="button">{plan ? "Regenerate roadmap" : "Create my roadmap"} ✦</button>
          </form>
        </div>
        {plan?.overview && <p>{plan.overview}</p>}
        {plan?.modules?.length ? (
          <div className="path-list">
            {plan.modules.map((step, index) => (
              <article className="path-card" key={index} style={{ display: "block" }}>
                <div className="eyebrow">STEP {index + 1} · ABOUT {step.estimated_minutes} MIN</div>
                <h3>{step.title}</h3>
                <p className="muted">{step.purpose}</p>
                <p><strong>You'll explore:</strong> {step.concepts.join(" · ")}</p>
                <ul>{step.outcomes.map((outcome, outcomeIndex) => <li key={outcomeIndex}>{outcome}</li>)}</ul>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">Your personalized roadmap hasn't been generated yet. Create it to see the recommended order of topics.</div>
        )}
      </section>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
          <div>
            <h2>Your lessons</h2>
            <p className="muted">Generate one module at a time. Your previous modules stay saved.</p>
          </div>
          <form action={generateNextModule}>
            <input type="hidden" name="pathId" value={id} />
            <button className="button">Generate next lesson ✦</button>
          </form>
        </div>
        {modules?.length ? modules.map((module) => (
          <article className="activity" key={module.id}>
            <div className="eyebrow">LESSON {module.position}</div>
            <h3 style={{ font: "700 19px Manrope", margin: "6px 0" }}>{module.title}</h3>
            <p className="muted">{module.summary}</p>
            <div className="lesson-copy">{module.content?.lesson || ""}</div>
            {Array.isArray(module.content?.objectives) && (
              <>
                <h4>By the end, you should be able to:</h4>
                <ul>{module.content.objectives.map((objective: string, index: number) => <li key={index}>{objective}</li>)}</ul>
              </>
            )}
            {(activities || []).filter((activity) => activity.module_id === module.id).map((activity) => (
              <Quiz
                key={activity.id}
                activityId={activity.id}
                question={String(activity.content?.question || "Check your understanding")}
                options={Array.isArray(activity.content?.options) ? activity.content.options : []}
              />
            ))}
          </article>
        )) : (
          <div className="empty" style={{ marginTop: 16 }}>No lessons yet. Generate your first lesson after connecting an AI provider.</div>
        )}
      </section>

      <section className="panel">
        <h2>Learning progress</h2>
        {mastery?.length ? (
          <div className="path-list">
            {mastery.map((item) => (
              <div className="path-card" key={item.concept_key}>
                <strong>{item.concept_key.replace(/-/g, " ")}</strong>
                <p className="muted">{item.mastery_score}% estimated mastery · {item.confidence || "not rated"} confidence</p>
              </div>
            ))}
          </div>
        ) : <p className="muted">Your progress will appear here as you complete assessments.</p>}
      </section>

      <Tutor pathId={id} />
      <p className="footer-note">Learnly uses AI-generated explanations. They can be wrong and should be checked for important decisions. Trusted external-source retrieval and citations are not enabled yet.</p>
    </main>
  );
}
