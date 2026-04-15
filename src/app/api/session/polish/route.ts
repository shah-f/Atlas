import { NextResponse } from "next/server";
import { polishReviewText } from "@/lib/reviewiq/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      reviewText?: string;
      locale?: string;
      languageCode?: string;
    };

    if (typeof body.reviewText !== "string") {
      return NextResponse.json({ error: "Missing reviewText." }, { status: 400 });
    }

    const polished = await polishReviewText(
      body.reviewText,
      body.locale ?? "en-US",
      body.languageCode ?? "en"
    );

    return NextResponse.json(polished);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to polish review.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
