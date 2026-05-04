import Link from "next/link";
import { AssetCreateForm } from "../../src/components/forms/asset-create-form";
import { StatusPill } from "../../src/components/registry/status-pill";
import { getDefaultOrganization, listAssets } from "../../src/server/registry-data";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const [organization, assets] = await Promise.all([getDefaultOrganization(), listAssets()]);

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Assets</p>
        <h1>Container unit registry</h1>
        <p className="hero-card__summary">
          Track portable storage containers for {organization.name}, including size, condition, yard home, current
          location, and rental-ready availability.
        </p>
      </div>

      <div className="workspace-grid">
        <div className="panel-stack">
          <AssetCreateForm />
          <article className="panel-card panel-card--soft">
            <h2>Current rule</h2>
            <p>
              Unit codes must be unique within the organization. Only active rentals occupy a container for scheduling
              and availability.
            </p>
          </article>
        </div>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">List View</p>
              <h2>Units</h2>
            </div>
            <span className="pill">{assets.length} total</span>
          </div>

          {assets.length === 0 ? (
            <div className="empty-state">
              <h3>No units yet</h3>
              <p>Create the first container unit to make rental workflows possible.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Size / Type</th>
                    <th>Condition</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Current rental</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td>
                        <Link className="table-link" href={asset.href}>
                          {asset.assetCode}
                        </Link>
                        <div className="table-subcopy">{asset.name}</div>
                      </td>
                      <td>
                        <div>{asset.sizeLabel ?? asset.category}</div>
                        <div className="table-subcopy">{asset.unitType ?? "No unit type"}</div>
                      </td>
                      <td>{asset.condition ?? <span className="table-subcopy">Not set</span>}</td>
                      <td>
                        <div>{asset.currentLocation ?? <span className="table-subcopy">Not set</span>}</div>
                        <div className="table-subcopy">{asset.homeLocation ?? "No home yard"}</div>
                      </td>
                      <td>
                        <StatusPill status={asset.status} />
                      </td>
                      <td>
                        {asset.activeAssignment ? (
                          <div>
                            <div>{asset.activeAssignment.customerName}</div>
                            <div className="table-subcopy">
                              {[asset.activeAssignment.siteName, asset.activeAssignment.siteCity, asset.activeAssignment.siteState]
                                .filter(Boolean)
                                .join(", ") || "Rental active"}
                            </div>
                          </div>
                        ) : (
                          <span className="table-subcopy">No active rental</span>
                        )}
                      </td>
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
