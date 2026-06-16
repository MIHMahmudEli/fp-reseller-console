import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  hover = false,
  delay,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  delay?: number;
}) {
  return (
    <div
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        "animate-fade-in-up rounded-2xl border border-border/60 bg-surface shadow-card",
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-faint">{icon}</span>}
        <h2 className="text-sm font-medium text-muted">{title}</h2>
      </div>
      {action}
    </div>
  );
}
