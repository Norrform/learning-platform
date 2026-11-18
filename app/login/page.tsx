import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { AuthShell } from "@/app/components/AuthShell";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const q = await searchParams;
  return (
    <AuthShell eyebrow="WELCOME BACK" title="Good to have you back." description="Sign in and pick up right where your learning journey left off."
      footer={<>New to Learnly? <Link className="text-link" href="/signup">Create a free account</Link></>}>
      {q.error && <p className="error" role="alert">{q.error}</p>}
      {q.message && <p className="success" role="status">{q.message}</p>}
      <form action={signIn}>
        <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
        <div className="field"><div className="field-label-row"><label htmlFor="password">Password</label><Link className="text-link small-link" href="/forgot-password">Forgot password?</Link></div><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Your password" required /></div>
        <button className="button full auth-submit">Sign in <span aria-hidden="true">→</span></button>
      </form>
      <p className="auth-inline-help">Having trouble confirming your email? <Link className="text-link" href="/check-email">Resend confirmation</Link></p>
    </AuthShell>
  );
}
