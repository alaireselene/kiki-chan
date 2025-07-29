import { and, desc, eq } from 'drizzle-orm'
import { db } from './index.js'
import {
    type ConversationContext,
    conversationContext,
    type NewConversationContext,
    type NewUserProfile,
    type UserProfile,
    userProfiles,
} from './schema.js'

// User Profile Management
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const result = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1)
  return result[0] || null
}

export async function createUserProfile(
  userId: string,
  username: string,
): Promise<UserProfile> {
  const newProfile: NewUserProfile = {
    userId,
    username,
    charisma: 50, // Start at neutral
    vibe: 'neutral',
    totalMessages: 0,
  }

  const result = await db.insert(userProfiles).values(newProfile).returning()
  return result[0]!
}

export async function updateUserCharisma(
  userId: string,
  charismaChange: number,
): Promise<UserProfile | null> {
  // Get current profile
  const profile = await getUserProfile(userId)
  if (!profile) return null

  // Calculate new charisma (clamp between 0-100)
  const newCharisma = Math.max(
    0,
    Math.min(100, profile.charisma + charismaChange),
  )

  const result = await db
    .update(userProfiles)
    .set({
      charisma: newCharisma,
      totalMessages: profile.totalMessages + 1,
      lastInteraction: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId))
    .returning()

  return result[0] || null
}

export async function updateUserVibe(
  userId: string,
  newVibe: string,
): Promise<UserProfile | null> {
  const result = await db
    .update(userProfiles)
    .set({
      vibe: newVibe,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId))
    .returning()

  return result[0] || null
}

// Conversation Context Management
export async function getUserInteractionHistory(
  userId: string,
  limit: number = 5,
): Promise<ConversationContext[]> {
  return await db
    .select()
    .from(conversationContext)
    .where(eq(conversationContext.userId, userId))
    .orderBy(desc(conversationContext.timestamp))
    .limit(limit)
}

export async function addInteraction(
  userId: string,
  userMessage: string,
  botResponse: string | null,
  interactionType: 'mention' | 'reply' | 'dm' | 'kiki_name',
): Promise<ConversationContext> {
  // First, ensure we only keep the latest 5 interactions per user
  const existingInteractions = await getUserInteractionHistory(userId, 5)

  // If we have 5 or more, delete the oldest ones
  if (existingInteractions.length >= 5) {
    const toDelete = existingInteractions.slice(4) // Keep only 4, so we can add 1 new
    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map((interaction) => interaction.id)
      await db
        .delete(conversationContext)
        .where(and(...idsToDelete.map((id) => eq(conversationContext.id, id))))
    }
  }

  // Add new interaction
  const newInteraction: NewConversationContext = {
    userId,
    userMessage,
    botResponse,
    interactionType,
  }

  const result = await db
    .insert(conversationContext)
    .values(newInteraction)
    .returning()
  return result[0]!
}

// Get or create user profile (helper function)
export async function getOrCreateUserProfile(
  userId: string,
  username: string,
): Promise<UserProfile> {
  let profile = await getUserProfile(userId)
  if (!profile) {
    profile = await createUserProfile(userId, username)
  } else if (profile.username !== username) {
    // Update username if it changed
    const result = await db
      .update(userProfiles)
      .set({ username, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning()
    profile = result[0] || profile
  }
  return profile
}
