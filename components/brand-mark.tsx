import { Sprout } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-mark ${compact ? "brand-mark-compact" : ""}`} aria-hidden="true">
      <span className="brand-mark-dot" />
      <Sprout size={compact ? 19 : 23} strokeWidth={2.35} />
    </span>
  );
}
