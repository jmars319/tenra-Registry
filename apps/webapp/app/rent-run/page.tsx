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
  getDefaultRentRunBillingDay,
  getDefaultRentRunDueDate,
  getDefaultRentRunPeriod,
  getRentRunPreview,
  listRentRunHistory
} from "../../src/server/registry-data";

export const dynamic = "force-dynamic";

interface RentRunPageProps {
  searchParams?: Promise<{
    period?: string | undefined;
    dueDate?: string | undefined;
    billingDay?: string | undefined;
    posted?: string | undefined;
    skipped?: string | undefined;
    error?: string | undefined;
  }>;
}

// Query normalization boundary
function normalizePeriod(value: string | undefined): string {
  return value && /^\d{4}-\d{2}$/u.test(value) ? value : getDefaultRentRunPeriod();
}

function normalizeDueDate(value: string | undefined, period: string, billingDay: number): string {
  return value && /^\d{4}-\d{2}-\d{2}$/u.test(value) ? value : getDefaultRentRunDueDate(period, billingDay);
}

function normalizeBillingDay(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed)) {
    return getDefaultRentRunBillingDay();
  }

  return Math.min(28, Math.max(1, parsed));
}

export default async function RentRunPage({ searchParams }: RentRunPageProps) {
  const params = await searchParams;
  const period = normalizePeriod(params?.period);
  const billingDay = normalizeBillingDay(params?.billingDay);
  const dueDate = normalizeDueDate(params?.dueDate, period, billingDay);
  const [preview, history] = await Promise.all([
    getRentRunPreview(period, dueDate, billingDay),
    listRentRunHistory()
  ]);
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

      {/* Rent run controls boundary */}
      <form className="panel-card rent-run-controls no-print" method="get">
        <label className="form-field">
          <span>Billing month</span>
          <input className="form-input" defaultValue={period} name="period" type="month" />
        </label>
        <label className="form-field">
          <span>Billing day</span>
          <input className="form-input" defaultValue={billingDay} max={28} min={1} name="billingDay" type="number" />
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

      {/* Charge summary boundary */}
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
          <span>Billing day {preview.billingDay}; charges post on {formatDateLabel(preview.chargeDate)}.</span>
        </article>
      </div>

      {/* Charge preview boundary */}
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
        <input name="billingDay" type="hidden" value={preview.billingDay} />

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
                        defaultChecked={!line.alreadyPosted && line.amountInCents > 0}
                        disabled={line.alreadyPosted || line.amountInCents <= 0}
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
                      {line.endDate ? <span className="table-subcopy">Ends {formatDateLabel(line.endDate)}</span> : null}
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
                    <td>
                      {formatRateLabel(line.amountInCents)}
                      <span className="table-subcopy">{line.calculation}</span>
                      <span className="table-subcopy">Base rate {formatRateLabel(line.baseRateInCents)}</span>
                    </td>
                    <td>
                      {line.alreadyPosted ? (
                        <StatusPill label="Already posted" status="posted" />
                      ) : line.amountInCents <= 0 ? (
                        <StatusPill label="No active days" status="warning" />
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

      {/* Rent history boundary */}
      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">History</p>
            <h2>Posted rent runs</h2>
          </div>
          <span className="pill">{history.length} periods</span>
        </div>

        {history.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <h3>No posted rent runs</h3>
            <p>Completed rent runs will appear here after charges are posted.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Posted</th>
                  <th>Charges</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.period}>
                    <td>{item.periodLabel}</td>
                    <td>{formatDateLabel(item.postedOn)}</td>
                    <td>{item.count}</td>
                    <td>{formatRateLabel(item.totalInCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
