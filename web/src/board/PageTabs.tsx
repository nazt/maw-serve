import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { fuzzySubsequenceScore } from "./paletteIndex";

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

function pageType(page: BoardPage): "board" | "display" | "space" {
  if (page.system === "display") return "display";
  if (page.system === "space") return "space";
  return "board";
}

function pageGlyph(page: BoardPage): string {
  if (page.system === "display") return "▣";
  if (page.system === "space") return "▦";
  return "◇";
}

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
  const [jumpMenuOpen, setJumpMenuOpen] = useState(false);
  const [jumpQuery, setJumpQuery] = useState("");
  const [activeJumpPageId, setActiveJumpPageId] = useState<string | null>(activePageId);
  const [jumpMenuPosition, setJumpMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 320,
    maxHeight: 480,
  });
  const jumpMenuId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const jumpButtonRef = useRef<HTMLButtonElement>(null);
  const jumpMenuRef = useRef<HTMLDivElement>(null);
  const jumpSearchRef = useRef<HTMLInputElement>(null);
  const jumpOptionRefs = useRef(new Map<string, HTMLButtonElement>());
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLAnchorElement>());

  const filteredJumpPages = useMemo(() => {
    const query = jumpQuery.trim();
    if (!query) return pages;
    return pages.flatMap((page, index) => {
      const score = fuzzySubsequenceScore(
        query,
        `${page.name} ${pageType(page)} ${page.id}`,
      );
      return score === null ? [] : [{ page, score, index }];
    }).sort((left, right) => (
      right.score - left.score || left.index - right.index
    )).map(({ page }) => page);
  }, [jumpQuery, pages]);

  const activeJumpIndex = filteredJumpPages.findIndex(
    (page) => page.id === activeJumpPageId,
  );
  const activeJumpOptionId = activeJumpIndex >= 0
    ? `${jumpMenuId}-option-${activeJumpIndex}`
    : undefined;

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

  useEffect(() => {
    const jumpMenu = jumpMenuRef.current;
    if (!jumpMenu) return;
    const syncOpenState = () => {
      const isOpen = jumpMenu.matches(":popover-open");
      setJumpMenuOpen(isOpen);
      if (!isOpen) setJumpQuery("");
    };
    jumpMenu.addEventListener("toggle", syncOpenState);
    return () => jumpMenu.removeEventListener("toggle", syncOpenState);
  }, []);

  useEffect(() => {
    if (!jumpMenuOpen) return;
    if (filteredJumpPages.some((page) => page.id === activeJumpPageId)) return;
    setActiveJumpPageId(filteredJumpPages[0]?.id ?? null);
  }, [activeJumpPageId, filteredJumpPages, jumpMenuOpen]);

  useEffect(() => {
    if (!jumpMenuOpen || !activeJumpPageId) return;
    jumpOptionRefs.current.get(activeJumpPageId)?.scrollIntoView({ block: "nearest" });
  }, [activeJumpPageId, jumpMenuOpen]);

  const updateJumpMenuPosition = () => {
    const trigger = jumpButtonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.min(320, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(viewportPadding, rect.right - width),
      window.innerWidth - width - viewportPadding,
    );
    const top = rect.bottom + 6;
    const availableHeight = window.innerHeight - top - viewportPadding;
    setJumpMenuPosition({
      top,
      left,
      width,
      maxHeight: Math.min(480, Math.max(120, availableHeight)),
    });
  };

  useEffect(() => {
    if (!jumpMenuOpen) return;
    const updatePosition = () => updateJumpMenuPosition();
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [jumpMenuOpen]);

  const closeJumpMenu = (restoreFocus = false) => {
    const jumpMenu = jumpMenuRef.current;
    if (jumpMenu?.matches(":popover-open")) jumpMenu.hidePopover();
    setJumpMenuOpen(false);
    setJumpQuery("");
    if (restoreFocus) {
      window.requestAnimationFrame(() => jumpButtonRef.current?.focus());
    }
  };

  const openJumpMenu = (initialPageId = activePageId) => {
    const jumpMenu = jumpMenuRef.current;
    if (!jumpMenu) return;
    setJumpQuery("");
    setActiveJumpPageId(initialPageId);
    updateJumpMenuPosition();
    if (!jumpMenu.matches(":popover-open")) jumpMenu.showPopover();
    setJumpMenuOpen(true);
    window.requestAnimationFrame(() => jumpSearchRef.current?.focus());
  };

  const selectJumpPage = (pageId: string) => {
    const isCurrentPage = pageId === activePageId;
    closeJumpMenu(isCurrentPage);
    if (!isCurrentPage) onSelect(pageId);
  };

  const moveJumpSelection = (direction: 1 | -1) => {
    if (filteredJumpPages.length === 0) return;
    const currentIndex = Math.max(0, activeJumpIndex);
    const nextIndex = (
      currentIndex + direction + filteredJumpPages.length
    ) % filteredJumpPages.length;
    setActiveJumpPageId(filteredJumpPages[nextIndex].id);
  };

  const handleJumpMenuKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveJumpSelection(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveJumpSelection(-1);
        break;
      case "Home":
        event.preventDefault();
        setActiveJumpPageId(filteredJumpPages[0]?.id ?? null);
        break;
      case "End":
        event.preventDefault();
        setActiveJumpPageId(filteredJumpPages.at(-1)?.id ?? null);
        break;
      case "Enter":
        event.preventDefault();
        if (activeJumpPageId) selectJumpPage(activeJumpPageId);
        break;
      case "Escape":
        event.preventDefault();
        closeJumpMenu(true);
        break;
    }
  };

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
        ref={jumpButtonRef}
        type="button"
        className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded px-1.5 font-mono text-[10px] font-semibold tabular-nums text-[var(--ink-dim)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--idle)] motion-reduce:transition-none"
        aria-label={`Jump to a board page. ${pages.length} pages.`}
        aria-haspopup="menu"
        aria-expanded={jumpMenuOpen}
        aria-controls={jumpMenuId}
        title="Jump to page"
        onClick={() => {
          if (jumpMenuOpen) closeJumpMenu();
          else openJumpMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openJumpMenu(pages[0]?.id);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            openJumpMenu(pages.at(-1)?.id);
          } else if (event.key === "Escape" && jumpMenuOpen) {
            event.preventDefault();
            closeJumpMenu(true);
          }
        }}
      >
        <span aria-hidden="true">▾</span>
        <span>{pages.length}</span>
      </button>
      <div
        ref={jumpMenuRef}
        id={jumpMenuId}
        className="page-jump-menu font-mono"
        popover="auto"
        style={{
          top: jumpMenuPosition.top,
          left: jumpMenuPosition.left,
          width: jumpMenuPosition.width,
          maxHeight: jumpMenuPosition.maxHeight,
        }}
      >
        <label className="sr-only" htmlFor={`${jumpMenuId}-search`}>
          Search board pages
        </label>
        <div className="page-jump-menu__search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={jumpSearchRef}
            id={`${jumpMenuId}-search`}
            type="search"
            role="searchbox"
            value={jumpQuery}
            placeholder="Search pages…"
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-controls={`${jumpMenuId}-options`}
            aria-activedescendant={activeJumpOptionId}
            onChange={(event) => setJumpQuery(event.target.value)}
            onKeyDown={handleJumpMenuKeyDown}
          />
          <kbd>esc</kbd>
        </div>
        <div
          id={`${jumpMenuId}-options`}
          className="page-jump-menu__options"
          role="menu"
          aria-label="All board pages"
        >
          {filteredJumpPages.length > 0 ? filteredJumpPages.map((page, index) => {
            const current = page.id === activePageId;
            const active = page.id === activeJumpPageId;
            return (
              <button
                ref={(element) => {
                  if (element) jumpOptionRefs.current.set(page.id, element);
                  else jumpOptionRefs.current.delete(page.id);
                }}
                id={`${jumpMenuId}-option-${index}`}
                key={page.id}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="page-jump-menu__item"
                data-active={active || undefined}
                data-current={current || undefined}
                aria-current={current ? "page" : undefined}
                onPointerMove={() => setActiveJumpPageId(page.id)}
                onClick={() => selectJumpPage(page.id)}
              >
                <span className="page-jump-menu__glyph" aria-hidden="true">
                  {pageGlyph(page)}
                </span>
                <span className="page-jump-menu__name">{page.name}</span>
                <span className="page-jump-menu__type">{pageType(page)}</span>
                {current ? (
                  <span className="page-jump-menu__current" aria-hidden="true">●</span>
                ) : null}
              </button>
            );
          }) : (
            <p className="page-jump-menu__empty" role="status">
              No pages match “{jumpQuery}”
            </p>
          )}
        </div>
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
