"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/components/design-system/atoms";

interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly squareSize?: number;
  readonly gridGap?: number;
  readonly flickerChance?: number;
  readonly color?: string;
  readonly width?: number;
  readonly height?: number;
  readonly maxOpacity?: number;
}

interface GridParams {
  readonly cols: number;
  readonly rows: number;
  readonly squares: Float32Array;
  readonly dpr: number;
}

function colorToRgbaPrefix(color: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "rgba(154, 104, 19,";

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);

  const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
  return `rgba(${r}, ${g}, ${b},`;
}

export function FlickeringGrid({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = "rgb(154, 104, 19)",
  width,
  height,
  className,
  maxOpacity = 0.25,
  ...props
}: FlickeringGridProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const memoizedColor = useMemo(() => {
    if (typeof window === "undefined") return "rgba(154, 104, 19,";
    return colorToRgbaPrefix(color);
  }, [color]);

  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, canvasWidth: number, canvasHeight: number): GridParams => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      const cols = Math.ceil(canvasWidth / (squareSize + gridGap));
      const rows = Math.ceil(canvasHeight / (squareSize + gridGap));
      const squares = new Float32Array(cols * rows);

      for (let i = 0; i < squares.length; i += 1) {
        squares[i] = Math.random() * maxOpacity;
      }

      return { cols, rows, squares, dpr };
    },
    [gridGap, maxOpacity, squareSize],
  );

  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number): void => {
      for (let i = 0; i < squares.length; i += 1) {
        if (Math.random() < flickerChance * deltaTime) {
          squares[i] = Math.random() * maxOpacity;
        }
      }
    },
    [flickerChance, maxOpacity],
  );

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      canvasWidth: number,
      canvasHeight: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number,
    ): void => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          const opacity = squares[i * rows + j] ?? 0;
          ctx.fillStyle = `${memoizedColor}${opacity})`;
          ctx.fillRect(
            i * (squareSize + gridGap) * dpr,
            j * (squareSize + gridGap) * dpr,
            squareSize * dpr,
            squareSize * dpr,
          );
        }
      }
    },
    [gridGap, memoizedColor, squareSize],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext("2d") ?? null;

    if (!canvas || !container || !ctx) return undefined;

    let animationFrameId: number | null = null;
    let gridParams: GridParams | null = null;

    const updateCanvasSize = (): void => {
      const newWidth = width ?? container.clientWidth;
      const newHeight = height ?? container.clientHeight;
      setCanvasSize({ width: newWidth, height: newHeight });
      gridParams = setupCanvas(canvas, newWidth, newHeight);
    };

    updateCanvasSize();

    let lastTime = performance.now();
    const animate = (time: number): void => {
      if (!isInView || !gridParams) return;

      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;
      updateSquares(gridParams.squares, deltaTime);
      drawGrid(
        ctx,
        canvas.width,
        canvas.height,
        gridParams.cols,
        gridParams.rows,
        gridParams.squares,
        gridParams.dpr,
      );
      animationFrameId = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry?.isIntersecting ?? false);
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    if (isInView) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [drawGrid, height, isInView, setupCanvas, updateSquares, width]);

  return (
    <div ref={containerRef} className={cn("h-full w-full", className)} {...props}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      />
    </div>
  );
}
