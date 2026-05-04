import Link from "next/link";
import { postRentRunAction } from "./actions";
import {
  formatBalanceLabel,
  formatDateLabel,
  formatRateLabel
} from "../../src/components/registry/formatters";
import { StatusPill } from "../../src/components/registry/status-pill";
import {
  formatRentRunPeriodLabel,
  getDefaultRentRunDueDate,
  getDefaultRentRunPeriod,
  getRentRunPreview
} from "../../src/server/registry-data";

export const dynamic = "force-dynamic";

interface RentRunPageProps {
  searchParams?: Promise<{
    period?: string | undefined;
    dueDate?: string | undefined;
    posted?: string | undefined;
    skipped?: string | undefined;
    error?: string | undefined;
  }>;
}

function normalizePeriod(value: string | undefined): string {
  return value && /^\d{4}-\d{2}$/u.test(value) ? value : getDefaultRentRunPeriod();
}

function normalizeDueDate(value: string | undefined, period: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/u.test(value) ? value : getDefaultRentRunDueDate(period);
}

export default async function RentRunPage({ searchParams }: RentRunPageProps) {
  const params = await searchParams;
  const period = normalizePeriod(params?.period);
  const dueDate = normalizeDueDate(params?.dueDate, period);
  const preview = await getRentRunPreview(period, dueDate);
  const postedMessage =
    params?.posted !== undefined
      ? `${params.posted} charge${params.posted === "1" ? "" : "s"} posted${
          params.skipped && params.skipped !== "0" ? `, ${params.skipped} skipped as already posted` : ""
        }.`
      : undefined;

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Rent Run</p>
        <h1>{formatRentRunPeriodLabel(period)} billing</h1>
        <p className="hero-card__summary">
          Review active rentals, skip anything already posted for the period, then create the recurring rent charges in
          one controlled batch.
        </p>
      </div>

      <form className="panel-card rent-run-controls no-print" method="get">
        <label className="form-field">
          <span>Billing month</span>
          <input className="form-input" defaultValue={period} name="period" type="month" />
        </label>
        <label className="form-field">
          <span>Due date</span>
          <input className="form-input" defaultValue={dueDate} name="dueDate" type="date" />
        </label>
        <button className="button-secondary" type="submit">
          Preview charges
        </button>
      </form>

      {postedMessage ? <p className="form-message">{postedMessage}</p> : null}
      {params?.error ? <p className="form-message form-message--error">{params.error}</p> : null}

      <div className="metric-grid">
        <article className="metric-card">
          <p>Ready to post</p>
          <strong>{preview.readyCount}</strong>
          <span>Active rentals without a charge for this rent run.</span>
        </article>
        <article className="metric-card">
          <p>Ready total</p>
          <strong>{formatBalanceLabel(preview.readyTotalInCents)}</strong>
          <span>Charges that will be posted if all ready rows stay selected.</span>
        </article>
        <article className="metric-card">
          <p>Already posted</p>
          <strong>{preview.postedCount}</strong>
          <span>Rentals with a matching posted charge for this month.</span>
        </article>
        <article className="metric-card">
          <p>Due</p>
          <strong>{formatDateLabel(preview.dueDate)}</strong>
          <span>Due date assigned to new charges from this run.</span>
        </article>
      </div>

      <form action={postRentRunAction} className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Preview</p>
            <h2>Recurring rent charges</h2>
          </div>
          <button className="button-primary no-print" disabled={preview.readyCount === 0} type="submit">
            Post selected charges
          </button>
        </div>

        <input name="period" type="hidden" value={preview.period} />
        <input name="dueDate" type="hidden" value={preview.dueDate} />

        {preview.lines.length === 0 ? (
          <div className="empty-state">
            <h3>No active rentals</h3>
            <p>Activate rentals before running recurring rent charges.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="no-print">Post</th>
                  <th>Customer</th>
                  <th>Unit</th>
                  <th>Site</th>
                  <th>Cadence</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((line) => (
                  <tr key={line.assignmentId}>
                    <td className="no-print">
                      <input
                        defaultChecked={!line.alreadyPosted}
                        disabled={line.alreadyPosted}
                        name="assignmentId"
                        type="checkbox"
                        value={line.assignmentId}
                      />
                      <input name="customerId" type="hidden" value={line.customerId} />
                    </td>
                    <td>
                      <Link className="table-link" href={line.customerHref}>
                        {line.customerName}
                      </Link>
                      <span className="table-subcopy">Started {formatDateLabel(line.startDate)}</span>
                    </td>
                    <td>
                      <Link className="table-link" href={line.assetHref}>
                        {line.assetCode}
                      </Link>
                      <span className="table-subcopy">{line.assetName}</span>
                    </td>
                    <td>{line.siteLabel}</td>
                    <td>
                      <StatusPill status={line.billingCadence} />
                    </td>
                    <td>{formatRateLabel(line.amountInCents)}</td>
                    <td>
                      {line.alreadyPosted ? (
                        <StatusPill label="Already posted" status="posted" />
                      ) : (
                        <StatusPill label="Ready" status="active" />
                      )}
                      <span className="table-subcopy">{line.reference}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </form>
    </section>
  );
}
