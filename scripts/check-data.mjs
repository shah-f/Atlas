import fs from "node:fs/promises";
import path from "node:path";

const generatedDir = path.join(process.cwd(), "data", "generated");

async function main() {
  const qualityPath = path.join(generatedDir, "data-quality.json");
  const catalogPath = path.join(generatedDir, "catalog.json");
  const ragPath = path.join(generatedDir, "rag-index.json");

  const [qualityRaw, catalogRaw] = await Promise.all([
    fs.readFile(qualityPath, "utf8"),
    fs.readFile(catalogPath, "utf8")
  ]);

  const quality = JSON.parse(qualityRaw);
  const catalog = JSON.parse(catalogRaw);
  let rag = null;

  try {
    rag = JSON.parse(await fs.readFile(ragPath, "utf8"));
  } catch {
    rag = null;
  }

  console.log("Data quality summary");
  console.log(JSON.stringify(quality, null, 2));
  if (rag) {
    console.log("");
    console.log("RAG index summary");
    console.log(
      JSON.stringify(
        {
          chunkCount: rag.chunkCount,
          embeddingModel: rag.embeddingModel,
          dimensions: rag.dimensions
        },
        null,
        2
      )
    );
  }
  console.log("");
  console.log("Top properties by candidate gaps");

  for (const property of catalog.properties) {
    const topGap = property.candidateGaps[0];
    console.log(
      `${property.displayName}: ${topGap?.label ?? "No gaps"} (${topGap?.baseScore?.toFixed?.(2) ?? "n/a"})`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
