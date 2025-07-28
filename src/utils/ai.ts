import { Message } from 'discord.js'
import { readFileSync } from 'fs'
import OpenAI from 'openai'
import { join } from 'path'

// Initialize OpenAI client
let openai: OpenAI

export function initializeOpenAI(apiKey: string) {
  openai = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.moonshot.cn/v1', // Use Moonshot API base URL
  })
}

// Load system prompt from file
function loadSystemPrompt(): string {
  try {
    const promptPath = join(process.cwd(), 'src/prompts/system.md')
    return readFileSync(promptPath, 'utf-8')
  } catch (error) {
    console.error('❌ Error loading system prompt:', error)
    return 'You are Kiki-chan, a helpful Discord bot assistant. Be friendly, concise, and helpful.'
  }
}

// Parse AI response for special commands
interface AIResponse {
  text: string
  vote?: {
    question: string
    options: string[]
  }
  reaction?: string
}

function parseAIResponse(response: string): AIResponse {
  const lines = response.split('\n').map((line) => line.trim())
  const result: AIResponse = { text: response }

  // Check for CREATE_VOTE command
  const voteIndex = lines.findIndex((line) => line.startsWith('CREATE_VOTE:'))
  if (voteIndex !== -1) {
    const voteLine = lines[voteIndex]
    if (voteLine) {
      const question = voteLine.replace('CREATE_VOTE:', '').trim()
      const options: string[] = []

      for (let i = voteIndex + 1; i < lines.length; i++) {
        const line = lines[i]
        if (line && line.match(/^OPTION_\d+:/)) {
          options.push(line.replace(/^OPTION_\d+:/, '').trim())
        }
      }

      if (options.length >= 2) {
        result.vote = { question, options }
        // Remove vote commands from text
        result.text = lines
          .filter(
            (line) =>
              line &&
              !line.startsWith('CREATE_VOTE:') &&
              !line.match(/^OPTION_\d+:/),
          )
          .join('\n')
          .trim()
      }
    }
  }

  // Check for REACT command
  const reactIndex = lines.findIndex((line) => line.startsWith('REACT:'))
  if (reactIndex !== -1) {
    const reactLine = lines[reactIndex]
    if (reactLine) {
      result.reaction = reactLine.replace('REACT:', '').trim()
      // Remove react command from text
      result.text = lines
        .filter((line) => line && !line.startsWith('REACT:'))
        .join('\n')
        .trim()
    }
  }

  return result
}

// Create a poll/vote
export async function createVote(
  message: Message,
  question: string,
  options: string[],
): Promise<void> {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']

  let pollText = `📊 **${question}**\n\n`
  options.forEach((option, index) => {
    pollText += `${emojis[index]} ${option}\n`
  })

  if ('send' in message.channel) {
    const pollMessage = await message.channel.send(pollText)

    // Add reactions for voting
    for (let i = 0; i < options.length && i < emojis.length; i++) {
      const emoji = emojis[i]
      if (emoji) {
        await pollMessage.react(emoji)
      }
    }
  }
}

// React to a message
export async function reactToMessage(
  message: Message,
  emoji: string,
): Promise<void> {
  try {
    await message.react(emoji)
  } catch (error) {
    console.error(`❌ Error reacting with ${emoji}:`, error)
    // Fallback to some common emojis if custom emoji fails
    const fallbackEmojis: Record<string, string> = {
      thumbs_up: '👍',
      thumbs_down: '👎',
      heart: '❤️',
      thinking: '🤔',
      laugh: '😂',
      cry: '😢',
      angry: '😠',
      surprise: '😲',
    }

    const fallback = fallbackEmojis[emoji.toLowerCase()]
    if (fallback) {
      await message.react(fallback)
    }
  }
}

// Get AI response
export async function getAIResponse(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
): Promise<AIResponse> {
  const systemPrompt = loadSystemPrompt()

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ]

  const completion = await openai.chat.completions.create({
    model: 'kimi-k2-0711-preview',
    messages: messages as any,
    max_tokens: 8192,
    temperature: 0.7,
    top_p: 1,
    stream: false,
  })

  const response = completion.choices[0]?.message?.content || ''
  return parseAIResponse(response)
}

// Check if message should trigger bot response
export function shouldRespond(message: Message, botUserId: string): boolean {
  // Don't respond to bots
  if (message.author.bot) return false

  // Always respond to DMs
  if (message.guild === null) return true

  // Check if bot is mentioned
  if (message.mentions.has(botUserId)) return true

  // Check if message contains "kiki" (case insensitive)
  if (message.content.toLowerCase().includes('kiki')) return true

  // Check if this is a reply to the bot's message
  if (message.reference?.messageId) {
    // We'll need to fetch the referenced message to check if it's from the bot
    return true // For now, assume it might be a reply to bot
  }

  return false
}

// Clean message content (remove mentions, etc.)
export function cleanMessageContent(
  content: string,
  isMentioned: boolean,
): string {
  let cleaned = content

  if (isMentioned) {
    cleaned = cleaned.replace(/<@!?\d+>/g, '').trim()
  }

  return cleaned
}
