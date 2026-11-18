import Link from "next/link";
import { resendConfirmation } from "@/app/auth/actions";
import { AuthShell } from "@/app/components/AuthShell";

export default async function CheckEmail({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const q = await searchParams;
  return (
    <AuthShell eyebrow="ONE LAST STEP" title="Check your inbox." description="We’ve sent a confirmation link if your sign-up was accepted. Open it on this device to verify your email and finish creating your account."
      footer={<>Already confirmed? <Link className="text-link" href="/login">Go to sign in</Link></>}>
      <div className="email-step"><span className="email-step-icon" aria-hidden="true">✉</span><div><strong>Look for an email from Learnly</strong><p>It can take a minute or two. Check your spam or junk folder if it doesn’t show up.</p></div></div>
      {q.error && <p className="error" role="alert">{q.error}</p>}
      {q.message && <p className="success" role="status">{q.message}</p>}
      <form action={resendConfirmation}>
        <div className="field"><label htmlFor="email">Resend to email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
        <button className="button full auth-submit">Send another confirmation <span aria-hidden="true">→</span></button>
      </form>
      <p className="auth-inline-help">Still not receiving emails? The email delivery settings may need attention from the site administrator.</p>
    </AuthShell>
  );
}
