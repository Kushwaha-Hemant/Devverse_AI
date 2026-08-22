import { NextResponse } from "next/server";
import { profile } from "@/content/profile";

export const runtime = "nodejs";

type Body = { name?: string; email?: string; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email and message are all required." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "That email address doesn't look valid." },
      { status: 400 },
    );
  }
  if (message.length > 4000) {
    return NextResponse.json(
      { error: "Message is too long (4000 characters max)." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL ?? profile.email;

  // Be explicit rather than pretending a message was delivered.
  if (!apiKey) {
    // Deliberately does not log name, email or message. Cloudflare Workers logs
    // are retained and readable by anyone with dashboard access, and a contact
    // form is exactly where personal data arrives — writing it there turns a
    // missing API key into a privacy problem. Only the shape is recorded.
    console.info(
      "[contact] Resend not configured; submission dropped.",
      { messageLength: message.length },
    );
    return NextResponse.json({
      message:
        `Email delivery isn't configured on this deployment yet, so nothing was sent. ` +
        `Please email ${to} directly — sorry for the detour.`,
    });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL ?? "portfolio@resend.dev",
        to: [to],
        reply_to: email,
        subject: `Portfolio message from ${name}`,
        text: `From: ${name} <${email}>\n\n${message}`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[contact] Resend rejected the request:", detail);
      return NextResponse.json(
        { error: `Couldn't send right now. Email ${to} directly.` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message: "Message sent. I'll get back to you shortly.",
    });
  } catch (err) {
    console.error("[contact] Send failed:", err);
    return NextResponse.json(
      { error: `Couldn't send right now. Email ${to} directly.` },
      { status: 502 },
    );
  }
}
