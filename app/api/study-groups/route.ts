import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: typeof data?.claims?.sub === "string" ? data.claims.sub : null };
}

export async function GET() {
  const { supabase, userId } = await getUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to view study groups." }, { status: 401 });

  const { data: memberships, error: membershipError } = await supabase
    .from("study_group_members").select("group_id,role").eq("user_id", userId);
  if (membershipError) return NextResponse.json({ error: "Could not load your study groups." }, { status: 500 });

  const ids = (memberships ?? []).map((item) => item.group_id);
  if (!ids.length) return NextResponse.json({ groups: [], notes: [] });

  const [{ data: groups, error: groupError }, { data: notes, error: notesError }] = await Promise.all([
    supabase.from("study_groups").select("id,name,description,invite_code,owner_id,created_at").in("id", ids).order("created_at", { ascending: false }),
    supabase.from("study_group_notes").select("id,group_id,author_id,title,body,created_at,updated_at").in("group_id", ids).order("created_at", { ascending: false }).limit(200),
  ]);
  if (groupError || notesError) return NextResponse.json({ error: "Could not load group content." }, { status: 500 });

  const roleByGroup = new Map((memberships ?? []).map((item) => [item.group_id, item.role]));
  return NextResponse.json({
    groups: (groups ?? []).map((group) => ({ ...group, role: roleByGroup.get(group.id) ?? "member" })),
    notes: notes ?? [],
  });
}

export async function POST(request: Request) {
  const { supabase, userId } = await getUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to manage study groups." }, { status: 401 });

  const raw = await request.text();
  if (raw.length > 16_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const input = body as Record<string, unknown>;
  const action = input.action;

  if (action === "create") {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const description = typeof input.description === "string" ? input.description.trim() : "";
    if (name.length < 3 || name.length > 50 || description.length > 300) return NextResponse.json({ error: "Use a group name of 3–50 characters and a description under 300 characters." }, { status: 400 });
    const { data, error } = await supabase.rpc("create_study_group", { p_name: name, p_description: description });
    if (error || !data) return NextResponse.json({ error: error?.message || "Could not create the group." }, { status: 400 });
    return NextResponse.json({ ok: true, groupId: data });
  }

  if (action === "join") {
    const code = typeof input.inviteCode === "string" ? input.inviteCode.trim().toUpperCase() : "";
    if (!/^[A-F0-9]{12}$/.test(code)) return NextResponse.json({ error: "Enter a valid 12-character invite code." }, { status: 400 });
    const { data, error } = await supabase.rpc("join_study_group", { p_invite_code: code });
    if (error || !data) return NextResponse.json({ error: error?.message || "Could not join that group." }, { status: 400 });
    return NextResponse.json({ ok: true, groupId: data });
  }

  if (action === "leave") {
    const groupId = typeof input.groupId === "string" ? input.groupId : "";
    if (!uuidPattern.test(groupId)) return NextResponse.json({ error: "Invalid group." }, { status: 400 });
    const { data, error } = await supabase.rpc("leave_study_group", { p_group_id: groupId });
    if (error || !data) return NextResponse.json({ error: error?.message || "Could not leave that group." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const groupId = typeof input.groupId === "string" ? input.groupId : "";
    if (!uuidPattern.test(groupId)) return NextResponse.json({ error: "Invalid group." }, { status: 400 });
    const { data, error } = await supabase.from("study_groups").delete().eq("id", groupId).eq("owner_id", userId).select("id").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Only the group owner can delete this group." }, { status: 403 });
    return NextResponse.json({ ok: true });
  }

  if (action === "add_note") {
    const groupId = typeof input.groupId === "string" ? input.groupId : "";
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const noteBody = typeof input.body === "string" ? input.body.trim() : "";
    if (!uuidPattern.test(groupId) || !title || title.length > 120 || noteBody.length > 12_000) return NextResponse.json({ error: "Add a title and keep the note within the allowed length." }, { status: 400 });
    const { data, error } = await supabase.from("study_group_notes").insert({ group_id: groupId, author_id: userId, title, body: noteBody }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "Could not share this note. Check that you are still a group member." }, { status: 400 });
    return NextResponse.json({ ok: true, noteId: data.id });
  }

  if (action === "delete_note") {
    const noteId = typeof input.noteId === "string" ? input.noteId : "";
    if (!uuidPattern.test(noteId)) return NextResponse.json({ error: "Invalid note." }, { status: 400 });
    const { data, error } = await supabase.from("study_group_notes").delete().eq("id", noteId).eq("author_id", userId).select("id").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Only the note author can remove this note." }, { status: 403 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown study group action." }, { status: 400 });
}
