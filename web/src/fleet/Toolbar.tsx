export interface ToolbarProps {
  zoom: number;
  onAddNote: () => void;
  onFit: () => void;
  disabled?: boolean;
  className?: string;
}

const buttonClass = [
  "rounded-md",
  "border",
  "border-[var(--line)]",
  "bg-[var(--surface)]",
  "px-2.5",
  "py-1.5",
  "text-xs",
  "font-semibold",
  "text-[var(--ink)]",
  "transition-colors",
  "duration-150",
  "hover:bg-[var(--surface-2)]",
  "focus-visible:outline",
  "focus-visible:outline-2",
  "focus-visible:outline-offset-2",
  "focus-visible:outline-[var(--idle)]",
  "disabled:cursor-not-allowed",
  "disabled:opacity-50",
].join(" ");

export function Toolbar({
  zoom,
  onAddNote,
  onFit,
  disabled = false,
  className = "",
}: ToolbarProps) {
  const zoomPercent = `${Math.round(Math.min(2, Math.max(0.35, zoom)) * 100)}%`;

  return (
    <div
      className={`fixed bottom-11 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-lg bg-[var(--surface)] p-1.5 shadow-[0_0_0_1px_var(--line)] ${className}`}
      role="toolbar"
      aria-label="Board controls"
    >
      <button type="button" className={buttonClass} onClick={onAddNote} disabled={disabled}>
        Add note
      </button>
      <button type="button" className={buttonClass} onClick={onFit} disabled={disabled}>
        Fit
      </button>
      <output
        className="min-w-12 px-1 text-center font-mono text-xs tabular-nums text-[var(--ink-dim)]"
        aria-label="Canvas zoom"
        aria-live="polite"
      >
        {zoomPercent}
      </output>
    </div>
  );
}

export default Toolbar;
