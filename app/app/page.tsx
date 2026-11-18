import { redirect } from "next/navigation";
import DashboardWorkspace from "@/app/components/DashboardWorkspace";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");

  const userId = String(claims.sub);
  const email = typeof claims.email === "string" ? claims.email : "";
  const metadata = claims.user_metadata as { display_name?: string } | undefined;
  const preferredName = metadata?.display_name?.trim() || email.split("@")[0] || "Learner";

  const profileWrite = await supabase.from("profiles").upsert(
    metadata?.display_name
      ? { id: userId, display_name: metadata.display_name }
      : { id: userId },
    { onConflict: "id" },
  ).select("display_name,workspace_data").single();

  const displayName = profileWrite.data?.display_name?.trim() || preferredName;
  const workspace = profileWrite.data?.workspace_data && typeof profileWrite.data.workspace_data === "object"
    ? profileWrite.data.workspace_data
    : {};

  const { data: paths } = await supabase
    .from("learning_paths")
    .select("id,title,subject,goal,status,current_level,target_level")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const pathIds = (paths || []).map((path) => path.id);
  const [moduleResult, attemptResult, masteryResult] = await Promise.all([
    pathIds.length
      ? supabase.from("modules").select("id,learning_path_id,title,status,position").in("learning_path_id", pathIds).order("position")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("learning_attempts").select("id,score,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("concept_mastery").select("concept_key,mastery_score").eq("user_id", userId).order("updated_at", { ascending: false }).limit(50),
  ]);

  return (
    <DashboardWorkspace
      user={{ id: userId, displayName, email }}
      initialWorkspace={workspace}
      paths={paths || []}
      modules={moduleResult.data || []}
      attempts={attemptResult.data || []}
      mastery={masteryResult.data || []}
    />
  );
}
