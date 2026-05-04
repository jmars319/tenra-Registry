import { getCsvHeader, getImportSpecByKey } from "../../../src/server/import-specs";

interface ImportHeaderRouteContext {
  params: Promise<{
    dataset: string;
  }>;
}

export async function GET(_request: Request, context: ImportHeaderRouteContext): Promise<Response> {
  const { dataset } = await context.params;
  const spec = getImportSpecByKey(dataset);

  if (!spec) {
    return new Response("Import layout not found.", {
      status: 404
    });
  }

  return new Response(`${getCsvHeader(spec)}\n`, {
    headers: {
      "Content-Disposition": `attachment; filename="${spec.fileName}"`,
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
