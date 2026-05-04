import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignmentLifecyclePanel } from "../../../src/components/registry/assignment-lifecycle-panel";
import {
  formatBalanceLabel,
  formatDateLabel,
  formatDateRangeLabel,
  formatRateLabel,
  formatSignedUsdCents,
  formatSiteAddressLines
} from "../../../src/components/registry/formatters";
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
          {detail.assignment.customerName} · {formatDateRangeLabel(detail.assignment.startDate, detail.assignment.endDate)} ·{" "}
          {formatBalanceLabel(detail.balanceInCents)} balance
        </p>
      </div>

      <div className="detail-grid">
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Rental</p>
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
              <dt>Rental balance</dt>
              <dd>{formatBalanceLabel(detail.balanceInCents)}</dd>
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
              <p className="eyebrow">Site</p>
              <h2>Delivery and pickup</h2>
            </div>
          </div>

          <dl className="detail-list">
            <div>
              <dt>Customer site</dt>
              <dd>
                {formatSiteAddressLines(detail.assignment).length === 0
                  ? "No site address recorded."
                  : formatSiteAddressLines(detail.assignment).map((line) => (
                      <span className="detail-line" key={line}>
                        {line}
                      </span>
                    ))}
              </dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>
                {detail.assignment.deliveredOn
                  ? `Delivered ${formatDateLabel(detail.assignment.deliveredOn)}`
                  : detail.assignment.deliveryScheduledFor
                    ? `Scheduled ${formatDateLabel(detail.assignment.deliveryScheduledFor)}`
                    : "No delivery date recorded."}
              </dd>
            </div>
            <div>
              <dt>Pickup</dt>
              <dd>
                {detail.assignment.pickedUpOn
                  ? `Picked up ${formatDateLabel(detail.assignment.pickedUpOn)}`
                  : detail.assignment.pickupRequestedOn
                    ? `Requested ${formatDateLabel(detail.assignment.pickupRequestedOn)}`
                    : "No pickup requested."}
              </dd>
            </div>
            <div>
              <dt>Placement notes</dt>
              <dd>{detail.assignment.placementNotes ?? "No placement notes recorded."}</dd>
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

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Receivables</p>
              <h2>Rental ledger</h2>
            </div>
            <Link className="inline-link" href="/receivables">
              Post entry
            </Link>
          </div>

          {detail.receivableEntries.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <h3>No ledger entries</h3>
              <p>Charges, deposits, payments, credits, and pickup fees tied to this rental will appear here.</p>
            </div>
          ) : (
            <div className="activity-list">
              {detail.receivableEntries.map((entry) => (
                <article className="activity-item" key={entry.id}>
                  <div className="activity-item__heading">
                    <strong>{entry.description}</strong>
                    <StatusPill status={entry.status} label={entry.type} />
                  </div>
                  <p>{formatSignedUsdCents(entry.amountInCents)}</p>
                  <p className="activity-item__meta">
                    {formatDateLabel(entry.effectiveDate)}
                    {entry.dueDate ? ` · due ${formatDateLabel(entry.dueDate)}` : ""}
                  </p>
                </article>
              ))}
            </div>
          )}
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
