import Link from "next/link";
import { notFound } from "next/navigation";
import { applicationService } from "@/lib/repositories/applicationService";
import { documentRepository } from "@/lib/repositories/documentRepository";
import { fieldAnswerService } from "@/lib/repositories/fieldAnswerService";
import { jobDescriptionSnapshotService } from "@/lib/repositories/jobDescriptionSnapshotService";

export default async function ApplicationPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const application = await applicationService.getApplication(id);

  if (!application || !application.submissionSnapshot) {
    notFound();
  }

  const [jdSnapshot, answers, cvVersion, coverVersion] = await Promise.all([
    jobDescriptionSnapshotService.getByApplicationId(id),
    fieldAnswerService.listByApplicationId(id),
    documentRepository.getById(application.submissionSnapshot.cv_version_id),
    documentRepository.getById(application.submissionSnapshot.cover_version_id),
  ]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Application Pack</h1>
        <Link href={`/applications/${id}`} className="rounded border px-3 py-2 text-sm">
          Back to workflow
        </Link>
      </div>

      <section className="rounded border p-4 text-sm">
        <p className="font-medium">{application.jobDescription.company}</p>
        <p>{application.jobDescription.title}</p>
        <p className="text-zinc-600">Submitted at {new Date(application.submissionSnapshot.submitted_at).toLocaleString()}</p>
      </section>

      <section className="rounded border p-4 text-sm">
        <h2 className="mb-2 text-lg font-medium">Final artifacts</h2>
        <p>CV: {cvVersion?.label ?? "Unknown"}</p>
        <p>Cover letter: {coverVersion?.label ?? "Unknown"}</p>
        <p>Salary expectation: {application.submissionSnapshot.salary_expectation}</p>
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-2 text-lg font-medium">JD snapshot</h2>
        <pre className="whitespace-pre-wrap text-sm">{jdSnapshot?.raw_text ?? application.jobDescription.description}</pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Final answers</h2>
        {answers.map((answer) => (
          <article key={answer.id} className="rounded border p-4">
            <h3 className="mb-2 font-medium">{answer.question}</h3>
            <p className="whitespace-pre-wrap text-sm">{answer.final_answer}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
