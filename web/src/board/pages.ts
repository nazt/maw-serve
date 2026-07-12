import { useCallback, useEffect, useMemo, useState } from "react";

export const BOARD_PAGES_STORAGE_KEY = "stoa.board.pages.v1";
export const SPACE_PAGES_STORAGE_KEY = "stoa.board.spacepages.v1";
export const DEFAULT_PAGE_ID = "fleet";

export interface BoardPage {
  id: string;
  name: string;
  system?: "display" | "space";
  displayIndex?: number;
  spaceIndex?: number;
}

export interface OpenSpacePage {
  displayIndex: number;
  spaceIndex: number;
}

const DEFAULT_PAGES: BoardPage[] = [{ id: DEFAULT_PAGE_ID, name: "fleet" }];
const PAGE_HASH = /^#\/b\/([^/?#]+)/;

function validPage(value: unknown): value is BoardPage {
  if (!value || typeof value !== "object") return false;
  const page = value as Partial<BoardPage>;
  return typeof page.id === "string" && page.id.length > 0 &&
    typeof page.name === "string" && page.name.trim().length > 0;
}

function normalizePages(value: unknown): BoardPage[] {
  if (!Array.isArray(value)) return DEFAULT_PAGES;

  const ids = new Set<string>();
  const pages = value.filter(validPage).flatMap((page) => {
    if (ids.has(page.id)) return [];
    ids.add(page.id);
    return [{ id: page.id, name: page.name.trim().slice(0, 40) }];
  });

  return pages.length > 0 ? pages : DEFAULT_PAGES;
}

export function loadBoardPages(): BoardPage[] {
  if (typeof window === "undefined") return DEFAULT_PAGES;
  try {
    const raw = window.localStorage.getItem(BOARD_PAGES_STORAGE_KEY);
    if (!raw) return DEFAULT_PAGES;
    const parsed = JSON.parse(raw) as { version?: unknown; pages?: unknown };
    return parsed.version === 1 ? normalizePages(parsed.pages) : DEFAULT_PAGES;
  } catch {
    return DEFAULT_PAGES;
  }
}

export function saveBoardPages(pages: BoardPage[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      BOARD_PAGES_STORAGE_KEY,
      JSON.stringify({ version: 1, pages: normalizePages(pages) }),
    );
  } catch {
    // The page list remains available for the current browser session.
  }
}

function validOpenSpacePage(value: unknown): value is OpenSpacePage {
  if (!value || typeof value !== "object") return false;
  const page = value as Partial<OpenSpacePage>;
  return Number.isInteger(page.displayIndex) && Number.isInteger(page.spaceIndex);
}

export function loadOpenSpacePages(): OpenSpacePage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SPACE_PAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: unknown; pages?: unknown };
    if (parsed.version !== 1 || !Array.isArray(parsed.pages)) return [];
    const ids = new Set<string>();
    return parsed.pages.filter(validOpenSpacePage).filter((page) => {
      const id = `${page.displayIndex}:${page.spaceIndex}`;
      if (ids.has(id)) return false;
      ids.add(id);
      return true;
    });
  } catch {
    return [];
  }
}

export function saveOpenSpacePages(pages: readonly OpenSpacePage[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SPACE_PAGES_STORAGE_KEY,
      JSON.stringify({ version: 1, pages: pages.filter(validOpenSpacePage) }),
    );
  } catch {
    // The open set remains available for the current browser session.
  }
}

export function createBoardPage(pages: BoardPage[]): BoardPage {
  const used = new Set(pages.map((page) => page.id));
  let number = 2;
  while (used.has(`board-${number}`)) number += 1;
  return { id: `board-${number}`, name: `board ${number}` };
}

export function boardPageHash(pageId: string): string {
  return `#/b/${encodeURIComponent(pageId)}`;
}

export function boardPageHref(pageId: string): string {
  if (typeof window === "undefined") return boardPageHash(pageId);
  return `${window.location.pathname}${window.location.search}${boardPageHash(pageId)}`;
}

export function pageIdFromHash(hash: string): string | null {
  const match = PAGE_HASH.exec(hash);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function replaceHash(pageId: string): void {
  const url = `${window.location.pathname}${window.location.search}${boardPageHash(pageId)}`;
  window.history.replaceState(null, "", url);
}

export interface HashPageState {
  pageId: string;
  navigate: (pageId: string) => void;
}

export function useHashPage(pages: BoardPage[]): HashPageState {
  const pageIds = useMemo(() => new Set(pages.map((page) => page.id)), [pages]);
  const fallbackId = pages[0]?.id ?? DEFAULT_PAGE_ID;
  const readPageId = useCallback(() => {
    const requested = pageIdFromHash(window.location.hash);
    return requested && pageIds.has(requested) ? requested : fallbackId;
  }, [fallbackId, pageIds]);
  const [pageId, setPageId] = useState(() => {
    if (typeof window === "undefined") return fallbackId;
    return readPageId();
  });

  useEffect(() => {
    const syncFromHash = () => {
      const next = readPageId();
      if (pageIdFromHash(window.location.hash) !== next) replaceHash(next);
      setPageId(next);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [readPageId]);

  const navigate = useCallback((nextPageId: string) => {
    if (pageIdFromHash(window.location.hash) === nextPageId) {
      setPageId(nextPageId);
      return;
    }
    window.location.hash = boardPageHash(nextPageId).slice(1);
  }, []);

  return { pageId, navigate };
}
