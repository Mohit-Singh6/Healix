import { PrismaClient } from "@prisma/client";

// FROM DOCS (prisma seed: https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding)
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


// From gemini
async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create a default developer user
  const user = await prisma.user.upsert({
    where: { email: "dev@example.com" },
    update: {},
    create: {
      email: "dev@example.com",
      name: "Lead SRE",
    },
  });

  // 2. Create a test project with a predictable API Key for testing
  const project = await prisma.project.upsert({
    where: { apiKey: "test_project_api_key_123" },
    update: {},
    create: {
      name: "Core E-Commerce API",
      repoOwner: "your-github-username",
      repoName: "demo-target-repo",
      deployedUrl: "https://demo.example.com",
      apiKey: "test_project_api_key_123",
      userId: user.id,
    },
  });

  console.log(`✅ Seeded project: ${project.name} (API Key: ${project.apiKey})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });