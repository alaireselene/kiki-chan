import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
} from 'discord-interactions'
import { AWW_COMMAND, INVITE_COMMAND } from '../src/commands.js'
import server from '../src/server.js'

describe('Server', () => {
  describe('GET /', () => {
    it('should return a greeting message with the Discord application ID', async () => {
      const request = new Request('http://discordo.example/', {
        method: 'GET',
      })
      const env = { DISCORD_APPLICATION_ID: '123456789' }

      const response = await server.fetch(request, env)
      const body = await response.text()

      expect(body).toBe('👋 123456789')
    })
  })

  describe('POST /', () => {
    let verifyDiscordRequestMock: any

    beforeEach(() => {
      // biome-ignore lint/suspicious/noEmptyBlockStatements: No need for explanation
      verifyDiscordRequestMock = mock(() => { })
      server.verifyDiscordRequest = verifyDiscordRequestMock
    })

    afterEach(() => {
      mock.restore()
    })

    it('should handle a PING interaction', async () => {
      const interaction = {
        type: InteractionType.PING,
      }

      const request = new Request('http://discordo.example/', {
        method: 'POST',
      })

      const env = {}

      verifyDiscordRequestMock.mockResolvedValue({
        isValid: true,
        interaction: interaction,
      })

      const response = await server.fetch(request, env)
      const body = await response.json()
      expect(body.type).toBe(InteractionResponseType.PONG)
    })

    it('should handle an AWW command interaction', async () => {
      const interaction = {
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: AWW_COMMAND.name,
        },
      }

      const request = new Request('http://discordo.example/', {
        method: 'POST',
      })

      const env = {}

      verifyDiscordRequestMock.mockResolvedValue({
        isValid: true,
        interaction: interaction,
      })

      // mock the fetch function with proper response data
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                children: [
                  {
                    data: {
                      url: 'https://example.com/cute-image.jpg',
                    },
                  },
                ],
              },
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        ),
      )

        ; (globalThis as any).fetch = fetchMock

      const response = await server.fetch(request, env)
      const body = await response.json()
      expect(body.type).toBe(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      )
      expect(body.data).toBeDefined()
      expect(body.data.content).toBe('https://example.com/cute-image.jpg')
    })

    it('should handle an invite command interaction', async () => {
      const interaction = {
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: INVITE_COMMAND.name,
        },
      }

      const request = new Request('http://discordo.example/', {
        method: 'POST',
      })

      const env = {
        DISCORD_APPLICATION_ID: '123456789',
      }

      verifyDiscordRequestMock.mockResolvedValue({
        isValid: true,
        interaction: interaction,
      })

      const response = await server.fetch(request, env)
      const body = await response.json()
      expect(body.type).toBe(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      )
      expect(body.data.content).toContain(
        'https://discord.com/oauth2/authorize?client_id=123456789&permissions=562952100972608&integration_type=0&scope=bot+applications.commands',
      )
      expect(body.data.flags).toBe(InteractionResponseFlags.EPHEMERAL)
    })

    it('should handle an unknown command interaction', async () => {
      const interaction = {
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: 'unknown',
        },
      }

      const request = new Request('http://discordo.example/', {
        method: 'POST',
      })

      verifyDiscordRequestMock.mockResolvedValue({
        isValid: true,
        interaction: interaction,
      })

      const response = await server.fetch(request, {})
      const body = await response.json()
      expect(response.status).toBe(400)
      expect(body.error).toBe('Unknown Type')
    })
  })

  describe('All other routes', () => {
    it('should return a "Not Found" response', async () => {
      const request = new Request('http://discordo.example/unknown', {
        method: 'GET',
      })
      const response = await server.fetch(request, {})
      expect(response.status).toBe(404)
      const body = await response.text()
      expect(body).toBe('Not Found.')
    })
  })
})
