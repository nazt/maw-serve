export type BoardItemKind = "note" | "image" | "space-import";
export type BoardPoint = readonly [number, number] | { x: number; y: number };
export type BoardPlacement = BoardPoint | { center: BoardPoint };

export interface BoardItemGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
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
  data: string | ImageBoardData;
}

export interface SpaceReference {
  displayIndex: number;
  spaceIndex: number;
}

export interface SpaceImportMember {
  id: string;
  windowId: number;
  kind: "terminal" | "ghost";
  oracle: string | null;
  app: string;
  geometry: Omit<BoardItemGeometry, "zIndex">;
  target: {
    session: string;
    window: string;
    model?: string;
  } | null;
  adoptedItemId?: string;
}

/** Descriptor-only: terminal frames are always fetched live and never stored. */
export interface SpaceImportBoardItem extends BoardItemGeometry {
  id: string;
  kind: "space-import";
  data: Record<string, never>;
  groupId: string;
  spaceRef: SpaceReference;
  members: SpaceImportMember[];
  collapsed: boolean;
}

export interface ImageBoardData {
  /** The optimized, uncropped source. Crop UI must never overwrite this value. */
  src: string;
  naturalW: number;
  naturalH: number;
  cropRect: ImageCropRect | null;
  byteLength: number;
  mediaType: string;
}

export interface ImageCropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
  byteLength: number;
  mediaType: string;
}

export type BoardItem = NoteBoardItem | ImageBoardItem | SpaceImportBoardItem;

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
const IMAGE_LONG_EDGE = 360;
export const MAX_IMAGE_SOURCE_EDGE = 1_600;
export const MAX_IMAGE_DATA_URL_BYTES = 450_000;
const MAX_IMAGE_BLOB_BYTES = 330_000;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
  source: string | PreparedImage,
  placement?: BoardPlacement,
): ImageBoardItem {
  const dataUrl = typeof source === "string" ? source.trim() : source.dataUrl.trim();
  if (!isImageSource(dataUrl)) throw new TypeError("Image board items require an image URL");

  const naturalWidth = typeof source === "string" ? IMAGE_LONG_EDGE : source.width;
  const naturalHeight = typeof source === "string"
    ? Math.round(IMAGE_LONG_EDGE * 0.6875)
    : source.height;
  const scale = IMAGE_LONG_EDGE / Math.max(1, naturalWidth, naturalHeight);
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const [anchorX, anchorY] = boardItemPosition(placement);
  const centered = Boolean(placement && "center" in placement);
  const prepared = typeof source === "string" ? null : source;
  return {
    id: boardItemId("image"),
    kind: "image",
    x: Math.round(anchorX - (centered ? width / 2 : 0)),
    y: Math.round(anchorY - (centered ? height / 2 : 0)),
    w: width,
    h: height,
    data: {
      src: dataUrl,
      naturalW: Math.max(1, Math.round(naturalWidth)),
      naturalH: Math.max(1, Math.round(naturalHeight)),
      cropRect: null,
      byteLength: prepared?.byteLength ?? new TextEncoder().encode(dataUrl).byteLength,
      mediaType: prepared?.mediaType ?? "image/external",
    },
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

export function imageSource(item: ImageBoardItem): string {
  return typeof item.data === "string" ? item.data : item.data.src;
}

export function imageAspectRatio(item: ImageBoardItem): number {
  const width = typeof item.data === "string" ? item.w : item.data.naturalW;
  const height = typeof item.data === "string" ? item.h : item.data.naturalH;
  const ratio = finite(width, 1) / Math.max(1, finite(height, 1));
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

export function isSupportedImageFile(file: Blob & { name?: string }): boolean {
  const type = file.type.toLowerCase();
  if (SUPPORTED_IMAGE_TYPES.has(type)) return true;
  return /\.(?:gif|jpe?g|png|webp)$/i.test(file.name ?? "");
}

export function imageBlobsFromDataTransfer(
  transfer: Pick<DataTransfer, "files" | "items"> | null | undefined,
): Blob[] {
  if (!transfer) return [];
  const files = Array.from(transfer.files ?? []).filter(isSupportedImageFile);
  if (files.length > 0) return files;

  return Array.from(transfer.items ?? []).flatMap((item) => {
    if (item.kind !== "file" || !SUPPORTED_IMAGE_TYPES.has(item.type.toLowerCase())) {
      return [];
    }
    const file = item.getAsFile();
    return file ? [file] : [];
  });
}

export function hasSupportedImageData(
  transfer: Pick<DataTransfer, "files" | "items"> | null | undefined,
): boolean {
  if (!transfer) return false;
  return Array.from(transfer.files ?? []).some(isSupportedImageFile) ||
    Array.from(transfer.items ?? []).some((item) => (
      item.kind === "file" && SUPPORTED_IMAGE_TYPES.has(item.type.toLowerCase())
    ));
}

function imageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    }, { once: true });
    image.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image could not be decoded"));
    }, { once: true });
    image.src = objectUrl;
  });
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function resizedCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Image optimizer is unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function stepDownCanvas(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  let source: CanvasImageSource = image;
  let width = Math.max(1, image.naturalWidth || image.width);
  let height = Math.max(1, image.naturalHeight || image.height);

  // Large one-shot reductions visibly alias. Step down by halves until the
  // final draw is at most a 2x reduction, then render the exact target size.
  while (width > targetWidth * 2 || height > targetHeight * 2) {
    width = Math.max(targetWidth, Math.round(width / 2));
    height = Math.max(targetHeight, Math.round(height / 2));
    source = resizedCanvas(source, width, height);
  }

  return resizedCanvas(source, targetWidth, targetHeight);
}

export async function prepareImageBlob(blob: Blob): Promise<PreparedImage> {
  if (!isSupportedImageFile(blob)) {
    throw new TypeError("Use a PNG, JPG, WebP, or GIF image");
  }
  if (typeof document === "undefined") {
    throw new Error("Image optimization requires a browser canvas");
  }

  const image = await imageFromBlob(blob);
  const naturalWidth = Math.max(1, image.naturalWidth || image.width);
  const naturalHeight = Math.max(1, image.naturalHeight || image.height);
  const initialScale = Math.min(
    1,
    MAX_IMAGE_SOURCE_EDGE / Math.max(naturalWidth, naturalHeight),
  );
  let width = Math.max(1, Math.round(naturalWidth * initialScale));
  let height = Math.max(1, Math.round(naturalHeight * initialScale));
  let encodedWidth = width;
  let encodedHeight = height;
  let encoded: Blob | null = null;
  let workingCanvas = stepDownCanvas(image, width, height);

  optimize: for (let sizeAttempt = 0; sizeAttempt < 8; sizeAttempt += 1) {
    encodedWidth = width;
    encodedHeight = height;

    for (const quality of [0.82, 0.7, 0.58]) {
      encoded = await canvasBlob(workingCanvas, "image/webp", quality);
      if (!encoded || encoded.type !== "image/webp") {
        encoded = await canvasBlob(workingCanvas, "image/jpeg", quality);
      }
      if (!encoded) throw new Error("Image could not be optimized");
      if (encoded.size <= MAX_IMAGE_BLOB_BYTES) break optimize;
    }

    const currentLongEdge = Math.max(width, height);
    if (currentLongEdge <= IMAGE_LONG_EDGE) break;
    const nextLongEdge = Math.max(IMAGE_LONG_EDGE, Math.round(currentLongEdge * 0.75));
    const scale = nextLongEdge / currentLongEdge;
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    workingCanvas = resizedCanvas(workingCanvas, width, height);
  }

  if (!encoded) throw new Error("Image could not be optimized");
  const dataUrl = await blobToDataUrl(encoded);
  const byteLength = new TextEncoder().encode(dataUrl).byteLength;
  if (byteLength > MAX_IMAGE_DATA_URL_BYTES) {
    throw new Error("Image remains too large after optimization");
  }

  return {
    dataUrl,
    width: encodedWidth,
    height: encodedHeight,
    byteLength,
    mediaType: encoded.type,
  };
}

function browserClipboard(): ClipboardImageReader | null {
  return typeof navigator === "undefined"
    ? null
    : (navigator.clipboard as ClipboardImageReader | undefined) ?? null;
}

function browserPrompt(): ((message: string) => string | null) | null {
  return typeof window === "undefined" ? null : window.prompt.bind(window);
}

export async function clipboardImageBlobs(
  clipboard: ClipboardImageReader | null = browserClipboard(),
): Promise<Blob[]> {
  if (!clipboard || typeof clipboard.read !== "function") return [];

  try {
    const items = await clipboard.read();
    const images: Blob[] = [];
    for (const item of items) {
      const imageType = item.types.find((type) => type.toLowerCase().startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      if (isSupportedImageFile(blob)) images.push(blob);
    }
    return images;
  } catch {
    return [];
  }
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
    const [image] = await clipboardImageBlobs(clipboard);
    if (image) return blobToDataUrl(image);

    const imageUrl = await clipboardImageUrl(clipboard);
    if (imageUrl) return imageUrl;
  }

  const prompt = options.prompt === undefined ? browserPrompt() : options.prompt;
  const prompted = prompt?.("Paste an image URL")?.trim() ?? "";
  return isImageSource(prompted) ? prompted : null;
}

export function imageElementProps(item: ImageBoardItem) {
  return {
    src: imageSource(item),
    alt: "Board image",
    draggable: false,
    decoding: "async",
    loading: "lazy",
  } as const;
}
