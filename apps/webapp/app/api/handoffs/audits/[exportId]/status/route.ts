import { NextResponse } from "next/server";
import { updateHandoffDeliveryStatus } from "../../../../../../src/server/registry-data";

interface Params {
  params: Promise<{
    exportId: string;
  }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { exportId } = await params;
    const body = (await request.json()) as {
      status?: "downloaded" | "sent" | "received" | "failed";
      message?: string;
    };
    const status = body.status;

    if (!status || !["downloaded", "sent", "received", "failed"].includes(status)) {
      return NextResponse.json({ ok: false, error: "A valid delivery status is required." }, { status: 400 });
    }

    const audit = await updateHandoffDeliveryStatus({
      exportId,
      status,
      message: body.message
    });

    if (!audit) {
      return NextResponse.json({ ok: false, error: "Handoff audit not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, audit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Handoff status update failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
