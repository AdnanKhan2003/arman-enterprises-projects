import 'dotenv/config';
import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Adding columns...');
  try {
    await db.execute(sql`ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "check_in_time" timestamp;`);
    await db.execute(sql`ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "check_out_time" timestamp;`);
    console.log('Done!');
  } catch (e) {
    console.error(e);
  }
}

main();
