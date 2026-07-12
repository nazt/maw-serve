import type { SpaceImportBoardItem } from "./boardItems";

interface SpaceImportGroupProps {
  item: SpaceImportBoardItem;
  liveCount: number;
  pollCount: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function SpaceImportGroup({
  item,
  liveCount,
  pollCount,
  onToggle,
  onRemove,
}: SpaceImportGroupProps) {
  return (
    <section
      className="relative h-full overflow-hidden rounded-md border border-[var(--line)] bg-[oklch(var(--surface-channels)/0.72)] font-mono"
      data-space-group={item.groupId}
      data-collapsed={item.collapsed || undefined}
    >
      <header className="relative z-20 flex h-10 items-center gap-2 border-b border-[var(--line)] bg-[var(--surface-2)] px-2.5 text-xs">
        <button
          type="button"
          className="grid h-7 w-7 shrink-0 place-items-center rounded text-[var(--ink-dim)] hover:bg-[var(--surface)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--idle)]"
          aria-label={`${item.collapsed ? "Expand" : "Collapse"} imported space ${item.spaceRef.spaceIndex}`}
          aria-expanded={!item.collapsed}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(item.id);
          }}
        >
          {item.collapsed ? "▸" : "▾"}
        </button>
        <strong className="min-w-0 flex-1 truncate">
          space {item.spaceRef.spaceIndex}
        </strong>
        <span className="shrink-0 text-[10px] tabular-nums text-[var(--ink-dim)]">
          {liveCount} live / {pollCount} poll
        </span>
        <button
          type="button"
          className="grid h-7 w-7 shrink-0 place-items-center rounded text-sm text-[var(--ink-dim)] hover:bg-[var(--surface)] hover:text-[var(--error)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--idle)]"
          aria-label={`Remove imported space ${item.spaceRef.spaceIndex}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onRemove(item.id);
          }}
        >
          ×
        </button>
      </header>

      {!item.collapsed ? item.members.filter((member) => member.kind === "ghost").map((member) => (
        <div
          key={member.id}
          className="pointer-events-none absolute overflow-hidden rounded border border-[oklch(var(--line-channels)/0.7)] bg-[oklch(var(--surface-2-channels)/0.58)] text-[var(--ink-faint)]"
          data-space-group-ghost={member.windowId}
          style={{
            left: member.geometry.x,
            top: member.geometry.y,
            width: member.geometry.w,
            height: member.geometry.h,
          }}
        >
          <div className="truncate px-1.5 py-1 text-[9px]">
            {member.oracle || member.app}
            {member.target ? " · linked" : ""}
          </div>
        </div>
      )) : null}
    </section>
  );
}

