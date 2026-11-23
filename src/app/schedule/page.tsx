import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CtaBand } from "@/components/cta-band";

export const metadata: Metadata = {
  title: "Schedule",
  description: "BlockBusters Trivia Competition schedule, rules, and logistics.",
};

const SESSIONS = [
  {
    title: "Men's session",
    body: "Runs first on the night. The full bracket and rules document is shared with registered teams ahead of the event.",
  },
  {
    title: "Ladies' session",
    body: "Runs after the hall is cleared. The full bracket and rules document is shared with registered teams ahead of the event.",
  },
];

export default function SchedulePage() {
  return (
    <>
      <PageHeader
        eyebrow="Logistics"
        title="Competition schedule"
        lead="Our competition runs as separate men's and women's sessions at Zainabiyya Hall B."
      />

      <section className="mx-auto max-w-3xl px-4 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {SESSIONS.map((session) => (
            <div key={session.title} className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-xl font-semibold">{session.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{session.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Start times</h2>
          <p className="mt-2 text-muted-foreground">
            The competition starts a little after the program begins, so there is time to clear the
            hall between sessions. Thank you for helping us run on schedule.
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            Questions about timing or logistics? Email{" "}
            <a href="mailto:info@blockbusterstrivia.com" className="text-primary hover:underline">
              info@blockbusterstrivia.com
            </a>
            .
          </p>
        </div>
      </section>

      <CtaBand title="Sign up your team today." />
    </>
  );
}
