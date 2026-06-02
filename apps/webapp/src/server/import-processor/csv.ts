import type { RegistryImportSpec } from "../import-specs";
import type { CsvTable, ImportDatasetKey, ImportIssue } from "./types";

export function dateToIsoDateTime(value: Date): string {
  return value.toISOString();
}

export function dateToIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function normalizeCell(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

export function parseCsvTable(dataset: ImportDatasetKey, text: string, issues: ImportIssue[]): CsvTable {
  const csvRows = parseCsv(text.replace(/^\uFEFF/u, ""));
  const [headerRow, ...bodyRows] = csvRows;

  if (!headerRow) {
    issues.push({
      dataset,
      message: "CSV is empty."
    });

    return {
      headers: [],
      rows: []
    };
  }

  const headers = headerRow.map((header) => header.trim());
  const rows = bodyRows.map((bodyRow) =>
    Object.fromEntries(headers.map((header, index) => [header, bodyRow[index]?.trim() ?? ""]))
  );

  return {
    headers,
    rows
  };
}

export function validateHeaders(dataset: ImportDatasetKey, spec: RegistryImportSpec, table: CsvTable, issues: ImportIssue[]): void {
  const headerSet = new Set(table.headers);

  for (const field of spec.fields) {
    if (field.required && !headerSet.has(field.key)) {
      issues.push({
        dataset,
        field: field.key,
        message: `Missing required column ${field.key}.`
      });
    }
  }
}

export function addRequiredIssue(
  issues: ImportIssue[],
  dataset: ImportDatasetKey,
  row: number,
  field: string
): void {
  issues.push({
    dataset,
    field,
    row,
    message: `${field} is required.`
  });
}

export function validateUniqueCodes(
  issues: ImportIssue[],
  dataset: ImportDatasetKey,
  rows: Array<Record<string, string>>,
  field: string
): void {
  const seen = new Map<string, number>();

  rows.forEach((row, index) => {
    const value = normalizeCell(row[field]);

    if (!value) {
      return;
    }

    const existingRow = seen.get(value);

    if (existingRow !== undefined) {
      issues.push({
        dataset,
        field,
        row: index + 2,
        message: `${field} duplicates row ${existingRow}.`
      });
      return;
    }

    seen.set(value, index + 2);
  });
}

export function parseCurrency(value: string | undefined): number | null {
  const normalized = value?.replace(/[$,]/gu, "").trim();

  if (!normalized) {
    return null;
  }

  const dollars = Number.parseFloat(normalized);

  if (Number.isNaN(dollars)) {
    return null;
  }

  return Math.round(dollars * 100);
}
