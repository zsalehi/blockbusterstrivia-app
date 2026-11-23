import type { ReactNode } from "react";

export type LegalSection = { title: string; body: ReactNode };

export function LegalBody({
  updated,
  intro,
  sections,
}: {
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 lg:py-20">
      <p className="text-sm text-muted-foreground">Last updated: {updated}</p>
      <div className="mt-6 text-muted-foreground">{intro}</div>

      <div className="mt-10 space-y-9">
        {sections.map((section, i) => (
          <div key={section.title}>
            <h2 className="text-xl font-semibold text-foreground">
              <span className="mr-2 text-primary">{i + 1}.</span>
              {section.title}
            </h2>
            <div className="mt-2 text-muted-foreground">{section.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
