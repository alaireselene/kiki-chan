import { Message } from 'discord.js';
import {
    cleanMessageContent,
    createVote,
    getAIResponse,
    reactToMessage,
    shouldRespond,
} from '../utils/ai.js';

// Store conversation history (in production, you might want to use a database)
const conversationHistory = new Map<
  string,
  Array<{ role: string; content: string }>
>()

export async function handleMessage(
  message: Message,
  botUserId: string,
): Promise<void> {
  // Check if we should respond to this message
  if (!shouldRespond(message, botUserId)) return

  // Check if this is a reply to the bot
  let isReplyToBot = false
  if (message.reference?.messageId) {
    try {
      const referencedMessage = await message.channel.messages.fetch(
        message.reference.messageId,
      )
      isReplyToBot = referencedMessage.author.id === botUserId
    } catch (error) {
      console.error('Error fetching referenced message:', error)
    }
  }

  // Final check: only respond if mentioned, contains "kiki", is DM, or is reply to bot
  const isMentioned = message.mentions.has(botUserId)
  const containsKiki = message.content.toLowerCase().includes('kiki')
  const isDM = message.guild === null

  if (!isMentioned && !containsKiki && !isDM && !isReplyToBot) return

  try {
    // Show typing indicator
    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping()
    }

    // Clean the message content
    let cleanContent = cleanMessageContent(message.content, isMentioned)

    if (!cleanContent) {
      await message.reply('Hewwo~! (✿◠‿◠) How can Kiki-chan help you today? 💖')
      return
    }

    // Send initial "thinking" message
    const thinkingMessage = await message.reply('🤔 hmmm let me see...')

    // Get conversation history for this user/channel
    const contextKey = message.guild
      ? `${message.guild.id}-${message.channel.id}`
      : `dm-${message.author.id}`
    let history = conversationHistory.get(contextKey) || []

    // Limit history to last 10 messages to avoid token limits
    if (history.length > 10) {
      history = history.slice(-10)
    }

    // Get AI response
    const aiResponse = await getAIResponse(cleanContent, history)

    // Update conversation history
    history.push({ role: 'user', content: cleanContent })
    if (aiResponse.text) {
      history.push({ role: 'assistant', content: aiResponse.text })
    }
    conversationHistory.set(contextKey, history)

    // Handle special commands first
    if (aiResponse.vote) {
      await createVote(
        message,
        aiResponse.vote.question,
        aiResponse.vote.options,
      )
    }

    if (aiResponse.reaction) {
      await reactToMessage(message, aiResponse.reaction)
    }

    // Edit the thinking message with the actual response
    if (aiResponse.text && aiResponse.text.trim()) {
      // Split long messages if needed (Discord has 2000 char limit)
      const maxLength = 2000
      if (aiResponse.text.length <= maxLength) {
        await thinkingMessage.edit(aiResponse.text)
      } else {
        // Split the message into chunks
        const chunks = []
        for (let i = 0; i < aiResponse.text.length; i += maxLength) {
          chunks.push(aiResponse.text.slice(i, i + maxLength))
        }

        // Edit the first message
        if (chunks[0]) {
          await thinkingMessage.edit(chunks[0])
        }

        // Send additional chunks
        for (let i = 1; i < chunks.length; i++) {
          const chunk = chunks[i]
          if ('send' in message.channel && chunk) {
            await message.channel.send(chunk)
          }
        }
      }
    } else if (!aiResponse.vote && !aiResponse.reaction) {
      // If no text and no special commands, provide a fallback
      await thinkingMessage.edit(
        'Kiki-chan is a bit confused... Could you ask in a different way? (｡•́︿•̀｡)💭',
      )
    } else if (aiResponse.vote || aiResponse.reaction) {
      // If only special commands, delete the thinking message with a kawaii touch
      await thinkingMessage.edit(
        'Kiki-chan did something special for you! (｡♥‿♥｡)',
      )
      setTimeout(
        () =>
          thinkingMessage.delete().catch(() => {
            // Ignore errors when deleting the message (e.g., already deleted)
          }),
        1500,
      )
      // If only special commands, delete the thinking message
      await thinkingMessage.delete()
    }
  } catch (error) {
    console.error('❌ Error handling message:', error)
    await message.reply(
      'UwU~! Kiki-chan ran into a little hiccup while thinking... Please try again in a bit! (｡•́︿•̀｡)💦',
    )
  }
}
