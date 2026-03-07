export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} CandidateConnect</p>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Stay organized. Interview with confidence.
        </p>
      </div>
    </footer>
  );
}
