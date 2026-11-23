import { cn } from "@/lib/utils";

const SQRT3 = Math.sqrt(3);

export type HexVariant = "red" | "blue" | "neutral" | "active";

export type HexCell = {
  col: number;
  row: number;
  label?: string;
  variant?: HexVariant;
};

const FILLS: Record<HexVariant, string> = {
  red: "var(--brand-red)",
  blue: "var(--brand-blue)",
  neutral: "var(--board-cell)",
  active: "var(--brand-yellow)",
};

/**
 * Honeycomb laid out on the same lattice as the BlockBusters logo: hexagons with
 * flat top/bottom edges and points left/right, columns stepping 1.5r apart with
 * odd columns dropped half a hex.
 */
export function HexGrid({
  cells,
  radius = 48,
  seam = 2,
  className,
}: {
  cells: HexCell[];
  radius?: number;
  seam?: number;
  className?: string;
}) {
  const height = SQRT3 * radius;
  const placed = cells.map((cell) => ({
    ...cell,
    cx: cell.col * 1.5 * radius,
    cy: cell.row * height + (Math.abs(cell.col % 2) === 1 ? height / 2 : 0),
  }));

  const minX = Math.min(...placed.map((c) => c.cx)) - radius;
  const maxX = Math.max(...placed.map((c) => c.cx)) + radius;
  const minY = Math.min(...placed.map((c) => c.cy)) - height / 2;
  const maxY = Math.max(...placed.map((c) => c.cy)) + height / 2;

  const r = radius - seam;
  const h = SQRT3 * r;
  const points = [
    [r, 0],
    [r / 2, h / 2],
    [-r / 2, h / 2],
    [-r, 0],
    [-r / 2, -h / 2],
    [r / 2, -h / 2],
  ]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      className={cn("h-auto w-full", className)}
      aria-hidden
    >
      {placed.map((cell, i) => (
        <g key={i} transform={`translate(${cell.cx} ${cell.cy})`}>
          <polygon points={points} fill={FILLS[cell.variant ?? "neutral"]} />
          {cell.label && (
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              fontSize={radius * 0.78}
              fontFamily="var(--font-homestead), serif"
            >
              {cell.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Tessellated honeycomb used as a faint background texture. */
export function HexPattern({ className }: { className?: string }) {
  const r = 28;
  const h = SQRT3 * r;
  const points = [
    [r, 0],
    [r / 2, h / 2],
    [-r / 2, h / 2],
    [-r, 0],
    [-r / 2, -h / 2],
    [r / 2, -h / 2],
  ]
    .map(([x, y]) => `${x + 1.5 * r},${y + h}`)
    .join(" ");

  return (
    <svg className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden>
      <defs>
        <pattern id="honeycomb" width={3 * r} height={h * 2} patternUnits="userSpaceOnUse">
          <polygon points={points} fill="none" stroke="currentColor" strokeWidth={1} />
          <polygon
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            transform={`translate(${-1.5 * r} ${-h})`}
          />
          <polygon
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            transform={`translate(${1.5 * r} ${-h})`}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#honeycomb)" />
    </svg>
  );
}
