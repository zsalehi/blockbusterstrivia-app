import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { HexPattern } from "@/components/hex-grid";

export function CtaBand({
  title = "Get your four together and sign up.",
  showLogo = false,
}: {
  title?: string;
  showLogo?: boolean;
}) {
  return (
    <section className="relative overflow-hidden border-t border-border bg-card">
      <HexPattern className="text-white/[0.04]" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-7 px-4 py-20 text-center lg:py-24">
        {showLogo && <Logo variant="lockup" className="w-[220px]" />}
        <h2 className="max-w-xl font-brand text-2xl text-balance sm:text-3xl">{title}</h2>
        <Button size="lg" asChild>
          <Link href="/competitions">Register your team</Link>
        </Button>
      </div>
    </section>
  );
}
