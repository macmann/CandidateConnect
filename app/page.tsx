import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Next.js App Router + MDX Scaffold</h1>
      <p className="text-neutral-700">
        This repo is set up for Next.js (App Router), TypeScript, Tailwind, and an MDX-driven
        Insights section.
      </p>
      <div className="flex gap-3">
        <Link
          href="/builder"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Agent Builder
        </Link>
        <Link
          href="/insights"
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          View Insights
        </Link>
        <Link
          href="/applications"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Track Applications
        </Link>
        <Link
          href="/documents"
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Manage Documents
        </Link>
        <a
          href="https://nextjs.org/docs"
          className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          target="_blank"
          rel="noreferrer"
        >
          Next.js Docs
        </a>
      </div>
    </div>
  );
}
