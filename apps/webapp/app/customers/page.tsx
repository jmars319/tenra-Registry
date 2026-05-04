import Link from "next/link";
import { CustomerCreateForm } from "../../src/components/forms/customer-create-form";
import {
  formatBalanceLabel,
  formatBillingAddressLines
} from "../../src/components/registry/formatters";
import { StatusPill } from "../../src/components/registry/status-pill";
import { getDefaultOrganization, listCustomers } from "../../src/server/registry-data";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [organization, customers] = await Promise.all([getDefaultOrganization(), listCustomers()]);

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Customers</p>
        <h1>Customer accounts</h1>
        <p className="hero-card__summary">
          Single-organization view for {organization.name}. Create customers, capture billing details, inspect rental
          history, and see current balance state.
        </p>
      </div>

      <div className="workspace-grid">
        <div className="panel-stack">
          <CustomerCreateForm />
          <article className="panel-card panel-card--soft">
            <h2>Current rule</h2>
            <p>
              Customers may be individuals or businesses. Billing address, contact details, rentals, payments, credits,
              and documents all hang from this account.
            </p>
          </article>
        </div>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">List View</p>
              <h2>Customers</h2>
            </div>
            <span className="pill">{customers.length} total</span>
          </div>

          {customers.length === 0 ? (
            <div className="empty-state">
              <h3>No customers yet</h3>
              <p>Create the first customer to start building assignments and invoice-ready records later.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Billing</th>
                    <th>Status</th>
                    <th>Rentals</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => {
                    const billingLines = formatBillingAddressLines(customer);

                    return (
                      <tr key={customer.id}>
                        <td>
                          <Link className="table-link" href={customer.href}>
                            {customer.name}
                          </Link>
                          <div className="table-subcopy">{customer.companyName ?? "No company name"}</div>
                        </td>
                        <td>
                          <div>{customer.email ?? "No email"}</div>
                          <div className="table-subcopy">{customer.phone ?? "No phone"}</div>
                        </td>
                        <td>
                          {billingLines.length === 0 ? (
                            <span className="table-subcopy">No billing address</span>
                          ) : (
                            billingLines.map((line) => (
                              <div className="table-subcopy" key={line}>
                                {line}
                              </div>
                            ))
                          )}
                        </td>
                        <td>
                          <StatusPill status={customer.status} />
                        </td>
                        <td>{customer.activeAssignmentCount} active</td>
                        <td>
                          <div>{formatBalanceLabel(customer.balanceInCents)}</div>
                          <div className="table-subcopy">{formatBalanceLabel(customer.pastDueInCents)} past due</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
