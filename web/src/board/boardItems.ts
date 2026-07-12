export type BoardItemKind = "note" | "image";
export type BoardPoint = readonly [number, number] | { x: number; y: number };
export type BoardPlacement = BoardPoint | { center: BoardPoint };

export interface BoardItemGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NoteBoardItem extends BoardItemGeometry {
  id: string;
  kind: "note";
  data: {
    text: string;
  };
}

export interface ImageBoardItem extends BoardItemGeometry {
  id: string;
  kind: "image";
  data: string;
}

export type BoardItem = NoteBoardItem | ImageBoardItem;

export interface ClipboardImageReader {
  read?: () => Promise<Array<{
    types: readonly string[];
    getType: (type: string) => Promise<Blob>;
  }>>;
  readText?: () => Promise<string>;
}

export interface ImageSourceOptions {
  clipboard?: ClipboardImageReader | null;
  prompt?: ((message: string) => string | null) | null;
}

const NOTE_WIDTH = 240;
const NOTE_HEIGHT = 160;
const IMAGE_WIDTH = 320;
const IMAGE_HEIGHT = 220;

let boardItemSequence = 0;

function finite(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function coordinates(point?: BoardPoint): [number, number] {
  if (point && "x" in point) return [finite(point.x), finite(point.y)];
  return [finite(point?.[0]), finite(point?.[1])];
}

export function boardItemPosition(placement?: BoardPlacement): [number, number] {
  if (placement && "center" in placement) return coordinates(placement.center);
  return coordinates(placement);
}

function boardItemId(kind: BoardItemKind): string {
  boardItemSequence += 1;
  return `${kind}-${Date.now().toString(36)}-${boardItemSequence.toString(36)}`;
}

export function createNoteBoardItem(placement?: BoardPlacement): NoteBoardItem {
  const [x, y] = boardItemPosition(placement);
  return {
    id: boardItemId("note"),
    kind: "note",
    x: Math.round(x),
    y: Math.round(y),
    w: NOTE_WIDTH,
    h: NOTE_HEIGHT,
    data: { text: "" },
  };
}

export function createImageBoardItem(
  dataUrl: string,
  placement?: BoardPlacement,
): ImageBoardItem {
  const source = dataUrl.trim();
  if (!isImageSource(source)) throw new TypeError("Image board items require an image URL");

  const [x, y] = boardItemPosition(placement);
  return {
    id: boardItemId("image"),
    kind: "image",
    x: Math.round(x),
    y: Math.round(y),
    w: IMAGE_WIDTH,
    h: IMAGE_HEIGHT,
    data: source,
  };
}

export function isImageSource(value: unknown): value is string {
  const source = String(value ?? "").trim();
  return /^(?:data:image\/|blob:|https?:\/\/)/i.test(source);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader === "undefined") {
    return blob.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      }
      return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`;
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Clipboard image could not be encoded"));
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Clipboard image could not be read"));
    });
    reader.readAsDataURL(blob);
  });
}

function browserClipboard(): ClipboardImageReader | null {
  return typeof navigator === "undefined"
    ? null
    : (navigator.clipboard as ClipboardImageReader | undefined) ?? null;
}

function browserPrompt(): ((message: string) => string | null) | null {
  return typeof window === "undefined" ? null : window.prompt.bind(window);
}

async function clipboardImage(clipboard: ClipboardImageReader): Promise<string | null> {
  if (typeof clipboard.read !== "function") return null;

  try {
    const items = await clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((type) => type.toLowerCase().startsWith("image/"));
      if (!imageType) continue;
      return blobToDataUrl(await item.getType(imageType));
    }
  } catch {
    // Permissions and browser support vary; text and prompt fallbacks remain available.
  }

  return null;
}

async function clipboardImageUrl(clipboard: ClipboardImageReader): Promise<string | null> {
  if (typeof clipboard.readText !== "function") return null;

  try {
    const value = (await clipboard.readText()).trim();
    return isImageSource(value) ? value : null;
  } catch {
    return null;
  }
}

export async function acquireImageSource(
  options: ImageSourceOptions = {},
): Promise<string | null> {
  const clipboard = options.clipboard === undefined ? browserClipboard() : options.clipboard;
  if (clipboard) {
    const image = await clipboardImage(clipboard);
    if (image) return image;

    const imageUrl = await clipboardImageUrl(clipboard);
    if (imageUrl) return imageUrl;
  }

  const prompt = options.prompt === undefined ? browserPrompt() : options.prompt;
  const prompted = prompt?.("Paste an image URL")?.trim() ?? "";
  return isImageSource(prompted) ? prompted : null;
}

export function imageElementProps(item: ImageBoardItem) {
  return {
    src: item.data,
    alt: "Board image",
    draggable: false,
    decoding: "async",
    loading: "lazy",
  } as const;
}
