import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { z } from "zod";

// See the whiteboard writeup in README: we use Gemini's responseSchema to
// constrain the model's output shape, THEN validate with zod before trusting
// it. Neither alone is enough — responseSchema keeps the model honest about
// structure but the SDK still hands us a string; zod is what actually
// guarantees the shape at runtime and turns "wrong shape" into a clear
// error instead of a corrupted deck.

const flashcardSchema = {
  type: SchemaType.OBJECT,
  properties: {
    front: { type: SchemaType.STRING },
    back: { type: SchemaType.STRING },
  },
  required: ["front", "back"],
};

const questionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    prompt: { type: SchemaType.STRING },
    choices: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    correctIndex: { type: SchemaType.INTEGER },
    explanation: { type: SchemaType.STRING },
  },
  required: ["prompt", "choices", "correctIndex", "explanation"],
};

const generationSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    topic: { type: SchemaType.STRING, description: "A short 1-4 word topic label, e.g. 'Photosynthesis' or 'WWII causes'" },
    flashcards: { type: SchemaType.ARRAY, items: flashcardSchema },
    quizTitle: { type: SchemaType.STRING },
    questions: { type: SchemaType.ARRAY, items: questionSchema },
  },
  required: ["title", "topic", "flashcards", "quizTitle", "questions"],
};

const ZQuestion = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(6),
  correctIndex: z.number().int(),
  explanation: z.string().min(1),
}).refine((q) => q.correctIndex >= 0 && q.correctIndex < q.choices.length, {
  message: "correctIndex out of range for choices",
});

const ZGeneration = z.object({
  title: z.string().min(1),
  topic: z.string().min(1),
  flashcards: z.array(z.object({ front: z.string().min(1), back: z.string().min(1) })).min(1),
  quizTitle: z.string().min(1),
  questions: z.array(ZQuestion).min(1),
});

export type StudyGeneration = z.infer<typeof ZGeneration>;

export class GenerationError extends Error {}

export async function generateStudyMaterial(sourceText: string): Promise<StudyGeneration> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key") {
    throw new GenerationError(
      "No Gemini API key is configured. Get a free key at https://aistudio.google.com/apikey, " +
        "put it in .env as GEMINI_API_KEY, and restart the server."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    // Stable Flash model: https://ai.google.dev/gemini-api/docs/models.
    model: "gemini-3.8-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: generationSchema as any,
    },
  });

  const prompt = `You are creating study material from the notes below.
Produce:
- A short deck title and a short topic label (1-4 words) that captures the subject.
- 8-12 flashcards covering the key facts/concepts (front = question or term, back = answer/definition).
- A quiz title and 5-8 multiple-choice questions (3-5 choices each, exactly one correct answer, plus a one-sentence explanation of the correct answer).

Base everything strictly on the notes below — don't invent facts not supported by them.

NOTES:
"""
${sourceText.slice(0, 12000)}
"""`;

  let raw: string;
  try {
    const result = await model.generateContent(prompt);
    raw = result.response.text();
  } catch (err) {
    console.error("Gemini request failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    if (/API key not valid|API_KEY_INVALID|400/.test(message)) {
      throw new GenerationError("Your Gemini API key was rejected. Double-check GEMINI_API_KEY in .env, then restart the server.");
    }
    if (/429|quota|rate limit/i.test(message)) {
      throw new GenerationError("Gemini's rate limit or free-tier quota was hit. Wait a bit and try again.");
    }
    if (/fetch failed|ENOTFOUND|ECONNREFUSED|network/i.test(message)) {
      throw new GenerationError("Couldn't reach Gemini — check your internet connection and try again.");
    }
    throw new GenerationError("The AI generation request failed. Try again in a moment.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GenerationError("The AI returned a response we couldn't parse. Try again.");
  }

  const validated = ZGeneration.safeParse(parsed);
  if (!validated.success) {
    console.error("Gemini output failed validation:", validated.error.flatten());
    throw new GenerationError("The AI response didn't match the expected format. Try again.");
  }

  return validated.data;
}
