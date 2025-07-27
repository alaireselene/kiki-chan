import { ActivityType, Client, GatewayIntentBits, Guild } from 'discord.js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .dev.vars
function loadDevVars() {
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
  } catch (error) {
    console.warn('⚠️  Could not load .dev.vars file:', (error as Error).message)
  }
}

// Load environment variables
loadDevVars()

// Simple Gateway bot for presence only
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
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

client.login(token).catch(console.error)

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('👋 Shutting down...')
  client.destroy()
  process.exit(0)
})
