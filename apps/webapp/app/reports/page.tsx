import Link from "next/link";
import {
  formatBalanceLabel
} from "../../src/components/registry/formatters";
import { StatusPill } from "../../src/components/registry/status-pill";
import { getReportsSnapshot } from "../../src/server/registry-data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const snapshot = await getReportsSnapshot();

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Reports</p>
        <h1>Rental operating reports</h1>
        <p className="hero-card__summary">
          Practical visibility for {snapshot.organization.name}: unit status, rental status, open balances, past-due
          accounts, and payments posted this month.
        </p>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <p>Open balance</p>
          <strong>{formatBalanceLabel(snapshot.openBalanceInCents)}</strong>
          <span>Total customer balance after posted payments and credits.</span>
        </article>
        <article className="metric-card">
          <p>Past due</p>
          <strong>{formatBalanceLabel(snapshot.pastDueInCents)}</strong>
          <span>Estimated overdue exposure based on due dates.</span>
        </article>
        <article className="metric-card">
          <p>Payments this month</p>
          <strong>{formatBalanceLabel(snapshot.monthlyPaymentsInCents)}</strong>
          <span>Posted payments and credits in the current month.</span>
        </article>
        <article className="metric-card">
          <p>Accounts with balances</p>
          <strong>{snapshot.balances.filter((balance) => balance.balanceInCents > 0).length}</strong>
          <span>Customer accounts currently owing money.</span>
        </article>
      </div>

      <div className="overview-grid">
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Inventory</p>
              <h2>Unit status</h2>
            </div>
          </div>
          <div className="report-list">
            {snapshot.unitCounts.map((item) => (
              <div className="report-row" key={item.label}>
                <StatusPill status={item.label} />
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Rentals</p>
              <h2>Rental status</h2>
            </div>
          </div>
          <div className="report-list">
            {snapshot.rentalCounts.map((item) => (
              <div className="report-row" key={item.label}>
                <StatusPill status={item.label} />
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Balances</p>
            <h2>Customer balance report</h2>
          </div>
          <Link className="inline-link" href="/receivables">
            Open receivables
          </Link>
        </div>

        {snapshot.balances.length === 0 ? (
          <div className="empty-state">
            <h3>No customer balances yet</h3>
            <p>Post charges and payments to generate balance reporting.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Charges</th>
                  <th>Payments / credits</th>
                  <th>Balance</th>
                  <th>Past due</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.balances.map((balance) => (
                  <tr key={balance.customerId}>
                    <td>
                      <Link className="table-link" href={`/customers/${balance.customerId}`}>
                        {balance.customerName}
                      </Link>
                    </td>
                    <td>{formatBalanceLabel(balance.totalChargesInCents)}</td>
                    <td>{formatBalanceLabel(balance.totalCreditsInCents)}</td>
                    <td>{formatBalanceLabel(balance.balanceInCents)}</td>
                    <td>
                      <div>{formatBalanceLabel(balance.pastDueInCents)}</div>
                      <div className="table-subcopy">
                        {balance.lastPaymentDate ? `Last payment ${balance.lastPaymentDate}` : "No payment posted"}
                      </div>
                    </td>
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
