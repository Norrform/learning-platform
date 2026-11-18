import Link from "next/link";
import { updatePassword } from "@/app/auth/actions";
import { AuthShell } from "@/app/components/AuthShell";

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const q = await searchParams;
  return (
    <AuthShell eyebrow="SECURE YOUR ACCOUNT" title="Choose a new password." description="Make it something unique that you haven’t used on another site."
      footer={<Link className="text-link" href="/login">Return to sign in</Link>}>
      {q.error && <p className="error" role="alert">{q.error}</p>}
      <form action={updatePassword}>
        <div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={8} autoComplete="new-password" placeholder="At least 8 characters" required /></div>
        <button className="button full auth-submit">Save new password <span aria-hidden="true">→</span></button>
      </form>
    </AuthShell>
  );
}
