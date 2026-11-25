import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { AccountMenu } from "@/components/account-menu";
import { MAIN_LINKS, externalProps } from "@/lib/links";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur [anchor-name:--site-header]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/" aria-label="BlockBusters Trivia home" className="shrink-0">
          <Logo className="w-[140px] sm:w-[178px]" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {MAIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              {...(link.external ? externalProps : {})}
              className="font-display text-lg tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <AccountMenu />
          <Button asChild>
            <Link href="/register-team">Register</Link>
          </Button>
          <MobileNav links={MAIN_LINKS} />
        </div>
      </div>
    </header>
  );
}
