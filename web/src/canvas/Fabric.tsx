import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

import type { CanvasController } from "./useCanvas";

type PositionableProps = {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  item?: {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  };
  style?: CSSProperties;
};

export type FabricProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel"
> & {
  canvas: CanvasController;
  children?: ReactNode;
};

const CanvasContext = createContext<CanvasController | null>(null);

export function useCanvasContext(): CanvasController {
  const canvas = useContext(CanvasContext);
  if (!canvas) throw new Error("useCanvasContext must be used inside <Fabric>");
  return canvas;
}

function positionOf(child: ReactElement<PositionableProps>) {
  const source = child.props.item ?? child.props;
  const x = Number(source.x);
  const y = Number(source.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x,
    y,
    w: Number.isFinite(Number(source.w)) ? Number(source.w) : undefined,
    h: Number.isFinite(Number(source.h)) ? Number(source.h) : undefined,
  };
}

function positionChild(child: ReactNode, canvas: CanvasController): ReactNode {
  if (!isValidElement<PositionableProps>(child)) return child;

  const position = positionOf(child);
  if (!position) return child;

  const [centerX, centerY] = canvas.center;
  const [anchorX, anchorY] = canvas.anchor;
  const style: CSSProperties = {
    ...child.props.style,
    position: "absolute",
    left: `calc(50vw - ${anchorX}px)`,
    top: `calc(50vh - ${anchorY}px)`,
    transformOrigin: `calc(-50vw + ${anchorX}px) calc(-50vh + ${anchorY}px)`,
    transform: `scale(${canvas.zoom}) translate3d(${position.x - centerX}px,${position.y - centerY}px,0)`,
  };

  return cloneElement(child, {
    style,
    "data-world-x": position.x,
    "data-world-y": position.y,
    "data-world-w": position.w,
    "data-world-h": position.h,
  } as Partial<PositionableProps>);
}

export function Fabric({ canvas, children, className = "", ...props }: FabricProps) {
  return (
    <CanvasContext.Provider value={canvas}>
      <div
        {...props}
        ref={canvas.fabricRef}
        className={`fabric relative h-full w-full overflow-hidden touch-none select-none ${className}`.trim()}
        onPointerDown={canvas.onPointerDown}
        onPointerMove={canvas.onPointerMove}
        onPointerUp={canvas.onPointerUp}
        onPointerCancel={canvas.onPointerCancel}
      >
        {Children.map(children, (child) => positionChild(child, canvas))}
      </div>
    </CanvasContext.Provider>
  );
}
