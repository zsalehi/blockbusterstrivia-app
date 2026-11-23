import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CtaBand } from "@/components/cta-band";
import { LegalBody, type LegalSection } from "@/components/legal-body";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for the BlockBusters Trivia Competition website, events, and services.",
};

const SECTIONS: LegalSection[] = [
  {
    title: "Eligibility",
    body: "Participants must be at least 18 years old, or accompanied by a parent or guardian if under 18.",
  },
  {
    title: "Event participation",
    body: "Participants agree to follow event rules and act respectfully toward hosts, staff, venues, and other participants. We reserve the right to remove any participant who engages in disruptive, unsafe, or offensive behavior, without refund.",
  },
  {
    title: "Registration & payments",
    body: "Registrations are subject to availability. Payments are final unless otherwise stated. We reserve the right to cancel or reschedule events.",
  },
  {
    title: "Intellectual property",
    body: "All content, branding, questions, formats, and materials are owned by BlockBusters Trivia and may not be copied or reused without permission.",
  },
  {
    title: "User content",
    body: "Submitting content to us (team names, photos, testimonials) grants us a non-exclusive, royalty-free license to use it for promotional and operational purposes.",
  },
  {
    title: "Limitation of liability",
    body: "To the maximum extent permitted by law, we are not liable for personal injury, property damage, lost items, technical failures, or event cancellations due to circumstances beyond our control.",
  },
  {
    title: "Indemnification",
    body: "You agree to indemnify and hold harmless BlockBusters Trivia from claims arising from your participation or violation of these Terms.",
  },
  {
    title: "Governing law",
    body: "These Terms are governed by the laws of Ontario, Canada.",
  },
  {
    title: "Contact",
    body: (
      <>
        Email{" "}
        <a href="mailto:info@blockbusterstrivia.com" className="text-primary hover:underline">
          info@blockbusterstrivia.com
        </a>
        .
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Terms of Service" />
      <LegalBody
        updated="January 4, 2026"
        intro={
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
            BlockBusters Trivia website, events, and services. By accessing our website or
            participating in a BlockBusters Trivia event, you agree to be bound by these Terms.
          </p>
        }
        sections={SECTIONS}
      />
      <CtaBand title="Sign up your team today." />
    </>
  );
}
