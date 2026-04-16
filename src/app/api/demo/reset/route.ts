import { NextResponse } from "next/server";
import { resetDemoStore } from "@/lib/reviewiq/demo-store";

export async function POST() {
  try {
    await resetDemoStore();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset demo data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
