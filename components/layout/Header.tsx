import Link from "next/link";

const PRODUCT_LOGO_URL = "https://i.ibb.co/1tpDjM2h/imageedit-3-6426359363.png";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <img src={PRODUCT_LOGO_URL} alt="CandidateConnect logo" className="h-8 w-auto" />
          CandidateConnect
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            className="rounded-lg px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            href="/"
          >
            Workspace
          </Link>
          <Link
            className="rounded-lg px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            href="/applications"
          >
            Applications
          </Link>
          <Link
            className="rounded-lg px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            href="/profile"
          >
            Profile
          </Link>
        </nav>
      </div>
    </header>
  );
}
