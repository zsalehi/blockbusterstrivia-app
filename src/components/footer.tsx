import Link from "next/link";
import { Logo } from "@/components/logo";
import { STORE_URL, externalProps, type NavLink } from "@/lib/links";

const COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: "Navigation",
    links: [
      { href: "/", label: "Home" },
      { href: "/competitions", label: "Competitions" },
      { href: "/schedule", label: "Schedule" },
      { href: STORE_URL, label: "Store", external: true },
      { href: "/login", label: "Login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/waivers", label: "Waiver" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

const SOCIAL = [
  { href: "https://www.facebook.com/BlockBustersTC", label: "Facebook" },
  { href: "https://www.instagram.com/BlockBustersTC", label: "Instagram" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo variant="lockup" className="w-[190px]" />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The largest trivia competition of its kind in the Toronto Shi&apos;a community.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="mb-3 text-lg text-foreground">
                {column.title}
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} {...(link.external ? externalProps : {})} className="transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="mb-3 text-lg text-foreground">
              Contact
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {SOCIAL.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="mailto:info@blockbusterstrivia.com"
                  className="transition-colors hover:text-foreground"
                >
                  info@blockbusterstrivia.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          © BlockBusters Trivia Competition {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
