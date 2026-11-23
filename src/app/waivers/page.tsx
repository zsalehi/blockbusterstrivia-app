import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CtaBand } from "@/components/cta-band";
import { LegalBody, type LegalSection } from "@/components/legal-body";

export const metadata: Metadata = {
  title: "Liability, Media & Participation Waiver",
  description: "Waiver covering assumption of risk, liability, and media consent for BlockBusters Trivia events.",
};

const SECTIONS: LegalSection[] = [
  {
    title: "Assumption of risk",
    body: "You acknowledge that trivia events carry inherent risk, including slips, falls, and minor injuries, crowded settings, and the use of electronic equipment. You voluntarily assume these risks.",
  },
  {
    title: "Release of liability",
    body: "You release and hold harmless BlockBusters Trivia, its organizers, hosts, partners, venues, and staff from claims, injury, loss, or damage related to your participation, except where the law does not allow this.",
  },
  {
    title: "Medical responsibility",
    body: "You are responsible for your own medical condition and fitness to participate.",
  },
  {
    title: "Photography & videography consent",
    body: "You grant BlockBusters Trivia the right to photograph, film, and record you, and to use your likeness, voice, and image for marketing, promotion, and archival purposes, including on our website, social media, and promotional materials. This grant is royalty-free, worldwide, and perpetual.",
  },
  {
    title: "Opt-out option",
    body: "If you do not want to be filmed, notify event staff prior to the event. Staff will make reasonable efforts to accommodate your request.",
  },
  {
    title: "Binding agreement",
    body: "By participating, you confirm that this waiver is binding and that you have read and understood it.",
  },
];

export default function WaiversPage() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Liability, Media & Participation Waiver" />
      <LegalBody
        updated="January 4, 2026"
        intro={
          <p>
            By attending or taking part in a BlockBusters Trivia event, you agree to the terms
            below.
          </p>
        }
        sections={SECTIONS}
      />
      <CtaBand title="Sign up your team today." />
    </>
  );
}
