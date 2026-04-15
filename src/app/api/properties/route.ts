import { NextResponse } from "next/server";
import { getCatalogData } from "@/lib/reviewiq/runtime-data";

export async function GET() {
  const catalog = getCatalogData();
  return NextResponse.json({
    generatedAt: catalog.generatedAt,
    properties: catalog.properties
  });
}
