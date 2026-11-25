import { cn } from "@/lib/utils";

/** The BlockBusters hexagon wordmark. `lockup` adds the "Trivia Competition" line. */
// Intrinsic sizes from each SVG's viewBox, so the browser reserves the right space before it loads.
const LOGOS = {
  mark: { src: "/blockbusters-mark.svg", width: 1150, height: 443 },
  lockup: { src: "/blockbusters-logo.svg", width: 1150, height: 525 },
} as const;

export function Logo({
  variant = "mark",
  lazy = false,
  className,
}: {
  variant?: "mark" | "lockup";
  /** Set for logos below the fold (footer, CTA band). */
  lazy?: boolean;
  className?: string;
}) {
  const { src, width, height } = LOGOS[variant];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={width}
      height={height}
      loading={lazy ? "lazy" : undefined}
      alt="BlockBusters Trivia Competition"
      className={cn("h-auto w-full", className)}
    />
  );
}
