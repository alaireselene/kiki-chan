import { Message } from 'discord.js'
import {
    addInteraction,
    getOrCreateUserProfile,
    getUserInteractionHistory,
    updateUserCharisma,
    updateUserVibe,
} from '../db/utils.js'
import {
    cleanMessageContent,
    createVote,
    getAIResponse,
    reactToMessage,
} from '../utils/ai.js'

export async function handleMessage(
  message: Message,
  botUserId: string,
): Promise<void> {
    // Don't respond to own messages (prevent Kiki from replying to herself)
    if (message.author.id === botUserId) {
        return
    }

    // Determine interaction type and if we should consider responding
    const isMentioned = message.mentions.has(botUserId)
    const containsKiki = message.content.toLowerCase().includes('kiki')
    const isDM = message.guild === null

    // Exit early only if none of these conditions are met
    if (!isMentioned && !containsKiki && !isDM && !message.reference) {
        console.log(`🚫 Ignoring message from ${message.author.username}: no trigger conditions met`)
        return
    }

    // Get interaction type
    let interactionType: 'mention' | 'reply' | 'dm' | 'kiki_name'
    if (isDM) interactionType = 'dm'
    else if (isMentioned) interactionType = 'mention'
    else if (containsKiki) interactionType = 'kiki_name'
    else if (message.reference) interactionType = 'reply'
    else interactionType = 'kiki_name'

    console.log(`📥 Processing ${interactionType} from ${message.author.username}: "${message.content}"`)

    try {
        // Get or create user profile
        const userProfile = await getOrCreateUserProfile(message.author.id, message.author.username)
        console.log(`👤 User profile: ${userProfile.username} (Charisma: ${userProfile.charisma}, Vibe: ${userProfile.vibe}, Total: ${userProfile.totalMessages})`)

        // Clean the message content
        const cleanContent = cleanMessageContent(message.content, isMentioned)

        // Show typing indicator - the AI will decide whether to respond or not
        if ('sendTyping' in message.channel) {
            await message.channel.sendTyping()
        }

        if (!cleanContent) {
            const response = 'Hewwo~! (✿◠‿◠) How can Kiki-chan help you today? 💖'
            await message.reply(response)
            await addInteraction(
                message.author.id,
                cleanContent,
                response,
                interactionType,
            )
            return
        }

        // Get user's conversation history
        const userHistory = await getUserInteractionHistory(message.author.id, 5)

        // Get recent channel context (last 8 messages)
        const channelMessages = await message.channel.messages.fetch({ limit: 8 })
        const channelContext = Array.from(channelMessages.values())
            .reverse()
            .map((msg) => ({
                role: msg.author.id === botUserId ? 'assistant' : 'user',
                content: `${msg.author.username}: ${msg.content}`,
            }))

        // Build conversation context combining user history and channel context
        const conversationContext = [
            // Add user's personal history with Kiki
            ...userHistory
                .reverse()
                .map((interaction) => [
                    { role: 'user', content: interaction.userMessage },
                    ...(interaction.botResponse
                        ? [{ role: 'assistant', content: interaction.botResponse }]
                        : []),
                ])
                .flat(),
            // Add recent channel context
            ...channelContext,
        ]

        // Get AI response with personalized context and user profile
        console.log(`🤖 Sending to AI: "${cleanContent}"`)
        const aiResponse = await getAIResponse(cleanContent, conversationContext, {
            username: userProfile.username,
            charisma: userProfile.charisma,
            vibe: userProfile.vibe || 'neutral',
            totalMessages: userProfile.totalMessages
        })

        console.log(`🧠 AI Response Analysis:`)
        console.log(`   Full Raw Response: "${aiResponse.text}"`)
        console.log(`   Charisma Change: ${aiResponse.charismaChange || 'none'}`)
        console.log(`   New Vibe: ${aiResponse.newVibe || 'none'}`)
        console.log(`   Reaction: ${aiResponse.reaction || 'none'}`)
        console.log(`   Vote: ${aiResponse.vote ? 'yes' : 'none'}`)

        // Check if AI decided not to respond (silent treatment)
        if (!aiResponse.text?.trim() && !aiResponse.vote && !aiResponse.reaction) {
            console.log(
                `🤐 Kiki-chan gives ${message.author.username} the silent treatment (charisma: ${userProfile.charisma})`,
            )

            // Still apply charisma changes even if not responding
            if (aiResponse.charismaChange !== undefined) {
                await updateUserCharisma(message.author.id, aiResponse.charismaChange)
                console.log(
                    `🧠 ${message.author.username}: Silent charisma change (${aiResponse.charismaChange > 0 ? '+' : ''}${aiResponse.charismaChange})`,
                )
            }

            // Log ignored interaction
            await addInteraction(
                message.author.id,
                cleanContent,
                null,
                interactionType,
            )

            // Remove typing indicator by doing nothing (it will disappear naturally)
            return
        }

        // Send initial "thinking" message only if we're going to respond
        let finalProfile = userProfile
        if (aiResponse.charismaChange !== undefined) {
            const aiUpdatedProfile = await updateUserCharisma(message.author.id, aiResponse.charismaChange)
            if (aiUpdatedProfile) {
                finalProfile = aiUpdatedProfile
                console.log(
                    `📊 ${message.author.username}: Charisma ${userProfile.charisma} → ${finalProfile.charisma} (${aiResponse.charismaChange > 0 ? '+' : ''}${aiResponse.charismaChange})`,
                )
            }
        } else {
            console.log(`📊 ${message.author.username}: No charisma change applied`)
        }

        // Update vibe if AI determined a change
        if (aiResponse.newVibe) {
            const newVibeProfile = await updateUserVibe(message.author.id, aiResponse.newVibe)
            if (newVibeProfile) {
                finalProfile = newVibeProfile
                console.log(`🎭 ${message.author.username}: Vibe changed from "${userProfile.vibe}" to "${aiResponse.newVibe}"`)
            }
        }

    // Handle special commands first
    if (aiResponse.vote) {
      await createVote(
        message,
        aiResponse.vote.question,
        aiResponse.vote.options,
      )

        // Add interaction record for vote creation
        await addInteraction(
            message.author.id,
            cleanContent,
            `Created vote: ${aiResponse.vote.question}`,
            interactionType, // Use the existing interaction type
        )

        console.log(`🗳️ Created vote and recorded interaction for ${message.author.username}`)
        return // Skip text response when creating a vote
    }

    if (aiResponse.reaction) {
      await reactToMessage(message, aiResponse.reaction)
    }

        // Prepare the final response
        let finalResponse = aiResponse.text
        console.log(`💬 Preparing response: "${finalResponse?.substring(0, 100)}${finalResponse && finalResponse.length > 100 ? '...' : ''}"`)

        // Add personality based on user's vibe and charisma (using final profile after AI changes)
        if (finalProfile.charisma >= 80) {
            finalResponse = `${finalResponse} 💖` // High charisma gets hearts
            console.log(`💖 Added heart emoji for high charisma (${finalProfile.charisma})`)
        } else if (finalProfile.charisma <= 20) {
            // Low charisma gets shorter, less enthusiastic responses
            finalResponse = finalResponse.split('.')[0] || finalResponse
            console.log(`😑 Shortened response for low charisma (${finalProfile.charisma})`)
        }

        // Send the actual response without editing a thinking message
        if (finalResponse && finalResponse.trim()) {
            const maxLength = 2000
            if (finalResponse.length <= maxLength) {
                await message.reply(finalResponse)
            } else {
                // Split the message into chunks
                const chunks = []
                for (let i = 0; i < finalResponse.length; i += maxLength) {
                    chunks.push(finalResponse.slice(i, i + maxLength))
                }

                // Send each chunk as a separate message
                for (const chunk of chunks) {
                    if ('send' in message.channel && chunk) {
                        await message.channel.send(chunk)
                    }
                }
            }

            // Log successful interaction
            await addInteraction(
                message.author.id,
                cleanContent,
                finalResponse,
                interactionType,
            )
    } else if (!aiResponse.vote && !aiResponse.reaction) {
            // If no text and no special commands, provide a fallback
            const fallback =
                'Kiki-chan is a bit confused... Could you ask in a different way? (｡•́︿•̀｡)💭'
            await message.reply(fallback)
            await addInteraction(
                message.author.id,
                cleanContent,
                fallback,
                interactionType,
            )
    } else if (aiResponse.vote || aiResponse.reaction) {
            // If only special commands, show a cute message
            const specialResponse = 'Kiki-chan did something special for you! (｡♥‿♥｡)'
            await message.reply(specialResponse)
            await addInteraction(
                message.author.id,
                cleanContent,
                specialResponse,
                interactionType,
            )
    }
  } catch (error) {
    console.error('❌ Error handling message:', error)
    await message.reply(
      'UwU~! Kiki-chan ran into a little hiccup while thinking... Please try again in a bit! (｡•́︿•̀｡)💦',
    )
  }
}
