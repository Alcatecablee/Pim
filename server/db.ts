import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";

// Use DATABASE_URL from Replit secrets (Supabase connection string)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Please add your Supabase DATABASE_URL to Replit secrets.",
  );
}

// Safely extract and log only the host portion without exposing credentials
try {
  const url = new URL(connectionString.replace('postgresql://', 'http://'));
  console.log(`[DB] Connecting to Supabase database: ${url.hostname}:${url.port}`);
} catch (e) {
  console.log(`[DB] Connecting to Supabase database...`);
}

export const pool = new Pool({ 
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected Supabase database error:", err);
});

export const db = drizzle(pool, { schema });
