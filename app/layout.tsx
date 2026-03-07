import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";

export const metadata: Metadata = {
  title: {
    default: "CandidateConnect",
    template: "%s | CandidateConnect"
  },
  description: "A polished workspace to track applications, documents, and interview preparation."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Header />
        <Container className="py-10 md:py-14">{children}</Container>
        <Footer />
      </body>
    </html>
  );
}
