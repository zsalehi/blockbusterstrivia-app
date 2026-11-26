import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Barlow } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

// Homestead: collegiate slab that matches the logo lettering. Page titles and big section headings only.
const homestead = localFont({
  src: "../fonts/Homestead-Regular.ttf",
  variable: "--font-homestead",
  weight: "400",
  display: "swap",
});

// Bebas Neue: secondary headings, labels, buttons, numbers.
const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

// Barlow: all running text, forms and tables.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "BlockBusters Trivia Competition",
    template: "%s · BlockBusters Trivia Competition",
  },
  description: "The largest BlockBusters-style trivia competition in the Toronto Shi'a community. Register your team today.",
};

// Emits <meta name="color-scheme" content="dark"> so the first paint is already dark (no white flash).
export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#121923",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${homestead.variable} ${bebas.variable} ${barlow.variable}`}>
      <body className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
