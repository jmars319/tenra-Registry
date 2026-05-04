import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateRangeLabel } from "../../../src/components/registry/formatters";
import { StatusPill } from "../../../src/components/registry/status-pill";
import { getAssetDetail } from "../../../src/server/registry-data";

export const dynamic = "force-dynamic";

interface AssetDetailPageProps {
  params: Promise<{
    assetId: string;
  }>;
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { assetId } = await params;
  const detail = await getAssetDetail(assetId);

  if (!detail) {
    notFound();
  }

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Asset Detail</p>
        <h1>
          {detail.asset.assetCode} · {detail.asset.name}
        </h1>
        <p className="hero-card__summary">
          {detail.asset.sizeLabel ?? detail.asset.category} · {detail.asset.currentLocation ?? "No location recorded"} ·{" "}
          {detail.asset.condition ?? "No condition recorded"}
        </p>
      </div>

      <div className="detail-grid">
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Profile</p>
              <h2>Container unit</h2>
            </div>
            <StatusPill status={detail.asset.status} />
          </div>

          <dl className="detail-list">
            <div>
              <dt>Category</dt>
              <dd>{detail.asset.category}</dd>
            </div>
            <div>
              <dt>Size / type</dt>
              <dd>
                {[detail.asset.sizeLabel, detail.asset.unitType].filter(Boolean).join(" · ") || "Not recorded."}
              </dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{detail.asset.condition ?? "No condition recorded."}</dd>
            </div>
            <div>
              <dt>Current location</dt>
              <dd>{detail.asset.currentLocation ?? "No location recorded."}</dd>
            </div>
            <div>
              <dt>Home yard</dt>
              <dd>{detail.asset.homeLocation ?? "No home yard recorded."}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{detail.asset.notes ?? "No notes recorded."}</dd>
            </div>
          </dl>
        </article>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Assignments</p>
              <h2>Rental history</h2>
            </div>
            <span className="pill">{detail.assignments.length} total</span>
          </div>

          {detail.assignments.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <h3>No assignments yet</h3>
              <p>This unit has not been rented to a customer yet.</p>
            </div>
          ) : (
            <div className="activity-list">
              {detail.assignments.map((assignment) => (
                <article className="activity-item" key={assignment.id}>
                  <div>
                    <div className="activity-item__heading">
                      <Link className="inline-link" href={assignment.href}>
                        {assignment.customerName}
                      </Link>
                      <StatusPill status={assignment.status} />
                    </div>
                    <p>{formatDateRangeLabel(assignment.startDate, assignment.endDate)}</p>
                    <p className="activity-item__meta">
                      {[assignment.siteName, assignment.siteCity, assignment.siteState].filter(Boolean).join(", ") ||
                        "No customer site recorded"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
