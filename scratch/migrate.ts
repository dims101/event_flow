import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS rundown_start_time text NOT NULL DEFAULT '08:00'`);
    console.log('Migration done!');
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
