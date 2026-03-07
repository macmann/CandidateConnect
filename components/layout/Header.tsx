import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-xs font-bold text-white">
            CC
          </span>
          CandidateConnect
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            className="rounded-lg px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            href="/applications"
          >
            Applications
          </Link>
          <Link
            className="rounded-lg px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            href="/documents"
          >
            Documents
          </Link>
          <Link
            className="rounded-lg px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            href="/insights"
          >
            Insights
          </Link>
        </nav>
      </div>
    </header>
  );
}
