import { NextResponse } from "next/server";
import { startSession } from "@/lib/reviewiq/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      propertyId?: string;
      reviewText?: string;
      ratings?: Record<string, number | null>;
      locale?: string;
      count?: number;
      excludeAttributeKeys?: string[];
    };

    if (!body.propertyId) {
      return NextResponse.json({ error: "Missing propertyId." }, { status: 400 });
    }

    const result = await startSession(body.propertyId, {
      reviewText: body.reviewText ?? "",
      ratings: body.ratings ?? {},
      locale: body.locale ?? "en-US"
    }, {
      count: typeof body.count === "number" ? body.count : 1,
      excludeAttributeKeys: Array.isArray(body.excludeAttributeKeys) ? body.excludeAttributeKeys : []
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
