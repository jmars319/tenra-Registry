import { NextResponse } from "next/server";
import { updateHandoffDeliveryStatus } from "../../../../src/server/registry-data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      exportId?: string;
      message?: string;
    };
    const exportId = body.exportId?.trim();

    if (!exportId) {
      return NextResponse.json({ ok: false, error: "exportId is required." }, { status: 400 });
    }

    const audit = await updateHandoffDeliveryStatus({
      exportId,
      status: "received",
      message: body.message ?? "Downstream app marked this handoff received."
    });

    if (!audit) {
      return NextResponse.json({ ok: false, error: "Handoff audit not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, audit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Handoff receipt update failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
