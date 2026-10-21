import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request.");
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return jsonError("Email or password is incorrect.", 401);
  }
  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true });
}
