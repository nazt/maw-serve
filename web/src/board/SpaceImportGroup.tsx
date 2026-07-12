import type { SpaceImportBoardItem } from "./boardItems";

const GROUP_HEADER_HEIGHT = 40;

interface SpaceImportGroupProps {
  item: SpaceImportBoardItem;
  liveCount: number;
  pollCount: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

function SpaceMiniMap({ item }: { item: SpaceImportBoardItem }) {
  const contentHeight = Math.max(1, item.expandedSize.h - GROUP_HEADER_HEIGHT);

  return (
    <svg
      className="h-7 w-14 shrink-0 rounded-[3px] border border-[oklch(var(--line-channels)/0.82)] bg-[var(--surface)] p-0.5"
      viewBox={`0 0 ${item.expandedSize.w} ${contentHeight}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      data-space-group-thumbnail={item.groupId}
    >
      {item.members.map((member) => (
        <rect
          key={member.id}
          x={member.geometry.x}
          y={Math.max(0, member.geometry.y - GROUP_HEADER_HEIGHT)}
          width={Math.max(1, member.geometry.w)}
          height={Math.max(1, member.geometry.h)}
          rx="4"
          fill={member.kind === "terminal"
            ? "oklch(var(--idle-channels) / 0.2)"
            : "oklch(var(--surface-2-channels) / 0.72)"}
          stroke={member.kind === "terminal" ? "var(--idle)" : "var(--line)"}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          data-space-thumbnail-window={member.windowId}
        />
      ))}
    </svg>
  );
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
        {item.collapsed ? <SpaceMiniMap item={item} /> : null}
        <strong className="min-w-0 flex-1 truncate">
          {item.collapsed
            ? `space ${item.spaceRef.spaceIndex} · ${item.members.length}`
            : `space ${item.spaceRef.spaceIndex}`}
        </strong>
        <span
          className="shrink-0 rounded border border-[oklch(var(--line-channels)/0.72)] bg-[oklch(var(--surface-channels)/0.66)] px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--ink-dim)]"
          aria-label={`${liveCount} live terminals, ${pollCount} polled terminals`}
          data-live-count={liveCount}
          data-polled-count={pollCount}
        >
          {liveCount} live / {pollCount} polled
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
