import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// User profiles table for tracking charisma and vibe
export const userProfiles = sqliteTable('user_profiles', {
  userId: text('user_id').primaryKey(),
  username: text('username').notNull(),
  charisma: integer('charisma').default(50).notNull(), // 0-100, starts at 50
  vibe: text('vibe').default('neutral'), // nerd/flirty/stupid/neutral/wholesome/etc
  totalMessages: integer('total_messages').default(0).notNull(),
  lastInteraction: integer('last_interaction', { mode: 'timestamp' }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

// Conversation context for better contextual awareness
// Only stores user's latest 5 interactions with Kiki (not all messages)
export const conversationContext = sqliteTable('conversation_context', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  userMessage: text('user_message').notNull(), // What user said to Kiki
  botResponse: text('bot_response'), // How Kiki responded (null if ignored)
  interactionType: text('interaction_type').notNull(), // 'mention', 'reply', 'dm', 'kiki_name'
  timestamp: integer('timestamp', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export type UserProfile = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert
export type ConversationContext = typeof conversationContext.$inferSelect
export type NewConversationContext = typeof conversationContext.$inferInsert
