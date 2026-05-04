import { REGISTRY_APP_NAME, registryModules, registryWebRoutes } from "@registry/config";
import { formatCountLabel } from "@registry/ui";
import Link from "next/link";
import {
  formatBalanceLabel,
  formatDateLabel,
  formatDateRangeLabel,
  formatRateLabel
} from "../src/components/registry/formatters";
import { StatusPill } from "../src/components/registry/status-pill";
import { getDashboardSnapshot } from "../src/server/registry-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  const operationalMetrics = [
    {
      label: "Active customers",
      value: String(snapshot.counts.customers),
      note: "Customer accounts currently open for rental operations."
    },
    {
      label: "Container units",
      value: String(snapshot.counts.units),
      note: "Portable storage units tracked in inventory."
    },
    {
      label: "Active rentals",
      value: String(snapshot.counts.activeRentals),
      note: "Units currently rented to customer sites."
    },
    {
      label: "Balance due",
      value: formatBalanceLabel(snapshot.counts.balanceDueInCents),
      note: `${formatBalanceLabel(snapshot.counts.pastDueInCents)} currently past due.`
    }
  ] as const;

  return (
    <section className="stack">
      <div className="hero-card">
        <p className="eyebrow">Primary Surface</p>
        <h1>{REGISTRY_APP_NAME}</h1>
        <p className="hero-card__summary">
          Live rental desk for {snapshot.organization.name}. Track portable storage units, who has them, where they are,
          who owes what, and which documents or follow-ups need attention.
        </p>
      </div>

      <div className="metric-grid">
        {operationalMetrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span>{metric.note}</span>
          </article>
        ))}
      </div>

      <div className="overview-grid">
        <section className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Assignments</p>
              <h2>Current active rentals</h2>
            </div>
            <Link className="inline-link" href={registryWebRoutes.assignments}>
              Open rentals
            </Link>
          </div>

          {snapshot.activeAssignments.length === 0 ? (
            <div className="empty-state">
              <h3>No active assignments yet</h3>
              <p>Create a customer, create a unit, then create an active rental to occupy it.</p>
            </div>
          ) : (
            <div className="activity-list">
              {snapshot.activeAssignments.map((assignment) => (
                <article className="activity-item" key={assignment.id}>
                  <div>
                    <div className="activity-item__heading">
                      <Link className="inline-link" href={assignment.href}>
                        {assignment.assetCode}
                      </Link>
                      <StatusPill status={assignment.status} />
                    </div>
                    <p>
                      {assignment.customerName} is renting {assignment.assetName}
                    </p>
                    <p className="activity-item__meta">
                      {formatDateRangeLabel(assignment.startDate, assignment.endDate)} ·{" "}
                      {formatRateLabel(assignment.rateInCents)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Money</p>
              <h2>Balances needing attention</h2>
            </div>
            <Link className="inline-link" href={registryWebRoutes.receivables}>
              Open receivables
            </Link>
          </div>

          {snapshot.priorityBalances.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <h3>No open balances</h3>
              <p>Posted charges and payments will appear here once receivables are active.</p>
            </div>
          ) : (
            <div className="activity-list">
              {snapshot.priorityBalances.map((balance) => (
                <article className="activity-item" key={balance.customerId}>
                  <div className="activity-item__heading">
                    <Link className="inline-link" href={`${registryWebRoutes.customers}/${balance.customerId}`}>
                      {balance.customerName}
                    </Link>
                    <StatusPill status={balance.pastDueInCents > 0 ? "overdue" : "current"} />
                  </div>
                  <p>{formatBalanceLabel(balance.balanceInCents)} balance</p>
                  <p className="activity-item__meta">{formatBalanceLabel(balance.pastDueInCents)} past due</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="overview-grid">
        <section className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Logistics</p>
              <h2>Pickup queue</h2>
            </div>
            <span className="pill">{formatCountLabel(snapshot.pickupQueue.length, "pickup")}</span>
          </div>

          {snapshot.pickupQueue.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <h3>No pickups requested</h3>
              <p>Rentals with pickup requested but not picked up will appear here.</p>
            </div>
          ) : (
            <div className="activity-list">
              {snapshot.pickupQueue.map((assignment) => (
                <article className="activity-item" key={assignment.id}>
                  <div className="activity-item__heading">
                    <Link className="inline-link" href={assignment.href}>
                      {assignment.assetCode}
                    </Link>
                    <StatusPill status="warning" label="pickup" />
                  </div>
                  <p>{assignment.customerName}</p>
                  <p className="activity-item__meta">
                    Requested {assignment.pickupRequestedOn ? formatDateLabel(assignment.pickupRequestedOn) : "date not set"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Modules</p>
              <h2>Working areas</h2>
            </div>
            <span className="pill">{formatCountLabel(registryModules.length, "module")}</span>
          </div>

          <div className="module-grid">
            {registryModules.map((module) => (
              <Link className="module-card" href={module.href} key={module.key}>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <span>Open module</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="panel-card panel-card--soft">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Current Slice</p>
            <h2>What is live right now</h2>
          </div>
        </div>
        <div className="tag-list">
          <span className="tag">Postgres persistence</span>
          <span className="tag">Prisma migrations</span>
          <span className="tag">Customer balances</span>
          <span className="tag">Container unit inventory</span>
          <span className="tag">Rental site logistics</span>
          <span className="tag">Receivable ledger entries</span>
          <span className="tag">Document templates</span>
        </div>
      </section>
    </section>
  );
}
