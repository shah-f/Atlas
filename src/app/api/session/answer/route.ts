import { NextResponse } from "next/server";
import { previewAnswer } from "@/lib/reviewiq/session";
import type { SessionQuestion } from "@/lib/reviewiq/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      question?: SessionQuestion;
      answer?: string;
    };

    if (!body.question || typeof body.answer !== "string") {
      return NextResponse.json({ error: "Missing question or answer." }, { status: 400 });
    }

    return NextResponse.json({
      preview: previewAnswer(body.question, body.answer)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to preview answer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
