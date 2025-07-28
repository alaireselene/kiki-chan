/**
 * The core server that runs on a Cloudflare worker.
 * Handles Discord slash commands only - optimized for speed and efficiency.
 */

import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from 'discord-interactions'
import { AutoRouter } from 'itty-router'
import { AWW_COMMAND, INVITE_COMMAND } from './commands.ts'
import { getCuteUrl } from './reddit.ts'

class JsonResponse extends Response {
  constructor(body: any, init?: ResponseInit) {
    const jsonBody = JSON.stringify(body)
    init = init || {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    }
    super(jsonBody, init)
  }
}

const router = AutoRouter()

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get('/', (request: Request, env: Env) => {
  return new Response(`👋 ${env.DISCORD_APPLICATION_ID}`)
})

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post('/', async (request: Request, env: Env) => {
  // Clone the request so we can read the body multiple times
  const clonedRequest = request.clone()
  const { isValid, interaction } = await server.verifyDiscordRequest(
    clonedRequest,
    env,
  )
  if (!isValid || !interaction) {
    return new Response('Bad request signature.', { status: 401 })
  }

  if (interaction.type === InteractionType.PING) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    })
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    // Most user commands will come as `APPLICATION_COMMAND`.
    switch (interaction.data.name.toLowerCase()) {
      case AWW_COMMAND.name.toLowerCase(): {
        const cuteUrl = await getCuteUrl()
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: cuteUrl,
          },
        })
      }
      case INVITE_COMMAND.name.toLowerCase(): {
        const applicationId = env.DISCORD_APPLICATION_ID
        const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${applicationId}&scope=applications.commands`
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: INVITE_URL,
            flags: InteractionResponseFlags.EPHEMERAL,
          },
        })
      }
      default:
        return new JsonResponse({ error: 'Unknown Type' }, { status: 400 })
    }
  }

  console.error('Unknown Type')
  return new JsonResponse({ error: 'Unknown Type' }, { status: 400 })
})
router.all('*', () => new Response('Not Found.', { status: 404 }))

async function verifyDiscordRequest(
  request: Request,
  env: Env,
): Promise<{ isValid: boolean; interaction?: any }> {
  const signature = request.headers.get('x-signature-ed25519')
  const timestamp = request.headers.get('x-signature-timestamp')
  const body = await request.text()

  // Debug logging
  console.log('=== Discord Request Verification ===')
  console.log(
    'Signature:',
    signature ? `present (${signature.substring(0, 10)}...)` : 'missing',
  )
  console.log('Timestamp:', timestamp ? `present (${timestamp})` : 'missing')
  console.log(
    'Public Key:',
    env.DISCORD_PUBLIC_KEY
      ? `present (${env.DISCORD_PUBLIC_KEY.substring(0, 10)}...)`
      : 'missing',
  )
  console.log('Body length:', body.length)
  console.log('Body preview:', body.substring(0, 100))

  if (!signature) {
    console.log('❌ Missing signature header')
    return { isValid: false }
  }

  if (!timestamp) {
    console.log('❌ Missing timestamp header')
    return { isValid: false }
  }

  if (!env.DISCORD_PUBLIC_KEY) {
    console.log('❌ Missing Discord public key in environment')
    return { isValid: false }
  }

  try {
    const isValidRequest = await verifyKey(
      body,
      signature,
      timestamp,
      env.DISCORD_PUBLIC_KEY,
    )
    console.log('Signature verification result:', isValidRequest)

    if (!isValidRequest) {
      console.log('❌ Signature verification failed')
      return { isValid: false }
    }

    console.log('✅ Request verification successful')
  } catch (error) {
    console.log('❌ Error during signature verification:', error)
    return { isValid: false }
  }

  return { interaction: JSON.parse(body), isValid: true }
}

const server = {
  verifyDiscordRequest,
  fetch: router.fetch,
}

export default server
