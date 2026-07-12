import { useEffect, useRef, useState } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingId) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingId]);

  const beginRename = (page: BoardPage) => {
    setDraft(page.name);
    setEditingId(page.id);
  };

  const finishRename = () => {
    if (!editingId) return;
    onRename(editingId, draft);
    setEditingId(null);
  };

  return (
    <nav
      className="pointer-events-auto flex min-w-0 items-center gap-1 font-mono"
      aria-label="Board pages"
    >
      <div
        className="flex min-w-0 max-w-[min(70vw,52rem)] items-center gap-0.5 overflow-x-auto"
        role="tablist"
        aria-label="Board pages"
      >
        {pages.map((page) => {
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
                  className={`border-b px-1.5 py-0.5 text-xs transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-[var(--idle)] ${
                    active
                      ? "border-[var(--idle)] text-[var(--ink)]"
                      : "border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]"
                  }`}
                  href={boardPageHref(page.id)}
                  role="tab"
                  aria-selected={active}
                  aria-controls="board-fabric"
                  tabIndex={active ? 0 : -1}
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
