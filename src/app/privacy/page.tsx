import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CtaBand } from "@/components/cta-band";
import { LegalBody, type LegalSection } from "@/components/legal-body";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How BlockBusters Trivia collects, uses, and protects your information.",
};

const SECTIONS: LegalSection[] = [
  {
    title: "Information we collect",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-foreground">Information you provide directly:</span>{" "}
          name, email, phone, team and participant details, payment information (handled through
          outside payment processors), and any correspondence with us.
        </li>
        <li>
          <span className="font-medium text-foreground">Event and participation information:</span>{" "}
          attendance, scores and rankings, and team affiliation.
        </li>
        <li>
          <span className="font-medium text-foreground">Media and content:</span> event photos and
          video, plus user-generated material like team names or testimonials.
        </li>
        <li>
          <span className="font-medium text-foreground">Website and technical data:</span> IP
          address, device and browser information, and analytics gathered via cookies.
        </li>
      </ul>
    ),
  },
  {
    title: "How we use your information",
    body: "We use your information to run our events and competitions, send updates and results, handle registration and payment, improve our website and offerings, market BlockBusters with your consent, and meet our legal obligations.",
  },
  {
    title: "Legal basis for processing (where applicable)",
    body: "Depending on your jurisdiction, we process your data based on your consent, performance of a contract for event participation, our legitimate business interests, or a legal obligation.",
  },
  {
    title: "Sharing your information",
    body: "We share information with event partners and venues, payment and service providers, and marketing and analytics platforms, and may disclose it to regulators or legal authorities when compelled. We do not sell your personal data.",
  },
  {
    title: "Cookies & tracking technologies",
    body: "We may use cookies and analytics tools. You can manage your preferences through your browser settings.",
  },
  {
    title: "Data retention",
    body: "We keep your data only as long as needed for the purposes described in this notice, or as required by law.",
  },
  {
    title: "Your rights",
    body: (
      <>
        Depending on your location, you may have the right to access, correct, or delete your data,
        withdraw consent, or object to certain processing. To exercise these rights, email{" "}
        <a href="mailto:info@blockbusterstrivia.com" className="text-primary hover:underline">
          info@blockbusterstrivia.com
        </a>
        .
      </>
    ),
  },
  {
    title: "Security",
    body: "We maintain reasonable administrative, technical, and physical safeguards to protect your information.",
  },
  {
    title: "Contact us",
    body: (
      <>
        Questions about this notice? Email{" "}
        <a href="mailto:info@blockbusterstrivia.com" className="text-primary hover:underline">
          info@blockbusterstrivia.com
        </a>
        .
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Privacy Notice" />
      <LegalBody
        updated="January 4, 2026"
        intro={
          <p>
            BlockBusters Trivia respects your privacy. This notice explains how we collect, use,
            disclose, and protect your information across our website, events, and competitions.
          </p>
        }
        sections={SECTIONS}
      />
      <CtaBand title="Sign up your team today." />
    </>
  );
}
