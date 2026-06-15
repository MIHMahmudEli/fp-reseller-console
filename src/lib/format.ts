/** Presentation helpers shared by client components. */

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function formatGB(gb: number): string {
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  if (gb > 0) return `${(gb * 1024).toFixed(1)} MB`;
  return "0 GB";
}

/** Human product label, e.g. "residential_lite" -> "Residential Lite". */
export function productLabel(product: string): string {
  return product
    .replace(/[_-]/g, " ")
    .replace(/\bisp\b/gi, "ISP")
    .replace(/\bipv6\b/gi, "IPv6")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Tailwind classes for a plan status pill. */
export function statusClasses(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "expired":
    case "cancelled":
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
    case "suspended":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
  }
}
