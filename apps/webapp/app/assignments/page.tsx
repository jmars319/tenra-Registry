import Link from "next/link";
import { AssignmentCreateForm } from "../../src/components/forms/assignment-create-form";
import { formatDateRangeLabel, formatRateLabel } from "../../src/components/registry/formatters";
import { StatusPill } from "../../src/components/registry/status-pill";
import { getAssignmentFormOptions, getDefaultOrganization, listAssignments } from "../../src/server/registry-data";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const [organization, assignments, formOptions] = await Promise.all([
    getDefaultOrganization(),
    listAssignments(),
    getAssignmentFormOptions()
  ]);

  const activeAssignmentCount = assignments.filter((assignment) => assignment.status === "active").length;

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Assignments</p>
        <h1>Active and planned assignments</h1>
        <p className="hero-card__summary">
          Generalized customer-to-asset links for {organization.name}. This is the first live workflow replacing the
          legacy rental-style allocation process.
        </p>
      </div>

      <div className="workspace-grid">
        <div className="panel-stack">
          <AssignmentCreateForm assets={formOptions.assets} customers={formOptions.customers} />
          <article className="panel-card panel-card--soft">
            <h2>Occupancy rule</h2>
            <p>
              Only active assignments occupy an asset. Completing or cancelling an active assignment releases that asset
              back to available unless it has been manually moved into maintenance or archived.
            </p>
          </article>
        </div>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">List View</p>
              <h2>Assignments</h2>
            </div>
            <span className="pill">{activeAssignmentCount} active</span>
          </div>

          {assignments.length === 0 ? (
            <div className="empty-state">
              <h3>No assignments yet</h3>
              <p>Create an assignment to connect a customer to an asset and occupy it operationally.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Customer</th>
                    <th>Asset</th>
                    <th>Status</th>
                    <th>Billing</th>
                    <th>Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        <Link className="table-link" href={assignment.href}>
                          View assignment
                        </Link>
                        <div className="table-subcopy">{assignment.notes ?? "Open the detail view to manage lifecycle."}</div>
                      </td>
                      <td>
                        <Link className="table-link" href={assignment.customerHref}>
                          {assignment.customerName}
                        </Link>
                      </td>
                      <td>
                        <Link className="table-link" href={assignment.assetHref}>
                          {assignment.assetCode}
                        </Link>
                        <div className="table-subcopy">{assignment.assetName}</div>
                      </td>
                      <td>
                        <StatusPill status={assignment.status} />
                      </td>
                      <td>
                        <div>{assignment.billingCadence}</div>
                        <div className="table-subcopy">{formatRateLabel(assignment.rateInCents)}</div>
                      </td>
                      <td>{formatDateRangeLabel(assignment.startDate, assignment.endDate)}</td>
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
