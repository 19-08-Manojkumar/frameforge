import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Keep native, keyboard-accessible selects while giving each tool a visual cue. */
export function ToolbarSelect({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="toolbar-select">
      <Icon size={14} aria-hidden="true" />
      {children}
    </div>
  );
}
