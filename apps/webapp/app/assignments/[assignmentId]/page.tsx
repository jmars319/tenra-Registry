import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignmentLifecyclePanel } from "../../../src/components/registry/assignment-lifecycle-panel";
import { formatDateRangeLabel, formatRateLabel } from "../../../src/components/registry/formatters";
import { StatusPill } from "../../../src/components/registry/status-pill";
import { getAssignmentDetail } from "../../../src/server/registry-data";

export const dynamic = "force-dynamic";

interface AssignmentDetailPageProps {
  params: Promise<{
    assignmentId: string;
  }>;
}

export default async function AssignmentDetailPage({ params }: AssignmentDetailPageProps) {
  const { assignmentId } = await params;
  const detail = await getAssignmentDetail(assignmentId);

  if (!detail) {
    notFound();
  }

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Assignment Detail</p>
        <h1>{detail.assignment.assetCode}</h1>
        <p className="hero-card__summary">
          {detail.assignment.customerName} · {formatDateRangeLabel(detail.assignment.startDate, detail.assignment.endDate)}
        </p>
      </div>

      <div className="detail-grid">
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Assignment</p>
              <h2>Operational record</h2>
            </div>
            <StatusPill status={detail.assignment.status} />
          </div>

          <dl className="detail-list">
            <div>
              <dt>Billing cadence</dt>
              <dd>{detail.assignment.billingCadence}</dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>{formatRateLabel(detail.assignment.rateInCents)}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{detail.assignment.notes ?? "No notes recorded."}</dd>
            </div>
          </dl>
        </article>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Linked records</p>
              <h2>Customer and asset</h2>
            </div>
          </div>

          <div className="linked-records">
            <div className="linked-record">
              <span className="eyebrow">Customer</span>
              <Link className="inline-link" href={detail.assignment.customerHref}>
                {detail.customer.name}
              </Link>
              <p>{detail.customer.companyName ?? "No company name"}</p>
            </div>

            <div className="linked-record">
              <span className="eyebrow">Asset</span>
              <Link className="inline-link" href={detail.assignment.assetHref}>
                {detail.asset.assetCode}
              </Link>
              <p>
                {detail.asset.name} · <StatusPill label={detail.asset.status} status={detail.asset.status} />
              </p>
            </div>
          </div>
        </article>

        <AssignmentLifecyclePanel
          assignmentId={detail.assignment.id}
          assignmentStatus={detail.assignment.status}
          assetStatus={detail.asset.status}
        />
      </div>
    </section>
  );
}
