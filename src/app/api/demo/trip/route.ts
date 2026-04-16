import { NextResponse } from "next/server";
import { renameDemoTrip } from "@/lib/reviewiq/demo-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      customerId?: string;
      tripId?: string;
      title?: string;
    };

    if (!body.customerId || !body.tripId || typeof body.title !== "string") {
      return NextResponse.json({ error: "Missing customerId, tripId, or title." }, { status: 400 });
    }

    const customer = await renameDemoTrip({
      customerId: body.customerId,
      tripId: body.tripId,
      title: body.title
    });

    return NextResponse.json({ customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to rename trip.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
