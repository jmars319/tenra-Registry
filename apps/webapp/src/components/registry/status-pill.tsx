interface StatusPillProps {
  status: string;
  label?: string;
}

const toneMap: Record<string, "neutral" | "success" | "warning" | "muted"> = {
  active: "success",
  assigned: "warning",
  available: "success",
  maintenance: "warning",
  archived: "muted",
  cancelled: "muted",
  completed: "neutral",
  draft: "neutral",
  inactive: "muted",
  posted: "success",
  printed: "success",
  emailed: "success",
  void: "muted",
  overdue: "warning",
  current: "success",
  warning: "warning"
};

function formatStatusLabel(status: string): string {
  return status.replace(/-/gu, " ");
}

export function StatusPill({ status, label }: StatusPillProps) {
  const tone = toneMap[status] ?? "neutral";

  return <span className={`status-pill status-pill--${tone}`}>{label ?? formatStatusLabel(status)}</span>;
}
