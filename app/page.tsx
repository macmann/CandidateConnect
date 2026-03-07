import Link from "next/link";

export default function HomePage() {
  const categories = [
    {
      title: "Profile",
      description: "Maintain your base CV, CV notes, and cover letter used for AI customization.",
      href: "/profile",
      cta: "Open Profile",
    },
    {
      title: "Applications",
      description: "Track every role, stage, and application status in one place.",
      href: "/applications",
      cta: "Open Applications",
    },
    {
      title: "Documents",
      description: "Manage CV and cover letter versions tailored to each opportunity.",
      href: "/documents",
      cta: "Open Documents",
    },
    {
      title: "Insights",
      description: "Review interview prep notes, article insights, and learning summaries.",
      href: "/insights",
      cta: "Open Insights",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Overview</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-600 md:text-lg">
          Welcome to CandidateConnect. Use the dashboard below to navigate directly to each
          sub-category of your workflow.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <article
            key={category.title}
            className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-slate-900">{category.title}</h2>
            <p className="mt-2 flex-1 text-sm text-slate-600">{category.description}</p>
            <Link
              href={category.href}
              className="mt-5 inline-flex w-fit rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            >
              {category.cta}
            </Link>
          </article>
        ))}
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        Tip: Start with <span className="font-semibold text-slate-800">Profile</span> to save your base CV and cover letter, then use <span className="font-semibold text-slate-800">Applications</span> to generate customized versions per job.
      </div>
    </div>
  );
}
