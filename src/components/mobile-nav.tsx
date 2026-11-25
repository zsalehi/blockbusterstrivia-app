"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { MobileAccountLinks } from "@/components/account-menu";
import { externalProps, type NavLink } from "@/lib/links";

// The menu panel is a native popover: Esc, tapping outside, top-layer stacking and the
// button's expanded state come from the browser. Positioning and the open/close icon swap
// live in globals.css (.mobile-nav, .mobile-menu).
export function MobileNav({ links }: { links: NavLink[] }) {
  const menu = useRef<HTMLDivElement>(null);
  // Client-side navigation doesn't reload the page, so close the popover ourselves.
  const close = () => menu.current?.hidePopover();

  useEffect(() => {
    // Older Safari (iOS before 18.3) has no popover support; load the polyfill only there.
    if (!Object.hasOwn(HTMLElement.prototype, "popover")) void import("@oddbird/popover-polyfill");
  }, []);

  return (
    <div className="mobile-nav md:hidden">
      <button
        type="button"
        popoverTarget="mobile-menu"
        aria-label="Menu"
        className="flex size-9 items-center justify-center rounded-md border border-border text-foreground"
      >
        <Menu aria-hidden className="icon-closed size-5" />
        <X aria-hidden className="icon-open size-5" />
      </button>

      <div
        ref={menu}
        id="mobile-menu"
        popover="auto"
        className="mobile-menu border-b border-border bg-background text-foreground shadow-lg"
      >
        <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-col px-4 py-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              {...(link.external ? externalProps : {})}
              onClick={close}
              className="border-b border-border py-3 text-sm font-medium text-muted-foreground last:border-b-0 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <MobileAccountLinks onNavigate={close} />
        </nav>
      </div>
    </div>
  );
}
