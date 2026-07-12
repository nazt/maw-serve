import type { CSSProperties, KeyboardEventHandler, ReactNode } from "react";
import {
  transformPoint,
  useDrag,
  type CanvasTransform,
  type SnapGuide,
  type TileChangeKind,
  type TileItem,
} from "./useDrag";
import "./Tile.css";

export interface TileProps<Item extends TileItem = TileItem> {
  item: Item;
  siblings: readonly Item[];
  canvas: CanvasTransform;
  children: ReactNode | ((item: Item) => ReactNode);
  className?: string;
  style?: CSSProperties;
  minWidth?: number;
  minHeight?: number;
  tabIndex?: number;
  resizeTabIndex?: number;
  ariaLabel?: string;
  ariaCurrent?: boolean;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  onActivate?: (item: Item) => void;
  aspectRatio?: number | null;
  onChange?: (item: Item, kind: TileChangeKind) => void;
  onCommit?: (item: Item, kind: TileChangeKind) => void;
}

function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function Guide({ guide, canvas }: { guide: SnapGuide; canvas: CanvasTransform }) {
  const screen = transformPoint(canvas.worldToScreen, {
    x: guide.axis === "x" ? guide.value : 0,
    y: guide.axis === "y" ? guide.value : 0,
  });
  const vertical = guide.axis === "x";
  const style: CSSProperties = vertical
    ? {
        left: screen.x,
        top: "50%",
        width: 1,
        height: 6000,
        transform: "translateY(-50%)",
      }
    : {
        left: "50%",
        top: screen.y,
        width: 6000,
        height: 1,
        transform: "translateX(-50%)",
      };

  return (
    <div
      aria-hidden="true"
      className={classes(
        "snap-guide pointer-events-none absolute z-40 bg-[var(--idle)] opacity-75",
        vertical ? "snap-guide--vertical" : "snap-guide--horizontal",
      )}
      data-axis={guide.axis}
      style={style}
    />
  );
}

export function Tile<Item extends TileItem>({
  item,
  siblings,
  canvas,
  children,
  className,
  style,
  minWidth,
  minHeight,
  tabIndex,
  resizeTabIndex,
  ariaLabel,
  ariaCurrent,
  onKeyDown,
  onActivate,
  aspectRatio,
  onChange,
  onCommit,
}: TileProps<Item>) {
  const {
    geometry,
    guides,
    dragging,
    resizing,
    dragHandlers,
    resizeHandlers,
  } = useDrag({
    item,
    siblings,
    canvas,
    minWidth,
    minHeight,
    aspectRatio,
    onChange,
    onCommit,
  });
  const screen = transformPoint(canvas.worldToScreen, {
    x: geometry.x,
    y: geometry.y,
  });
  const safeZoom = Math.max(0.01, Number.isFinite(canvas.zoom) ? canvas.zoom : 1);
  const resizeHandleStyle = {
    "--tile-resize-hit": `${44 / safeZoom}px`,
    "--tile-resize-offset": `${-22 / safeZoom}px`,
    "--tile-resize-glyph": `${12 / safeZoom}px`,
    "--tile-resize-glyph-nudge": `${2 / safeZoom}px`,
    "--tile-resize-line": `${7 / safeZoom}px`,
    "--tile-resize-stroke": `${1 / safeZoom}px`,
  } as CSSProperties;
  const content = typeof children === "function" ? children(item) : children;

  return (
    <>
      <article
        {...dragHandlers}
        className={classes(
          "tile absolute left-0 top-0 origin-top-left touch-none select-none will-change-transform",
          item.kind,
          dragging && "is-dragging cursor-grabbing",
          resizing && "is-resizing",
          className,
        )}
        onPointerDownCapture={(event) => {
          if (event.button === 0) onActivate?.(item);
        }}
        onFocusCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            onActivate?.(item);
          }
        }}
        onKeyDown={onKeyDown}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        aria-current={ariaCurrent || undefined}
        data-dragging={dragging || undefined}
        data-kind={item.kind}
        data-resizing={resizing || undefined}
        data-tile-id={item.id}
        data-world-h={geometry.h}
        data-world-w={geometry.w}
        data-world-x={geometry.x}
        data-world-y={geometry.y}
        style={{
          ...style,
          position: "absolute",
          left: 0,
          top: 0,
          width: geometry.w,
          height: geometry.h,
          transform: `translate3d(${screen.x}px, ${screen.y}px, 0) scale(${canvas.zoom})`,
          transformOrigin: "top left",
        }}
      >
        {content}
        <button
          {...resizeHandlers}
          aria-label={`Resize ${item.kind} tile`}
          className="resize-handle tile-resize-handle absolute z-20 cursor-nwse-resize touch-none border-0 bg-transparent p-0"
          data-resize-handle="true"
          style={resizeHandleStyle}
          tabIndex={resizeTabIndex}
          type="button"
        >
          <span className="tile-resize-handle__glyph" aria-hidden="true" />
        </button>
      </article>
      {guides.map((guide) => (
        <Guide key={guide.axis} guide={guide} canvas={canvas} />
      ))}
    </>
  );
}

export default Tile;
