import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse } from "@/lib/authorize";
import { generateStudyMaterial, GenerationError } from "@/lib/gemini";

async function extractText(form: FormData): Promise<string> {
  const pasted = (form.get("text") as string | null)?.trim();
  const file = form.get("file") as File | null;

  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    if (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buf);
      return parsed.text;
    }
    // Treat anything else uploaded as plain text.
    return buf.toString("utf-8");
  }
  return pasted ?? "";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const form = await req.formData();
    const sourceText = (await extractText(form)).trim();
    if (sourceText.length < 40) {
      return Response.json({ error: "Give us a bit more material to work with (at least a few sentences)." }, { status: 400 });
    }

    const generated = await generateStudyMaterial(sourceText);

    const deck = await prisma.deck.create({
      data: {
        userId: user.id,
        title: generated.title,
        topic: generated.topic,
        sourceText: sourceText.slice(0, 5000),
        flashcards: {
          create: generated.flashcards.map((f, i) => ({ front: f.front, back: f.back, position: i })),
        },
        quiz: {
          create: {
            userId: user.id,
            title: generated.quizTitle,
            questions: {
              create: generated.questions.map((q, i) => ({
                prompt: q.prompt,
                choices: JSON.stringify(q.choices),
                correctIndex: q.correctIndex,
                explanation: q.explanation,
                position: i,
              })),
            },
          },
        },
      },
      include: { quiz: true },
    });

    return Response.json({ deckId: deck.id, quizId: deck.quiz!.id }, { status: 201 });
  } catch (err) {
    if (err instanceof GenerationError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    return authErrorResponse(err);
  }
}
