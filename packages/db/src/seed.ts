import { createDb } from "./client.js";
import { companies, goals, projects, issues } from "./schema/index.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const db = createDb(url);

console.log("Seeding database...");

const [company] = await db
  .insert(companies)
  .values({
    name: "HSU LTD",
    description: "Mission Control",
    status: "active",
    budgetMonthlyCents: 50000,
  })
  .returning();

const [goal] = await db
  .insert(goals)
  .values({
    companyId: company!.id,
    title: "Ship V1",
    description: "Deliver first release",
    level: "company",
    status: "active",
  })
  .returning();

const [project] = await db
  .insert(projects)
  .values({
    companyId: company!.id,
    goalId: goal!.id,
    name: "Mission Control MVP",
    description: "Core operations platform",
    status: "in_progress",
  })
  .returning();

await db.insert(issues).values([
  {
    companyId: company!.id,
    projectId: project!.id,
    goalId: goal!.id,
    title: "Set up initial operations",
    description: "Configure the platform for production use",
    status: "todo",
    priority: "high",
  },
]);

console.log("Seed complete");
process.exit(0);
