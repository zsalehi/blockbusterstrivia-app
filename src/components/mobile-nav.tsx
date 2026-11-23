"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { MobileAccountLinks } from "@/components/account-menu";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex size-9 items-center justify-center rounded-md border border-border text-foreground"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-background shadow-lg">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-border py-3 text-sm font-medium text-muted-foreground last:border-b-0 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <MobileAccountLinks onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}
    </div>
  );
}
