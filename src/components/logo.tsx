import { cn } from "@/lib/utils";

/** The BlockBusters hexagon wordmark. `lockup` adds the "Trivia Competition" line. */
export function Logo({
  variant = "mark",
  className,
}: {
  variant?: "mark" | "lockup";
  className?: string;
}) {
  const src = variant === "lockup" ? "/blockbusters-logo.svg" : "/blockbusters-mark.svg";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="BlockBusters Trivia Competition"
      className={cn("h-auto w-full", className)}
    />
  );
}
