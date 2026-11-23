import { HexPattern } from "@/components/hex-grid";

export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <HexPattern className="text-white/[0.04]" />
      <div className="relative mx-auto max-w-3xl px-4 py-16 lg:py-20">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold text-balance sm:text-5xl">{title}</h1>
        {lead && <p className="mt-5 text-lg text-muted-foreground">{lead}</p>}
      </div>
    </section>
  );
}
