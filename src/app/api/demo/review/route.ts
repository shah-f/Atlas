import { NextResponse } from "next/server";
import { markDemoStayReviewed } from "@/lib/reviewiq/demo-store";
import type { AnswerPreview } from "@/lib/reviewiq/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      customerId?: string;
      stayId?: string;
      reviewText?: string;
      polishedText?: string | null;
      answerPreviews?: AnswerPreview[];
    };

    if (!body.customerId || !body.stayId || typeof body.reviewText !== "string") {
      return NextResponse.json({ error: "Missing customerId, stayId, or reviewText." }, { status: 400 });
    }

    const customer = markDemoStayReviewed({
      customerId: body.customerId,
      stayId: body.stayId,
      reviewText: body.reviewText,
      polishedText: typeof body.polishedText === "string" ? body.polishedText : null,
      answerPreviews: Array.isArray(body.answerPreviews) ? body.answerPreviews : []
    });

    return NextResponse.json({ customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save demo review.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
