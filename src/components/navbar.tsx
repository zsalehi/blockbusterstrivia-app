import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";

const LINKS = [
  { href: "/competitions", label: "Competitions" },
  { href: "/schedule", label: "Schedule" },
  { href: "/login", label: "Login" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/" aria-label="BlockBusters Trivia home" className="shrink-0">
          <Logo className="w-[140px] sm:w-[178px]" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/competitions">Register</Link>
          </Button>
          <MobileNav links={LINKS} />
        </div>
      </div>
    </header>
  );
}
