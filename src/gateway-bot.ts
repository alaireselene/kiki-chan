import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Guild,
  Message,
} from 'discord.js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { initializeDatabase } from './db/index.js'
import { handleMessage } from './handlers/messageHandler.js'
import { handleVoteSelection, initializeOpenAI } from './utils/ai.js'

// Message queue system to prevent API rate limiting
interface QueuedMessage {
  message: Message
  botUserId: string
  timestamp: number
}

class MessageQueue {
  private queue: QueuedMessage[] = []
  private processing = false
  private processedMessageIds = new Set<string>() // Track processed messages
  private readonly maxQueueSize = 50
  private readonly processDelay = 1000 // 1 second between messages

  async add(message: Message, botUserId: string) {
    // Prevent duplicate messages
    if (this.processedMessageIds.has(message.id)) {
      console.log(
        `⚠️ Skipping duplicate message ${message.id} from ${message.author.username}`,
      )
      return
    }

    // Prevent queue overflow
    if (this.queue.length >= this.maxQueueSize) {
      console.warn(
        `⚠️ Message queue full, dropping message from ${message.author.username}`,
      )
      return
    }

    // Check if message is already in queue
    const alreadyQueued = this.queue.some((qm) => qm.message.id === message.id)
    if (alreadyQueued) {
      console.log(`⚠️ Message ${message.id} already queued, skipping duplicate`)
      return
    }

    this.queue.push({
      message,
      botUserId,
      timestamp: Date.now(),
    })

    console.log(
      `📬 Queued message from ${message.author.username}. Queue size: ${this.queue.length}`,
    )

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue()
    }
  }

  private async processQueue() {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const queuedMessage = this.queue.shift()
      if (!queuedMessage) break

      try {
        // Mark as processed before processing
        this.processedMessageIds.add(queuedMessage.message.id)

        console.log(
          `🔄 Processing queued message ${queuedMessage.message.id} from ${queuedMessage.message.author.username}`,
        )
        await handleMessage(queuedMessage.message, queuedMessage.botUserId)
        console.log(
          `✅ Completed processing message from ${queuedMessage.message.author.username}`,
        )
      } catch (error) {
        console.error(
          `❌ Error processing queued message from ${queuedMessage.message.author.username}:`,
          error,
        )
      }

      // Add delay between processing messages to avoid rate limits
      if (this.queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.processDelay))
      }
    }

    this.processing = false
    console.log(`📭 Message queue processing completed`)

    // Clean up old processed message IDs (keep last 1000)
    if (this.processedMessageIds.size > 1000) {
      const idsArray = Array.from(this.processedMessageIds)
      this.processedMessageIds = new Set(idsArray.slice(-500)) // Keep last 500
      console.log(`🧹 Cleaned up old processed message IDs`)
    }
  }

  getQueueSize(): number {
    return this.queue.length
  }

  isProcessing(): boolean {
    return this.processing
  }
}

const messageQueue = new MessageQueue()

// Track processed interactions to prevent duplicates
const processedInteractions = new Set<string>()

// Clean up old interaction IDs periodically
setInterval(() => {
  if (processedInteractions.size > 1000) {
    processedInteractions.clear()
    console.log('🧹 Cleaned up old processed interaction IDs')
  }
}, 300000) // Every 5 minutes

// Load environment variables from multiple sources
function loadEnvironment() {
  // Try to load .env file first (production)
  try {
    const envPath = join(process.cwd(), '.env')
    const content = readFileSync(envPath, 'utf-8')

    content.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes
        if (key && value !== undefined) {
          process.env[key.trim()] = value
        }
      }
    })
    console.log('✅ Loaded environment from .env file')
  } catch {
    console.log('ℹ️  No .env file found, trying .dev.vars...')

    // Fallback to .dev.vars (development)
    try {
      const devVarsPath = join(process.cwd(), '.dev.vars')
      const content = readFileSync(devVarsPath, 'utf-8')

      content.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          // Parse YAML-style format: KEY: "value"
          const match = trimmed.match(/^([^:]+):\s*"([^"]*)"$/)
          if (match && match[1] && match[2] !== undefined) {
            const key = match[1].trim()
            const value = match[2]
            process.env[key] = value
          }
        }
      })
      console.log('✅ Loaded environment from .dev.vars file')
    } catch {
      console.warn(
        '⚠️  Could not load environment files. Using system environment variables only.',
      )
    }
  }
}

// Load environment variables
loadEnvironment()

// Validate required environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'OPENAI_API_KEY']
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

if (missingVars.length > 0) {
  console.error(
    `❌ Missing required environment variables: ${missingVars.join(', ')}`,
  )
  process.exit(1)
}

// Initialize OpenAI client
initializeOpenAI(process.env.OPENAI_API_KEY!)

// Initialize database
initializeDatabase().catch((error) => {
  console.error('❌ Failed to initialize database:', error)
  process.exit(1)
})

// Simple Gateway bot for presence and message handling
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
})

client.once('ready', () => {
  console.log(`✅ ${client.user?.tag} is now online!`)

  // Set bot status/activity
  client.user?.setActivity('with Cloudflare Workers', {
    type: ActivityType.Playing, // or ActivityType.Watching, ActivityType.Listening, etc.
  })

  // Log queue status every 30 seconds
  setInterval(() => {
    const queueSize = messageQueue.getQueueSize()
    const isProcessing = messageQueue.isProcessing()

    if (queueSize > 0 || isProcessing) {
      console.log(
        `📊 Queue Status: ${queueSize} messages waiting, processing: ${isProcessing}`,
      )
    }
  }, 30000)
})

// Handle messages and respond with OpenAI
client.on('messageCreate', async (message) => {
  await messageQueue.add(message, client.user?.id ?? '')
})

// Handle message edits (important for bots like Kimi that edit their messages)
client.on('messageUpdate', async (oldMessage, newMessage) => {
  console.log(
    `📝 Message edit detected from ${newMessage.author?.username}: "${oldMessage.content}" → "${newMessage.content}"`,
  )

  // Only handle bot message edits that mention kiki
  if (!newMessage.author?.bot) {
    console.log(`📝 Skipping edit - not from bot`)
    return
  }

  // Skip if the content hasn't actually changed (Discord sometimes fires this event unnecessarily)
  if (oldMessage.content === newMessage.content) {
    console.log(`📝 Skipping edit - content unchanged`)
    return
  }

  // Skip if the old message already contained "kiki" (we already processed it)
  if (oldMessage.content && oldMessage.content.toLowerCase().includes('kiki')) {
    console.log(`📝 Skipping edit - old message already contained "kiki"`)
    return
  }

  // Only process if the NEW message contains "kiki" (this is the final edited version)
  if (
    !newMessage.content ||
    !newMessage.content.toLowerCase().includes('kiki')
  ) {
    console.log(`📝 Skipping edit - new message doesn't contain "kiki"`)
    return
  }

  console.log(
    `✏️ Bot ${newMessage.author.username} edited message to include "kiki": "${newMessage.content}"`,
  )

  // Process the edited message through the queue
  await messageQueue.add(newMessage, client.user?.id ?? '')
})

// Handle select menu interactions for vote monitoring
client.on('interactionCreate', async (interaction) => {
  // Only handle StringSelectMenu interactions
  if (!interaction.isStringSelectMenu()) {
    return
  }

  const interactionId = `${interaction.id}-${interaction.user.id}`

  // Prevent duplicate processing
  if (processedInteractions.has(interactionId)) {
    console.log(
      `⚠️ Skipping duplicate interaction ${interactionId} from ${interaction.user.username}`,
    )
    return
  }

  // Mark as processed immediately
  processedInteractions.add(interactionId)

  console.log(
    `🔄 Processing StringSelectMenu from ${interaction.user.username}:`,
  )
  console.log(`   - Custom ID: ${interaction.customId}`)
  console.log(`   - Values: ${JSON.stringify(interaction.values)}`)

  // CRITICAL: Acknowledge immediately with timeout protection
  const ackPromise = interaction.reply({
    content: 'got ur vote babe! lemme process this real quick ✨',
    ephemeral: true,
  })

  // Race against timeout to ensure we ack within 3 seconds
  const timeoutPromise = new Promise(
    (_, reject) =>
      setTimeout(() => reject(new Error('Acknowledgment timeout')), 2500), // 2.5s to be safe
  )

  try {
    const startTime = Date.now()
    await Promise.race([ackPromise, timeoutPromise])
    const endTime = Date.now()
    console.log(`✅ Acknowledged interaction in ${endTime - startTime}ms`)
  } catch (ackError) {
    console.error(
      '❌ CRITICAL: Failed to acknowledge interaction within timeout:',
      ackError,
    )
    // Remove from processed set so it can be retried if Discord resends
    processedInteractions.delete(interactionId)
    return
  }

  // Process vote in background (non-blocking)
  setImmediate(async () => {
    try {
      console.log('🔄 Starting vote processing...')
      await handleVoteSelection(interaction, client.user?.id ?? '')
      console.log('✅ Vote processing completed')
    } catch (error) {
      console.error('❌ Error during vote processing:', error)

      try {
        // Check if we can still send followUp
        if (!interaction.replied && !interaction.deferred) {
          console.log(
            '⚠️ Interaction not replied/deferred, cannot send followUp',
          )
        } else {
          await interaction.followUp({
            content:
              '❌ oops something went wrong with ur vote babe, try again?',
            ephemeral: true,
          })
        }
      } catch (followUpError) {
        console.error('❌ Even followUp failed:', followUpError)
      }
    }
  })
})

// Add error handling for client events
client.on('error', (error) => {
  console.error('❌ Discord client error:', error)
})

client.on('warn', (warning) => {
  console.warn('⚠️ Discord client warning:', warning)
})

client.on('disconnect', () => {
  console.log('🔌 Discord client disconnected')
})

client.on('reconnecting', () => {
  console.log('🔄 Discord client reconnecting...')
})

// Optional: Handle some basic events
client.on('guildCreate', (guild: Guild) => {
  console.log(`📥 Joined guild: ${guild.name} (${guild.id})`)
})

client.on('guildDelete', (guild: Guild) => {
  console.log(`📤 Left guild: ${guild.name} (${guild.id})`)
})

// Log in with your bot token
const token = process.env.DISCORD_TOKEN
if (!token) {
  console.error('❌ DISCORD_TOKEN environment variable is required')
  process.exit(1)
}

console.log('🔑 Attempting to login to Discord...')
client.login(token).catch((error) => {
  console.error('❌ Failed to login to Discord:', error)
  process.exit(1)
})

// Graceful shutdown handlers
const gracefulShutdown = () => {
  console.log('👋 Shutting down gracefully...')
  client.destroy()
  process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)
  gracefulShutdown()
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown()
})
