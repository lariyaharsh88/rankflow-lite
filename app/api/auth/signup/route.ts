import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request.");
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const name = body.name?.trim().slice(0, 80) ?? "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Enter a valid email address.");
  if (password.length < 8) return jsonError("Password must be at least 8 characters.");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return jsonError("An account with this email already exists. Sign in instead.", 409);

  const user = await db.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
  });
  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true });
}
