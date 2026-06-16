"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

export function CopyField({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-faint">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-subtle px-3 py-2 font-mono text-sm text-fg">
          {revealed ? value : "•".repeat(Math.min(value.length, 16))}
        </code>
        {secret && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-subtle hover:text-fg"
            aria-label={revealed ? "Hide" : "Show"}
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <button
          onClick={copy}
          className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-subtle hover:text-fg"
          aria-label="Copy"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
