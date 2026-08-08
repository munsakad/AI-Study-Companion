import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TakeQuiz from "./TakeQuiz";

export default async function TakeQuizPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!quiz) notFound();
  if (quiz.userId !== session.user.id) redirect("/dashboard");

  // Never send correctIndex to the client before they've submitted.
  const questions = quiz.questions.map((q) => ({ id: q.id, prompt: q.prompt, choices: JSON.parse(q.choices) as string[] }));

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-bold text-ink">{quiz.title}</h1>
      <TakeQuiz quizId={quiz.id} questions={questions} />
    </div>
  );
}
