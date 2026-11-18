import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createLearningPath } from "@/app/actions";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const q = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");

  const userId = String(claims.sub);
  const email = typeof claims.email === "string" ? claims.email : "";
  const metadata = claims.user_metadata as { display_name?: string } | undefined;
  const displayName = metadata?.display_name?.trim() || email.split("@")[0] || "Learner";

  await supabase.from("profiles").upsert({ id: userId, display_name: metadata?.display_name || null }, { onConflict: "id" });
  const { data: paths } = await supabase.from("learning_paths")
    .select("id,title,subject,goal,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const learningPaths = paths || [];
  const activeCount = learningPaths.filter((path) => path.status !== "completed").length;
  const completedCount = learningPaths.length - activeCount;

  return (
    <main className="learnly-dashboard">
      <header className="dash-topbar">
        <Link className="dash-brand" href="/app">learnly<span>.</span></Link>
        <nav className="dash-nav" aria-label="Main navigation">
          <Link className="active" href="/app">My learning</Link>
          <a href="#your-paths">My paths</a>
          <a href="#create-path">Create path</a>
        </nav>
        <div className="dash-account">
          <span className="dash-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
          <span className="dash-account-name">{displayName}</span>
          <form action="/auth/signout" method="post"><button className="dash-signout">Sign out</button></form>
        </div>
      </header>

      <div className="dash-content">
        <section className="dash-welcome">
          <div className="dash-welcome-copy">
            <div className="dash-kicker"><span className="dash-kicker-dot" /> YOUR PERSONAL LEARNING SPACE</div>
            <h1>Make today a little<br /><span>smarter.</span></h1>
            <p>Good to see you, {displayName}. What are you curious about today?</p>
            <a className="dash-primary-cta" href="#create-path">Start learning <span>↗</span></a>
          </div>
          <div className="dash-orbit-art" aria-hidden="true">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="orbit-core"><span>✳</span></div>
            <div className="orbit-chip chip-top">IDEAS <b>✦</b></div>
            <div className="orbit-chip chip-right">GROWTH <b>↗</b></div>
            <div className="orbit-chip chip-bottom">CURIOSITY <b>∞</b></div>
          </div>
          <div className="dash-welcome-glow" />
        </section>

        {q.error && <p className="error" role="alert">{q.error}</p>}
        {q.message && <p className="success" role="status">{q.message}</p>}

        <section className="dash-stats" aria-label="Learning overview">
          <article className="dash-stat"><span className="dash-stat-icon lavender">✦</span><div><strong>{learningPaths.length}</strong><span>Learning paths</span></div></article>
          <article className="dash-stat"><span className="dash-stat-icon mint">↗</span><div><strong>{activeCount}</strong><span>In progress</span></div></article>
          <article className="dash-stat"><span className="dash-stat-icon peach">✓</span><div><strong>{completedCount}</strong><span>Completed</span></div></article>
          <article className="dash-stat stat-note"><span className="dash-stat-icon sky">◎</span><div><strong>Your pace</strong><span>One step at a time</span></div></article>
        </section>

        <div className="dash-main-grid">
          <section className="dash-section" id="your-paths">
            <div className="dash-section-heading">
              <div><div className="dash-section-kicker">PICK UP WHERE YOU LEFT OFF</div><h2>Your learning paths</h2></div>
              <span className="dash-count">{learningPaths.length} {learningPaths.length === 1 ? "path" : "paths"}</span>
            </div>
            {learningPaths.length ? (
              <div className="dash-path-grid">
                {learningPaths.map((path, index) => (
                  <Link className="dash-path-card" href={"/paths/" + path.id} key={path.id}>
                    <div className={"dash-path-art art-" + (index % 4)}><span>{path.subject.slice(0, 1).toUpperCase()}</span><i>✦</i></div>
                    <div className="dash-path-info">
                      <div className="dash-path-meta"><span>{path.subject}</span><span className="dash-status">{path.status === "completed" ? "COMPLETED" : "IN PROGRESS"}</span></div>
                      <h3>{path.title}</h3>
                      <p>{path.goal || "A learning journey built around your goals."}</p>
                      <div className="dash-path-open">Open learning path <span>→</span></div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dash-empty">
                <div className="dash-empty-icon">✳</div>
                <h3>Your next big idea starts here.</h3>
                <p>Create your first learning path and let Learnly help you break a big subject into manageable steps.</p>
                <a className="dash-empty-link" href="#create-path">Create your first path <span>→</span></a>
              </div>
            )}
          </section>

          <aside className="dash-create-card" id="create-path">
            <div className="dash-create-icon">✧</div>
            <div className="dash-section-kicker">A NEW THING TO EXPLORE</div>
            <h2>What do you want to learn?</h2>
            <p>Tell Learnly where you want to go. You can adjust your learning plan as you grow.</p>
            <form action={createLearningPath} className="dash-create-form">
              <label htmlFor="title">Give your path a name</label>
              <input id="title" name="title" placeholder="e.g. Learn web development" required maxLength={100} />
              <label htmlFor="subject">What subject is it about?</label>
              <input id="subject" name="subject" placeholder="e.g. HTML, CSS and JavaScript" required maxLength={80} />
              <label htmlFor="goal">What is your goal? <span>OPTIONAL</span></label>
              <textarea id="goal" name="goal" rows={3} placeholder="Build my first website, prepare for an exam..." />
              <div className="dash-form-row">
                <div><label htmlFor="current_level">Starting level</label><select id="current_level" name="current_level"><option>Beginner</option><option>Some knowledge</option><option>Intermediate</option><option>Advanced</option></select></div>
                <div><label htmlFor="target_level">Target level</label><select id="target_level" name="target_level"><option>Confident understanding</option><option>School exam readiness</option><option>Practical application</option><option>Advanced mastery</option></select></div>
              </div>
              <button className="dash-create-submit">Build my learning path <span>✦</span></button>
            </form>
            <div className="dash-create-foot"><span>✧</span> Your plan can change whenever you do.</div>
          </aside>
        </div>
        <footer className="dash-footer"><span className="dash-brand-small">learnly<span>.</span></span><span>Curiosity looks good on you.</span><a href="#top">Back to top ↑</a></footer>
      </div>
    </main>
  );
}
