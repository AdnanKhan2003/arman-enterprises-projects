import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Altering tables...");
  
  try {
    await db.execute(sql`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "address" text;`);
    console.log("Added address to clients");
    
    await db.execute(sql`ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "address" text;`);
    console.log("Added address to vendors");
    
    await db.execute(sql`ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "vendor_type" text;`);
    console.log("Added vendor_type to vendors");
    
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "location" text;`);
    console.log("Added location to projects");
    
    console.log("Successfully altered tables!");
  } catch (error) {
    console.error("Failed to alter tables:", error);
  }
  
  process.exit(0);
}

main();
