import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return NextResponse.json({ error: "Sign in to view your friends." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("list_friend_connections");
  if (error) {
    return NextResponse.json({ error: "Could not load friends right now." }, { status: 500 });
  }

  return NextResponse.json({ connections: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return NextResponse.json({ error: "Sign in to manage friends." }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > 2_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

  let body: unknown;
  try { body = JSON.parse(raw); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const action = input.action;

  if (action === "send") {
    const friendCode = typeof input.friendCode === "string" ? input.friendCode.trim().toUpperCase() : "";
    if (!/^[A-F0-9]{8}$/.test(friendCode)) {
      return NextResponse.json({ error: "Enter a valid 8-character friend code." }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("send_friend_request", { p_friend_code: friendCode });
    if (error) return NextResponse.json({ error: error.message || "Could not send friend request." }, { status: 400 });
    return NextResponse.json({ ok: true, status: data });
  }

  if (action === "respond") {
    const friendshipId = typeof input.friendshipId === "string" ? input.friendshipId : "";
    const accept = input.accept === true;
    if (!/^[0-9a-f-]{36}$/i.test(friendshipId)) {
      return NextResponse.json({ error: "Invalid friend request." }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("respond_friend_request", {
      p_friendship_id: friendshipId,
      p_accept: accept,
    });
    if (error || !data) return NextResponse.json({ error: error?.message || "That request is no longer available." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "remove") {
    const friendshipId = typeof input.friendshipId === "string" ? input.friendshipId : "";
    if (!/^[0-9a-f-]{36}$/i.test(friendshipId)) {
      return NextResponse.json({ error: "Invalid friendship." }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("remove_friend", { p_friendship_id: friendshipId });
    if (error || !data) return NextResponse.json({ error: error?.message || "That friendship could not be removed." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown friend action." }, { status: 400 });
}
