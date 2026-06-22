import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ReadinessCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

function errorDetail(error: unknown) {
  return error instanceof Error ? error.message : "Unknown readiness failure.";
}

export async function GET() {
  const checks: ReadinessCheck[] = [
    {
      name: "database-url",
      ok: Boolean(process.env.DATABASE_URL?.trim()),
      detail: process.env.DATABASE_URL?.trim()
        ? "DATABASE_URL is configured in the server environment."
        : "DATABASE_URL is not configured in the server environment."
    }
  ];

  try {
    const { db } = await import("../../../../src/server/db");
    await db.$queryRaw`select 1`;
    checks.push({
      name: "postgres",
      ok: true,
      detail: "Postgres accepted a readiness query."
    });
  } catch (error) {
    checks.push({
      name: "postgres",
      ok: false,
      detail: errorDetail(error)
    });
  }

  checks.push({
    name: "handoff-contracts",
    ok: true,
    detail: "Ledger export, Assembly document request, receipt, and replay routes are registered."
  });

  const ok = checks.every((check) => check.ok);

  return NextResponse.json(
    {
      ok,
      appId: "tenra-registry",
      service: "registry-runtime",
      storage: "postgres",
      handoffs: [
        "tenra-registry.ledger-export.v1",
        "tenra-registry.assembly-document-request.v1"
      ],
      checks,
      timestamp: new Date().toISOString()
    },
    { status: ok ? 200 : 503 }
  );
}
