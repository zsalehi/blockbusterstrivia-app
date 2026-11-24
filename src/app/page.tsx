import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Faq } from "@/components/faq";
import { CtaBand } from "@/components/cta-band";
import { HexGrid, HexPattern, type HexCell } from "@/components/hex-grid";

const HERO_BOARD: HexCell[] = [
  { col: 0, row: 0, label: "K", variant: "blue" },
  { col: 0, row: 1, label: "D", variant: "neutral" },
  { col: 0, row: 2, label: "S", variant: "blue" },
  { col: 1, row: 0, label: "M", variant: "red" },
  { col: 1, row: 1, label: "A", variant: "active" },
  { col: 1, row: 2, label: "T", variant: "neutral" },
  { col: 2, row: 0, label: "P", variant: "red" },
  { col: 2, row: 1, label: "R", variant: "neutral" },
  { col: 2, row: 2, label: "E", variant: "blue" },
];

const STATS = [
  { value: "Since 2012", label: "Running for over a decade" },
  { value: "4 players", label: "Make up a complete team" },
  { value: "Largest", label: "Of its kind in the Toronto Shi'a community" },
];

const STEPS = [
  {
    step: "1",
    variant: "red" as const,
    title: "Pick a block",
    body: "Teams take turns choosing a hexagon on the board. Every hexagon carries a question.",
  },
  {
    step: "2",
    variant: "blue" as const,
    title: "Answer the clue",
    body: "Buzz in first with the right answer — and the answer always starts with a letter.",
  },
  {
    step: "3",
    variant: "red" as const,
    title: "Connect your side",
    body: "Claim the block. The first team to build a path across their side of the board wins.",
  },
];

const FAQ_ITEMS = [
  {
    question: "What is BlockBusters?",
    answer:
      "BlockBusters is a trivia game adapted from the original game show created by Steve Ryan and Mark Goodson. The board is a grid of hexagons, each representing a letter. Teams try to connect their assigned side of the board by correctly answering letter-prefixed questions, building a path across. It's become a staple event for Shia Muslim audiences worldwide, especially in Toronto, popular for its blend of strategy and Islamic and general knowledge.",
  },
  {
    question: "How old do I have to be?",
    answer:
      "BlockBusters is designed to be inclusive of all ages. Specific competitions may have age restrictions depending on logistics, so check the requirements when you register.",
  },
  {
    question: "What is the question format?",
    answer:
      "After selecting a hexagon block the host will read a question that gives a letter clue, the letter clue is the first letter of the answer of the question. For example, a question read with a letter clue of \"A\" might prompt: \"What A is the name of the first Imam?\" Answer: Ali.",
  },
  {
    question: "How many are in a team?",
    answer: "To form a complete team, there must be four players at the time of registration.",
  },
  {
    question: "I still have some questions...",
    answer: "Email us any time at info@blockbusterstrivia.com and we'll get back to you.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <HexPattern className="text-white/[0.04]" />
        <div className="absolute inset-x-0 -top-40 -z-0 mx-auto h-80 max-w-3xl rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
          <div>
            <p className="eyebrow">Toronto &middot; Since 2012</p>
            <h1 className="mt-4 text-4xl leading-[1.05] font-bold text-balance sm:text-5xl lg:text-6xl">
              Will you be the next BlockBusters Champions?
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Four players. One hexagon board. Every answer starts with the letter. Build
              your team, out-think the other side, and connect the board first.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/competitions">Register your team</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/schedule">View the schedule</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[300px] sm:max-w-[360px]">
            <HexGrid cells={HERO_BOARD} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STATS.map((stat) => (
            <div key={stat.value} className="px-6 py-8 text-center sm:px-8">
              <p className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 lg:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 font-brand text-2xl sm:text-3xl">
            Trivia, but you have to earn the board.
          </h2>
          <p className="mt-4 text-muted-foreground">
            It&apos;s part knowledge, part strategy. Knowing the answer is only half of it — you
            still have to pick the right block.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <ol className="space-y-8">
            {STEPS.map((step) => (
              <li key={step.step} className="flex gap-5">
                <div className="w-12 shrink-0 pt-1">
                  <HexGrid
                    cells={[{ col: 0, row: 0, label: step.step, variant: step.variant }]}
                    radius={40}
                    seam={0}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-xl border border-border bg-card p-6">
            <p className="eyebrow">For example</p>
            <div className="mt-5 flex items-center gap-4">
              <div className="w-14 shrink-0">
                <HexGrid
                  cells={[{ col: 0, row: 0, label: "A", variant: "active" }]}
                  radius={40}
                  seam={0}
                />
              </div>
              <p className="text-sm text-muted-foreground">You pick a block with A as the letter clue.</p>
            </div>
            <p className="mt-6 text-lg leading-snug font-medium text-foreground">
              &ldquo;What <span className="text-brand-yellow">A</span> is the name of the first
              Imam?&rdquo;
            </p>
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs tracking-wider text-muted-foreground uppercase">Answer</p>
              <p className="mt-1 font-display text-2xl font-bold text-primary">Ali</p>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="relative overflow-hidden border-y border-border bg-card">
        <HexPattern className="text-white/[0.03]" />
        <div className="relative mx-auto max-w-3xl px-4 py-20 lg:py-24">
          <p className="eyebrow">Our story</p>
          <h2 className="mt-3 font-brand text-2xl sm:text-3xl">About BlockBusters</h2>

          <div className="mt-6 space-y-5 text-muted-foreground">
            <p>
              BlockBusters was conceived over a decade ago during the Holy Month of Ramadhan by a
              group of youth who set out to build a platform for Muslims to keep learning, at a
              time when there was a lack of enthusiasm for gaining knowledge among youth.
            </p>
            <p>The vision was to embody a message attributed to the Holy Prophet (saw):</p>
          </div>

          <blockquote className="my-8 border-l-2 border-primary pl-6">
            <p className="text-2xl leading-snug font-medium text-foreground italic sm:text-3xl">
              &ldquo;Seek knowledge from the cradle to the grave.&rdquo;
            </p>
          </blockquote>

          <div className="space-y-5 text-muted-foreground">
            <p>
              — by creating an engaging way for community members to learn from one another. Since
              then, the competition has grown into the largest event of its kind in the Toronto
              Shi&apos;a Community.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 lg:py-24">
        <p className="eyebrow">Questions</p>
        <h2 className="mt-3 font-brand text-2xl sm:text-3xl">Frequently asked</h2>
        <div className="mt-8">
          <Faq items={FAQ_ITEMS} />
        </div>
      </section>

      <CtaBand showLogo />
    </>
  );
}
