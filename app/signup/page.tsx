import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { AuthShell } from "@/app/components/AuthShell";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const q = await searchParams;
  return (
    <AuthShell eyebrow="YOUR NEXT CHAPTER" title="Make learning yours." description="Create your free account. You can shape your learning space as you go."
      footer={<>Already have an account? <Link className="text-link" href="/login">Sign in</Link></>}>
      {q.error && <p className="error" role="alert">{q.error}</p>}
      <form action={signUp}>
        <div className="field"><label htmlFor="displayName">What should we call you? <span className="optional">(optional)</span></label><input id="displayName" name="displayName" maxLength={60} autoComplete="name" placeholder="Your name" /></div>
        <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
        <div className="field"><label htmlFor="password">Create a password</label><input id="password" name="password" type="password" minLength={8} autoComplete="new-password" placeholder="At least 8 characters" required /><p className="field-hint">Use at least 8 characters. A unique password is best.</p></div>
        <button className="button full auth-submit">Create my account <span aria-hidden="true">→</span></button>
      </form>
      <p className="auth-inline-help">After signing up, we’ll email you a confirmation link before your first sign-in.</p>
    </AuthShell>
  );
}
