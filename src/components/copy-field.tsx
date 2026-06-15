"use client";

import { useState } from "react";

/** A monospace value with a copy button; optionally masked (for secrets). */
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
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 truncate rounded-md bg-slate-50 px-2 py-1.5 font-mono text-sm text-slate-800">
          {revealed ? value : "•".repeat(Math.min(value.length, 16))}
        </code>
        {secret && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
        <button
          onClick={copy}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
