import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export interface CanvasMenuAction {
  id: string;
  label: string;
  hint?: string;
  separatorBefore?: boolean;
  disabled?: boolean;
  onSelect: () => void | Promise<void>;
}

export interface CanvasContextMenuProps {
  x: number;
  y: number;
  label: string;
  actions: readonly CanvasMenuAction[];
  onClose: () => void;
}

const VIEWPORT_MARGIN = 8;

function menuItems(menu: HTMLElement | null): HTMLButtonElement[] {
  return Array.from(
    menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
  );
}

export function CanvasContextMenu({
  x,
  y,
  label,
  actions,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const bounds = menu.getBoundingClientRect();
    setPosition({
      x: Math.max(
        VIEWPORT_MARGIN,
        Math.min(x, window.innerWidth - bounds.width - VIEWPORT_MARGIN),
      ),
      y: Math.max(
        VIEWPORT_MARGIN,
        Math.min(y, window.innerHeight - bounds.height - VIEWPORT_MARGIN),
      ),
    });
    menuItems(menu)[0]?.focus({ preventScroll: true });
  }, [label, x, y]);

  useEffect(() => {
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const closeOnViewportScroll = (event: Event) => {
      if (event.target === document || event.target === window) onClose();
    };
    const closeOnWheel = () => onClose();
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    document.addEventListener("pointerdown", closeOnPointerDown, true);
    window.addEventListener("scroll", closeOnViewportScroll, true);
    window.addEventListener("wheel", closeOnWheel, true);
    window.addEventListener("keydown", closeOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown, true);
      window.removeEventListener("scroll", closeOnViewportScroll, true);
      window.removeEventListener("wheel", closeOnWheel, true);
      window.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [onClose]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems(menuRef.current);
    if (items.length === 0) return;

    const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement));
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length;
    else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    items[nextIndex]?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[70] min-w-48 rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-1 font-mono text-xs text-[var(--ink)]"
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {actions.map((action) => (
        <Fragment key={action.id}>
          {action.separatorBefore ? (
            <div className="my-1 h-px bg-[var(--line)]" role="separator" />
          ) : null}
          <button
            type="button"
            role="menuitem"
            disabled={action.disabled}
            className="flex min-h-8 w-full items-center justify-between gap-6 rounded px-2.5 py-1.5 text-left transition-colors duration-100 hover:bg-[var(--line)] focus-visible:bg-[var(--line)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--idle)] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
            onClick={() => {
              onClose();
              void action.onSelect();
            }}
          >
            <span>{action.label}</span>
            {action.hint ? (
              <span className="text-[10px] text-[var(--ink-dim)]" aria-hidden="true">
                {action.hint}
              </span>
            ) : null}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

export default CanvasContextMenu;
