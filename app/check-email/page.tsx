import Link from "next/link";
import { resendEmailCode } from "@/app/auth/actions";
import { AuthShell } from "@/app/components/AuthShell";

export default async function CheckEmail({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; email?: string }> }) {
  const q = await searchParams;
  return (
    <AuthShell eyebrow="ONE LAST STEP" title="Verify your email." description="Enter the six-digit code we sent to your inbox to finish creating your account."
      footer={<>Already verified? <Link className="text-link" href="/login">Go to sign in</Link></>}>
      {q.error && <p className="error" role="alert">{q.error}</p>}
      {q.message && <p className="success" role="status">{q.message}</p>}
      <form action={resendEmailCode}>
        <input type="hidden" name="type" value="signup" />
        <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" defaultValue={q.email || ""} autoComplete="email" placeholder="you@example.com" required /></div>
        <button className="button full auth-submit">Send verification code <span aria-hidden="true">→</span></button>
      </form>
      <p className="auth-inline-help">After the code arrives, enter it on the verification screen to activate your account.</p>
    </AuthShell>
  );
}
