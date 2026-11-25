import { ChevronDown } from "lucide-react";

export type FaqItem = { question: string; answer: string };

// Native <details> accordion: no client JS, keyboard and screen reader support built in,
// and closed answers stay findable with the browser's find-in-page. Styles live in globals.css (.faq).
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="faq divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((item, i) => (
        <details key={item.question} open={i === 0}>
          <summary className="flex items-center gap-3 px-5 py-4 font-medium text-foreground">
            <ChevronDown aria-hidden className="faq-chevron size-4 shrink-0 text-muted-foreground" />
            {item.question}
          </summary>
          <p className="px-5 pb-4 pl-12 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
