import Link from "next/link";
import { getInsights } from "@/lib/mdx/getInsights";

export const metadata = {
  title: "Insights"
};

export default async function InsightsPage() {
  const posts = await getInsights();

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Insights</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Insights library
        </h1>
        <p className="mt-3 text-slate-700">
          MDX-driven posts from the local content folder for interview prep and learning.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/insights/${p.slug}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            <div className="text-sm text-slate-500">{new Date(p.date).toLocaleDateString()}</div>
            <div className="mt-1 text-lg font-semibold">{p.title}</div>
            {p.summary ? <div className="mt-2 text-sm text-slate-700">{p.summary}</div> : null}
            {p.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
