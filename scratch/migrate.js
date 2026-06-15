const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
if (!match) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

const connectionString = match[1];
console.log("Connecting to database...");
const sql = postgres(connectionString, { prepare: false });

async function run() {
  try {
    console.log("Creating pics table...");
    await sql`
      CREATE TABLE IF NOT EXISTS pics (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );
    `;
    console.log("Pics table created successfully.");

    console.log("Adding target_pics column to rundown_items...");
    await sql`
      ALTER TABLE rundown_items ADD COLUMN IF NOT EXISTS target_pics TEXT;
    `;
    console.log("target_pics column added successfully.");

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
