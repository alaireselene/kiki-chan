import { ActivityType, Client, GatewayIntentBits, Guild } from 'discord.js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { handleMessage } from './handlers/messageHandler.js'
import { initializeOpenAI } from './utils/ai.js'

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

// Simple Gateway bot for presence and message handling
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    // Add more intents if you want to handle other events
  ],
})

client.once('ready', () => {
  console.log(`✅ ${client.user?.tag} is now online!`)

  // Set bot status/activity
  client.user?.setActivity('with Cloudflare Workers', {
    type: ActivityType.Playing, // or ActivityType.Watching, ActivityType.Listening, etc.
  })
})

// Handle messages and respond with OpenAI
client.on('messageCreate', async (message) => {
  await handleMessage(message, client.user?.id ?? '')
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
