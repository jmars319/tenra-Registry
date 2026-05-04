import { getGeneratedDocumentDetail } from "../../../../src/server/registry-data";

interface DocumentPdfRouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

function escapePdfText(value: string): string {
  return value.replace(/\\/gu, "\\\\").replace(/\(/gu, "\\(").replace(/\)/gu, "\\)");
}

function wrapLine(line: string, width = 88): string[] {
  if (line.length <= width) {
    return [line];
  }

  const words = line.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function getDocumentLines(title: string, body: string): string[][] {
  const bodyLines = body
    .split("\n")
    .flatMap((line) => (line.trim().length > 0 ? wrapLine(line) : [""]));
  const lines = [title, "", ...bodyLines];
  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += 52) {
    pages.push(lines.slice(index, index + 52));
  }

  return pages.length > 0 ? pages : [[title]];
}

function buildPageContent(lines: string[]): string {
  const commands = ["BT", "/F1 12 Tf", "72 750 Td"];

  lines.forEach((line, index) => {
    if (index === 0) {
      commands.push("/F1 18 Tf");
      commands.push(`(${escapePdfText(line)}) Tj`);
      commands.push("/F1 12 Tf");
      commands.push("0 -28 Td");
      return;
    }

    commands.push(`(${escapePdfText(line)}) Tj`);
    commands.push("0 -16 Td");
  });
  commands.push("ET");

  return commands.join("\n");
}

function buildPdf(title: string, body: string): Uint8Array {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const pages = getDocumentLines(title, body);

  function addObject(content: string): number {
    objects.push(content);
    return objects.length;
  }

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  for (const page of pages) {
    const content = buildPageContent(page);
    const contentId = addObject(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageObjectIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

export async function GET(_request: Request, context: DocumentPdfRouteContext): Promise<Response> {
  const { documentId } = await context.params;
  const detail = await getGeneratedDocumentDetail(documentId);

  if (!detail) {
    return new Response("Document not found.", {
      status: 404
    });
  }

  const pdf = buildPdf(detail.document.title, detail.document.body);

  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Content-Disposition": `attachment; filename="${detail.document.title.replace(/[^a-z0-9-]+/giu, "-")}.pdf"`,
      "Content-Type": "application/pdf"
    }
  });
}
