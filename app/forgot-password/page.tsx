import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthShell } from "@/app/components/AuthShell";

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const q = await searchParams;
  return (
    <AuthShell eyebrow="ACCOUNT RECOVERY" title="Let’s get you back in." description="Enter the email address on your account. If it matches, we’ll send you a secure password reset link."
      footer={<>Remembered your password? <Link className="text-link" href="/login">Back to sign in</Link></>}>
      {q.error && <p className="error" role="alert">{q.error}</p>}
      {q.message && <p className="success" role="status">{q.message}</p>}
      <form action={requestPasswordReset}>
        <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
        <button className="button full auth-submit">Send reset link <span aria-hidden="true">→</span></button>
      </form>
      <p className="auth-inline-help">No email after a few minutes? Check your spam or junk folder.</p>
    </AuthShell>
  );
}
