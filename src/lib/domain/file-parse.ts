import * as XLSX from "xlsx";

export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_ROWS = 5000;

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parses an uploaded CSV/XLSX buffer into headers + row objects.
 *
 * The xlsx (SheetJS) package on npm carries known prototype-pollution/ReDoS
 * advisories with no upstream fix on the registry build. Since this parses
 * untrusted user uploads, we defend by: capping file size and row count
 * up front, reading with `cellFormula: false` / `bookVBA: false` so no
 * formula or macro parsing paths run, and never touching `raw` cell HTML.
 */
export function parseSpreadsheet(buffer: Buffer, fileName: string): ParsedSheet {
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error(`File exceeds the ${MAX_FILE_BYTES / (1024 * 1024)}MB limit.`);
  }

  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellFormula: false,
    cellHTML: false,
    bookVBA: false,
    WTF: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error(`No sheet found in ${fileName}.`);
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rows.length > MAX_ROWS) {
    throw new Error(`File has ${rows.length} rows, exceeding the ${MAX_ROWS} row limit.`);
  }
  if (rows.length === 0) {
    throw new Error("No data rows found.");
  }

  const headers = Object.keys(rows[0]);
  return { headers, rows };
}
