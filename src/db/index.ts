import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from './schema.js'

// Create database connection
const sqlite = new Database('kiki-chan.db')
export const db = drizzle({ client: sqlite, schema })

// Initialize database with migrations
export async function initializeDatabase() {
  try {
    // Run migrations
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('✅ Database initialized successfully')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}

export { schema }
