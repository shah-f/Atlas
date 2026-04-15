import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

type ImageInput = {
  id: string;
  dataUrl: string;
};

function fallbackLabel(index: number) {
  if (index === 0) {
    return "Guest room";
  }

  if (index === 1) {
    return "Property amenity";
  }

  return "On-site detail";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      images?: ImageInput[];
    };

    const images = body.images?.filter((image) => image.id && image.dataUrl) ?? [];
    if (!images.length) {
      return NextResponse.json({ labels: [] });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        labels: images.map((image, index) => ({
          id: image.id,
          label: fallbackLabel(index)
        }))
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_VISION_MODEL,
        text: {
          format: {
            type: "json_object"
          }
        },
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: [
                  "Return JSON only.",
                  'Use the shape {"labels":[{"id":"...","label":"..."}]}.',
                  "Write one short hotel-photo label per image.",
                  "Keep each label under five words.",
                  "Prefer concrete hospitality nouns like guest room, lobby, pool, bathroom, breakfast spread, balcony, workspace, exterior."
                ].join(" ")
              }
            ]
          },
          {
            role: "user",
            content: images.flatMap((image) => [
              {
                type: "input_text",
                text: `Image id: ${image.id}`
              },
              {
                type: "input_image",
                image_url: image.dataUrl
              }
            ])
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Vision request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      output_text?: string;
    };

    const parsed = payload.output_text ? JSON.parse(payload.output_text) : null;
    const labels = Array.isArray(parsed?.labels)
      ? parsed.labels
          .filter((item: { id?: string; label?: string }) => item?.id && item?.label)
          .map((item: { id: string; label: string }) => ({
            id: item.id,
            label: item.label.trim()
          }))
      : [];

    if (!labels.length) {
      throw new Error("No image labels returned.");
    }

    return NextResponse.json({ labels });
  } catch {
    return NextResponse.json({
      labels: []
    });
  }
}
