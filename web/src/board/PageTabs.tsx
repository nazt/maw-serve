import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import {
  boardPageHref,
  type BoardPage,
} from "./pages";

interface PageTabsProps {
  pages: BoardPage[];
  activePageId: string;
  onSelect: (pageId: string) => void;
  onCreate: () => void;
  onRename: (pageId: string, name: string) => void;
  onDelete: (pageId: string) => void;
}

const subActionClass = "grid h-11 w-11 shrink-0 place-items-center rounded text-[var(--ink-dim)] opacity-0 transition-[color,background-color,opacity] duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--idle)] group-hover:opacity-100 motion-reduce:transition-none";
let pendingKeyboardFocusPageId: string | null = null;

export default function PageTabs({
  pages,
  activePageId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: PageTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [edgeFade, setEdgeFade] = useState<"none" | "start" | "end" | "both">("none");
  const inputRef = useRef<HTMLInputElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLAnchorElement>());

  useEffect(() => {
    if (!editingId) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingId]);

  useEffect(() => {
    if (pendingKeyboardFocusPageId !== activePageId) return;
    const frame = window.requestAnimationFrame(() => {
      if (pendingKeyboardFocusPageId !== activePageId) return;
      const activeTab = tabRefs.current.get(activePageId);
      activeTab?.focus();
      activeTab?.scrollIntoView({ block: "nearest", inline: "nearest" });
      pendingKeyboardFocusPageId = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePageId]);

  useEffect(() => {
    const tabList = tabListRef.current;
    if (!tabList) return;

    const updateEdgeFade = () => {
      const hasOverflow = tabList.scrollWidth > tabList.clientWidth + 1;
      const canScrollStart = hasOverflow && tabList.scrollLeft > 1;
      const canScrollEnd = hasOverflow
        && tabList.scrollLeft + tabList.clientWidth < tabList.scrollWidth - 1;
      setEdgeFade(
        canScrollStart && canScrollEnd
          ? "both"
          : canScrollStart
            ? "start"
            : canScrollEnd
              ? "end"
              : "none",
      );
    };

    updateEdgeFade();
    const frame = window.requestAnimationFrame(updateEdgeFade);
    const observer = new ResizeObserver(updateEdgeFade);
    observer.observe(tabList);
    tabList.addEventListener("scroll", updateEdgeFade, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      tabList.removeEventListener("scroll", updateEdgeFade);
    };
  }, [pages]);

  const beginRename = (page: BoardPage) => {
    setDraft(page.name);
    setEditingId(page.id);
  };

  const finishRename = () => {
    if (!editingId) return;
    onRename(editingId, draft);
    setEditingId(null);
  };

  const selectAdjacentPage = (
    event: KeyboardEvent<HTMLAnchorElement>,
    currentIndex: number,
  ) => {
    if (event.altKey || event.ctrlKey || event.metaKey || pages.length === 0) return;

    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % pages.length;
        break;
      case "ArrowLeft":
        nextIndex = (currentIndex - 1 + pages.length) % pages.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = pages.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextPage = pages[nextIndex];
    if (nextPage.id === activePageId) return;
    pendingKeyboardFocusPageId = nextPage.id;
    onSelect(nextPage.id);
  };

  return (
    <nav
      className="pointer-events-auto flex min-w-0 items-center gap-1 font-mono"
      aria-label="Board pages"
    >
      <div
        ref={tabListRef}
        className="page-tabs__list flex min-w-0 max-w-[min(70vw,52rem)] items-center gap-0.5 overflow-x-auto"
        role="tablist"
        aria-label="Board pages"
        aria-orientation="horizontal"
        data-edge-fade={edgeFade}
      >
        {pages.map((page, pageIndex) => {
          const active = page.id === activePageId;
          return (
            <span
              className="group relative flex shrink-0 items-center"
              key={page.id}
            >
              {editingId === page.id && !page.system ? (
                <input
                  ref={inputRef}
                  className="w-24 border-0 border-b border-[var(--idle)] bg-transparent px-1.5 py-0.5 text-xs text-[var(--ink)] outline-none"
                  aria-label={`Rename ${page.name} board page`}
                  value={draft}
                  maxLength={40}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={finishRename}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") finishRename();
                    if (event.key === "Escape") {
                      setDraft(page.name);
                      setEditingId(null);
                    }
                  }}
                />
              ) : (
                <a
                  ref={(element) => {
                    if (element) tabRefs.current.set(page.id, element);
                    else tabRefs.current.delete(page.id);
                  }}
                  className={`inline-flex h-11 items-center rounded border-b px-2 text-xs transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--idle)] motion-reduce:transition-none ${
                    active
                      ? "border-[var(--idle)] text-[var(--ink)]"
                      : "border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]"
                  }`}
                  href={boardPageHref(page.id)}
                  role="tab"
                  data-page-tab-id={page.id}
                  aria-selected={active}
                  aria-controls="board-fabric"
                  aria-keyshortcuts="ArrowLeft ArrowRight Home End"
                  tabIndex={active ? 0 : -1}
                  onKeyDown={(event) => selectAdjacentPage(event, pageIndex)}
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) return;
                    event.preventDefault();
                    onSelect(page.id);
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    if (!page.system) beginRename(page);
                  }}
                >
                  {page.system === "display" ? (
                    <span className="mr-1 text-[var(--ink-faint)]" aria-hidden="true">▣</span>
                  ) : page.system === "space" ? (
                    <span className="mr-1 text-[var(--ink-faint)]" aria-hidden="true">▦</span>
                  ) : null}
                  {page.name}
                </a>
              )}
              <a
                className={`${subActionClass} ml-0.5 text-[10px]`}
                href={boardPageHref(page.id)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${page.name} board page in a new browser tab`}
                title="Open in new tab"
              >
                ↗
              </a>
              {pages.length > 1 && page.system !== "display" ? (
                <button
                  type="button"
                  className={`${subActionClass} ml-0.5 text-[11px]`}
                  aria-label={`${page.system === "space" ? "Close" : "Delete"} ${page.name} board page`}
                  title={page.system === "space" ? "Close tab" : "Delete page"}
                  onClick={() => onDelete(page.id)}
                >
                  ×
                </button>
              ) : null}
            </span>
          );
        })}
      </div>
      <button
        type="button"
        className="grid h-11 w-11 shrink-0 place-items-center rounded text-xs text-[var(--ink-dim)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--idle)] motion-reduce:transition-none"
        aria-label="Create board page"
        title="New board page"
        onClick={onCreate}
      >
        +
      </button>
    </nav>
  );
}
