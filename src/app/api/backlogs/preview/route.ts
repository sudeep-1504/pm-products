import { NextResponse } from "next/server";
import { parseSpreadsheet } from "@/lib/domain/file-parse";
import { suggestColumnMapping } from "@/lib/domain/column-mapping";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { headers, rows } = parseSpreadsheet(buffer, file.name);
    const suggestedMapping = suggestColumnMapping(headers);

    return NextResponse.json({
      headers,
      rowCount: rows.length,
      sampleRows: rows.slice(0, 5),
      suggestedMapping,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse file." },
      { status: 400 }
    );
  }
}
