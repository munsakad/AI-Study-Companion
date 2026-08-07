import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Student123!", 10);
  await prisma.user.upsert({
    where: { email: "sam@devweekends.dev" },
    update: {},
    create: { name: "Sam Lee", email: "sam@devweekends.dev", passwordHash: hash },
  });

  console.log("Seeded:");
  console.log("  Student -> sam@devweekends.dev / Student123!");
  console.log("");
  console.log("No sample decks were seeded — deck generation requires a real");
  console.log("GEMINI_API_KEY, so create your first deck from the app once");
  console.log("that's set in .env.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
