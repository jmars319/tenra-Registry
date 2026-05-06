import { getReceivableEntryTypeLabel } from "@registry/domain";
import Link from "next/link";
import { ReceivableEntryForm } from "../../src/components/forms/receivable-entry-form";
import {
  formatBalanceLabel,
  formatDateLabel,
  formatSignedUsdCents
} from "../../src/components/registry/formatters";
import { StatusPill } from "../../src/components/registry/status-pill";
import {
  getReceivableFormOptions,
  listCustomers,
  listReceivableEntries
} from "../../src/server/registry-data";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const [entries, customers, formOptions] = await Promise.all([
    listReceivableEntries(),
    listCustomers(),
    getReceivableFormOptions()
  ]);
  const openBalanceInCents = customers.reduce((total, customer) => total + customer.balanceInCents, 0);
  const pastDueInCents = customers.reduce((total, customer) => total + customer.pastDueInCents, 0);

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Receivables</p>
        <h1>Charges, payments, and balances</h1>
        <p className="hero-card__summary">
          Post rental charges, deposits, delivery or pickup fees, payments, credits, and adjustments. Customer balances
          update from this ledger.
        </p>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <p>Open balance</p>
          <strong>{formatBalanceLabel(openBalanceInCents)}</strong>
          <span>Current net amount due across customer accounts.</span>
        </article>
        <article className="metric-card">
          <p>Past due</p>
          <strong>{formatBalanceLabel(pastDueInCents)}</strong>
          <span>Charges with due dates before today after posted credits.</span>
        </article>
        <article className="metric-card">
          <p>Entries</p>
          <strong>{entries.length}</strong>
          <span>Posted or void receivable ledger rows.</span>
        </article>
        <article className="metric-card">
          <p>Accounts</p>
          <strong>{customers.length}</strong>
          <span>Customer accounts available for billing.</span>
        </article>
      </div>

      <div className="workspace-grid">
        <div className="panel-stack">
          <ReceivableEntryForm assignments={formOptions.assignments} customers={formOptions.customers} />
          <article className="panel-card panel-card--soft">
            <h2>Ledger rule</h2>
            <p>
              Charges, deposits, adjustments, and refunds increase the balance. Payments and credits reduce it. Entries
              are posted as ledger records so account history stays inspectable.
            </p>
          </article>
        </div>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Ledger</p>
              <h2>Recent entries</h2>
            </div>
            <div className="header-actions">
              <Link className="inline-link" href="/api/handoffs/ledger-export">
                Export to Ledger
              </Link>
              <span className="pill">{entries.length} entries</span>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="empty-state">
              <h3>No receivable entries yet</h3>
              <p>Post a charge or payment to start tracking customer balances.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Unit</th>
                    <th>Due</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDateLabel(entry.effectiveDate)}</td>
                      <td>
                        <Link className="table-link" href={entry.customerHref}>
                          {entry.customerName}
                        </Link>
                      </td>
                      <td>
                        <StatusPill status={entry.status} label={getReceivableEntryTypeLabel(entry.type)} />
                      </td>
                      <td>
                        <div>{entry.description}</div>
                        <div className="table-subcopy">{entry.reference ?? entry.paymentMethod ?? "No reference"}</div>
                      </td>
                      <td>
                        {entry.assetHref ? (
                          <Link className="table-link" href={entry.assetHref}>
                            {entry.assetCode}
                          </Link>
                        ) : (
                          <span className="table-subcopy">Account-level</span>
                        )}
                        <div className="table-subcopy">{entry.assetName}</div>
                      </td>
                      <td>{entry.dueDate ? formatDateLabel(entry.dueDate) : <span className="table-subcopy">None</span>}</td>
                      <td>{formatSignedUsdCents(entry.amountInCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
