import {
    ActionRowBuilder,
    Message,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js'
import { readFileSync } from 'fs'
import OpenAI from 'openai'
import { join } from 'path'

// Initialize OpenAI client
let openai: OpenAI

export function initializeOpenAI(apiKey: string) {
  openai = new OpenAI({
    apiKey: apiKey,
      baseURL: 'https://api.moonshot.ai/v1', // Use Moonshot API base URL
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
    charismaChange?: number
    newVibe?: string
}

function parseAIResponse(response: string): AIResponse {
    console.log('🔍 Parsing AI response...')
  const lines = response.split('\n').map((line) => line.trim())
  const result: AIResponse = { text: response }

    // Extract analysis section
    let actualResponseStart = 0
    let inAnalysis = false

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (line?.startsWith('**ANALYSIS:**')) {
            inAnalysis = true
            console.log('🔍 Found analysis section')
            actualResponseStart = i + 1
            continue
        }

        // Parse CHARISMA command - MUST be in **CHARISMA:** format
        if (line?.startsWith('**CHARISMA:**')) {
            console.log(`🔍 Found charisma line: "${line}"`)
            const charismaMatch = line.match(/\*\*CHARISMA:\*\*\s*([+-]?\d+)/)
            if (charismaMatch && charismaMatch[1]) {
                const charismaChange = parseInt(charismaMatch[1])
                if (!isNaN(charismaChange)) {
                    result.charismaChange = charismaChange
                    console.log(`🔍 Found charisma change: ${charismaChange}`)
                }
            }
            actualResponseStart = Math.max(actualResponseStart, i + 1)
            continue
        }

        // Parse VIBE command - MUST be in **VIBE:** format
        if (line?.startsWith('**VIBE:**')) {
            console.log(`🔍 Found vibe line: "${line}"`)
            const vibeMatch = line.match(/\*\*VIBE:\*\*\s*(\w+)/)
            if (vibeMatch && vibeMatch[1]) {
                result.newVibe = vibeMatch[1]
                console.log(`🔍 Found vibe change: ${vibeMatch[1]}`)
            }
            actualResponseStart = Math.max(actualResponseStart, i + 1)
            continue
        }

        // Parse REACT command - MUST be in **REACT:** format
        if (line?.startsWith('**REACT:**')) {
            console.log(`🔍 Found react line: "${line}"`)
            const reactMatch = line.match(/\*\*REACT:\*\*\s*(\w+)/)
            if (reactMatch && reactMatch[1]) {
                result.reaction = reactMatch[1]
                console.log(`🔍 Found reaction: ${reactMatch[1]}`)
            }
            actualResponseStart = Math.max(actualResponseStart, i + 1)
            continue
        }

        // Parse CREATE_VOTE command - MUST be in **CREATE_VOTE:** format
        if (line?.startsWith('**CREATE_VOTE:**')) {
            console.log(`🔍 Found vote line: "${line}"`)
            const voteMatch = line.match(/\*\*CREATE_VOTE:\*\*\s*(.+)/)
            if (voteMatch && voteMatch[1]) {
                const question = voteMatch[1]
                const options: string[] = []

                // Look for OPTION_X: lines after CREATE_VOTE
                for (let j = i + 1; j < lines.length; j++) {
                    const optionLine = lines[j]
                    const optionMatch = optionLine?.match(/^OPTION_\d+:\s*(.+)/)
                    if (optionMatch && optionMatch[1]) {
                        options.push(optionMatch[1])
                        console.log(`🔍 Found option: "${optionMatch[1]}"`)
                    } else if (optionLine && !optionLine.startsWith('OPTION_')) {
                        break // Stop looking for options
                    }
                }

              if (options.length >= 2) {
                  result.vote = { question, options }
                    console.log(
                        `🔍 Found vote with ${options.length} options: "${question}"`,
                    )
                }
            }
            actualResponseStart = Math.max(actualResponseStart, i + 1)
            continue
        }

        // Skip analysis lines and command lines
        if (
            inAnalysis &&
            (line?.startsWith('-') ||
                line?.startsWith('**') ||
                line === '' ||
                line?.includes('Message Quality:') ||
                line?.includes('Reason:') ||
                line?.includes('Base Charisma Change:') ||
                line?.includes('Applied Formula:') ||
                line?.includes('Final Charisma Change:') ||
                line?.includes('Current User State:') ||
                line?.includes('Chosen Action:'))
        ) {
            actualResponseStart = Math.max(actualResponseStart, i + 1)
            continue
        }

        // If we hit actual response content after commands, stop processing
        if (
            line &&
            !line.startsWith('**CHARISMA:**') &&
            !line.startsWith('**VIBE:**') &&
            !line.startsWith('**REACT:**') &&
            !line.startsWith('**CREATE_VOTE:**') &&
            !line.match(/^OPTION_\d+:/) &&
            !line.startsWith('-') &&
            !line.startsWith('**')
        ) {
            break
        }
    }

    // Extract the actual response text (skip analysis and commands)
    const responseText = lines
        .slice(actualResponseStart)
        .filter(
            (line) =>
                line &&
                !line.startsWith('**CHARISMA:**') &&
                !line.startsWith('**VIBE:**') &&
                !line.startsWith('**REACT:**') &&
                !line.startsWith('**CREATE_VOTE:**') &&
                !line.match(/^OPTION_\d+:/),
        )
        .join('\n')
        .trim()

    // Clean up any remaining username prefixes that the AI might include
    let cleanedText = responseText || 'yo whats good 🌟'

    // Remove "kiki-chan:" or "kiki:" prefixes (case insensitive)
    cleanedText = cleanedText.replace(/^kiki(-chan)?:\s*/i, '').trim()

    // Remove any other potential username patterns at the start
    cleanedText = cleanedText.replace(/^[a-zA-Z0-9_-]+:\s*/, '').trim()

    result.text = cleanedText || 'yo whats good 🌟'

    console.log(`🔍 Parsing result:`, {
        hasText: !!result.text,
        textLength: result.text.length,
        charismaChange: result.charismaChange,
        newVibe: result.newVibe,
        reaction: result.reaction,
        hasVote: !!result.vote,
        voteOptions: result.vote?.options.length || 0,
    })

    return result
} // Vote monitoring system
interface ActiveVote {
    pollMessage: Message
    question: string
    options: string[]
    originalMessage: Message
    selectMenuId: string
}

const activeVotes = new Map<string, ActiveVote>()

// Monitor vote selections and respond when choices are made
export function monitorVote(
    pollMessage: Message,
    question: string,
    options: string[],
    originalMessage: Message,
) {
    const selectMenuId = `vote_${pollMessage.id}`
    const voteData: ActiveVote = {
        pollMessage,
        question,
        options,
        originalMessage,
        selectMenuId,
    }

    activeVotes.set(pollMessage.id, voteData)
    console.log(
        `📊 Monitoring vote: "${question}" with ${options.length} options`,
    )
}

// Handle vote selection - called from the main bot when a select menu interaction occurs
export async function handleVoteSelection(
    interaction: any,
    botUserId: string,
): Promise<void> {
    console.log(
        `🔄 Handling vote selection interaction from ${interaction.user?.username}`,
    )
    console.log(
        `🔄 Interaction type: ${interaction.type}, customId: ${interaction.customId}`,
    )
    console.log(`🔄 Is StringSelectMenu: ${interaction.isStringSelectMenu()}`)
    console.log(`🔄 Values: ${JSON.stringify(interaction.values)}`)

    // Don't respond to bot interactions
    if (interaction.user.bot) {
        console.log('⚠️ Ignoring bot interaction')
        return
    }

    // Check if this is a vote select menu first
    if (!interaction.customId.startsWith('vote_')) {
        console.log(`⚠️ Not a vote interaction, customId: ${interaction.customId}`)
        return
    }

    console.log(
        `🔍 Looking for vote data for message ID: ${interaction.message.id}`,
    )
    console.log(`🔍 Active votes: ${Array.from(activeVotes.keys()).join(', ')}`)

    const voteData = activeVotes.get(interaction.message.id)
    if (!voteData) {
        console.log('❌ Vote data not found!')
        try {
            await interaction.followUp({
                content: '❌ This vote is no longer active.',
                ephemeral: true,
            })
            console.log('✅ Sent inactive vote message')
        } catch (error) {
            console.error('❌ Error sending inactive vote message:', error)
        }
        return
    }

    console.log(`✅ Found vote data: "${voteData.question}"`)

    const selectedValue = interaction.values[0]
    const optionIndex = parseInt(selectedValue.replace('option_', ''))
    const selectedOption = voteData.options[optionIndex]
    const voterUsername =
        interaction.user.username || interaction.user.displayName || 'someone'

    console.log(
        `🗳️ ${voterUsername} voted for option ${optionIndex + 1}: "${selectedOption}"`,
    )

    // Simple acknowledgment without AI processing
    try {
        await interaction.followUp({
            content: `✨ ${voterUsername} voted for: **${selectedOption}**`,
            ephemeral: false
        })
        console.log(`📊 Acknowledged ${voterUsername}'s vote for "${selectedOption}"`)
    } catch (error) {
        console.error('❌ Error acknowledging vote:', error)
    }
}

// Clean up old votes (call this periodically)
export function cleanupOldVotes(maxAgeMinutes: number = 60) {
    const now = Date.now()
    const maxAge = maxAgeMinutes * 60 * 1000

    for (const [messageId, voteData] of activeVotes.entries()) {
        const messageAge = now - voteData.pollMessage.createdTimestamp
        if (messageAge > maxAge) {
            activeVotes.delete(messageId)
            console.log(`🧹 Cleaned up old vote: "${voteData.question}"`)
        }
    }
}

// Create a poll/vote with StringSelect menu
export async function createVote(
  message: Message,
  question: string,
  options: string[],
): Promise<Message | null> {
    // Create the select menu
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`vote_${Date.now()}`)
        .setPlaceholder('Choose your option...')
        .setMinValues(1)
        .setMaxValues(1)

    // Add options to the select menu
    options.forEach((option, index) => {
        selectMenu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(option)
                .setDescription(`Option ${index + 1}`)
                .setValue(`option_${index}`)
                .setEmoji(['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'][index] || '🔹'),
        )
    })

    // Create the action row with the select menu
    const actionRow =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)

    // Create the poll message
  let pollText = `📊 **${question}**\n\n`
  options.forEach((option, index) => {
      pollText += `${['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'][index] || '🔹'} ${option}\n`
  })
    pollText += '\n*Use the dropdown below to vote!*'

  if ('send' in message.channel) {
      const pollMessage = await message.channel.send({
          content: pollText,
          components: [actionRow],
      })

      // Start monitoring this vote
      monitorVote(pollMessage, question, options, message)

      return pollMessage
  }

    return null
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

// Get AI response with user context
export async function getAIResponse(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
    userProfile?: {
        username: string
        charisma: number
        vibe: string
        totalMessages: number
    },
    recentConversationSummary?: string,
): Promise<AIResponse> {
  const systemPrompt = loadSystemPrompt()

    // Add user context to system prompt if provided
    let enhancedSystemPrompt = systemPrompt
    if (userProfile) {
        enhancedSystemPrompt += `

## Current User Context:
- Username: ${userProfile.username}
- Current Charisma: ${userProfile.charisma}/100
- Current Vibe: ${userProfile.vibe}
- Total Messages to Kiki: ${userProfile.totalMessages}

## Charisma Management:
You can adjust the user's charisma based on their message quality and your interaction:
- Use CHARISMA: +X or CHARISMA: -X to change their charisma
- Consider current charisma level and total interactions in your calculation
- Formula suggestion: More interactions = smaller changes, extreme charisma = pull toward center
- Engaging/kind messages: +1 to +5, Boring messages: -1 to 0, Violating/rude: -3 to -10
- You can also change their vibe using VIBE: new_vibe_here

🚨 CRITICAL REMINDER: Never start your response with "kiki-chan:" or any username. You ARE kiki-chan, just speak directly!`
    }

    // Add recent conversation context if provided
    if (recentConversationSummary) {
        enhancedSystemPrompt += `

## Recent Channel Conversation Context:
${recentConversationSummary}

Note: This shows who said what recently in the channel. Use this to understand the conversation flow and respond appropriately to different people, but remember to never start your response with "kiki-chan:" or any username prefix.`
    }

  const messages = [
      { role: 'system', content: enhancedSystemPrompt },
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
    console.log('🤖 Raw AI Response:', response)

    const parsedResponse = parseAIResponse(response)
    console.log('📝 Parsed AI Response:', parsedResponse)

    return parsedResponse
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
