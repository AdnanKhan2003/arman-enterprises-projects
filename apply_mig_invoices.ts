import 'dotenv/config';
import { db } from './src/db/index';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Applying invoices migration...');
  try {
    await db.execute(sql`TRUNCATE TABLE "invoices" CASCADE;`);
    const migSql = fs.readFileSync(path.join(__dirname, 'drizzle', '0002_melted_harpoon.sql'), 'utf-8');
    const statements = migSql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const stmt of statements) {
      console.log('Executing:', stmt);
      await db.execute(sql.raw(stmt));
    }
    console.log('Done!');
  } catch (e) {
    console.error(e);
  }
}

main();
