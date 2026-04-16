import { NextResponse } from "next/server";
import { resetDemoStore } from "@/lib/reviewiq/demo-store";

export async function POST() {
  try {
    const customers = await resetDemoStore();
    return NextResponse.json({ customers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset demo data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
