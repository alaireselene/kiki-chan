# Kiki-chan

Kiki-chan is the little sister of Kimi Discord Bot, powered by **bun** and **Cloudflare Workers**. She brings delightful interactions to your Discord server with modern tooling and blazing-fast performance.

Built with the latest technologies, Kiki-chan leverages the speed of bun runtime and the global edge network of Cloudflare Workers for optimal user experience. She runs **Kimi K2**, an open-source LLM model with OpenAI-compatible API.

> 🤖 **AI Model**: [Kimi K2](https://github.com/MoonshotAI/Kimi-K2) - Open-source large language model with OpenAI-compatible API

## Resources used


- [Cloudflare Workers](https://workers.cloudflare.com/) for hosting
- [Bun](https://bun.sh/) as the JavaScript runtime
- [itty-router](https://itty.dev/) for HTTP routing
- [discord-interactions](https://github.com/discord/discord-interactions-js) for Discord API interactions

---

## Project structure

Below is a basic overview of the project structure:

```
├── src
│   ├── commands.ts           -> Discord slash command definitions
│   ├── gateway-bot.ts        -> Gateway bot implementation
│   ├── reddit.ts             -> Reddit API integration
│   ├── register.ts           -> Command registration with Discord API
│   ├── server.ts             -> Main Discord app logic and routing
├── test
|   ├── server.test.ts        -> Tests for the application
├── wrangler.toml             -> Cloudflare Workers configuration
├── package.json              -> Dependencies and scripts (using bun)
├── biome.json                -> Code formatting and linting configuration
├── tsconfig.json             -> TypeScript configuration
├── example.ngrok.yml                 -> example ngrok tunneling configuration
└── README.md
```

## Configuring project

Before starting, you'll need a [Discord app](https://discord.com/developers/applications) with the following permissions:

- `bot` with the `Send Messages` and `Use Slash Command` permissions
- `applications.commands` scope

> ⚙️ Permissions can be configured by clicking on the `OAuth2` tab and using the `URL Generator`. After a URL is generated, you can install the app by pasting that URL into your browser and following the installation flow.

## Creating your Cloudflare worker

Next, you'll need to create a Cloudflare Worker.

- Visit the [Cloudflare dashboard](https://dash.cloudflare.com/)
- Click on the `Workers` tab, and create a new service using the same name as your Discord bot

## Running locally

> ⚙️ This project uses **bun** as the JavaScript runtime. Make sure you have [bun](https://bun.sh/) installed.

First clone the project:

```
git clone https://github.com/alaireselene/kiki-chan.git
```

Then navigate to its directory and install dependencies:

```
cd kiki-chan
bun install
```

### Local configuration

> 💡 More information about generating and fetching credentials can be found [in the Discord developer documentation](https://discord.com/developers/docs/tutorials/hosting-on-cloudflare-workers#storing-secrets)

Rename `example.dev.vars` to `.dev.vars`, and make sure to set each variable.

**`.dev.vars` contains sensitive data so make sure it does not get checked into git**.

### Register commands

The following command only needs to be run once:

```
$ bun run register
```

### Run app

Now you should be ready to start your server:

```
$ bun run start
```

### Setting up ngrok

When a user types a slash command, Discord will send an HTTP request to a given endpoint. During local development this can be a little challenging, so we're going to use a tool called `ngrok` to create an HTTP tunnel.

**Prerequisites:**
1. Create an [ngrok account](https://ngrok.com/) or use an existing one
2. Set up a fixed domain in **Universal Gateway > Domains** in your ngrok dashboard
3. Get your authtoken from the ngrok dashboard

**Configuration:**
Run `bunx ngrok config edit` and configure it as follows:

```yaml
version: "3"
agent:
    authtoken: <your-token>
endpoints:
  - name: kiki-chan
    url: your-domain.ngrok-free.app  # Replace with your fixed domain
    upstream:
      url: 8787
```

**Start the tunnel:**
```
$ bun run ngrok
```

This will create a tunnel using your configured fixed domain. Your ngrok URL will be consistent across sessions (e.g., `https://your-domain.ngrok-free.app`). 

Copy this HTTPS link and head back to the Discord Developer Dashboard, then update the "Interactions Endpoint URL" for your bot:

![interactions-endpoint](https://user-images.githubusercontent.com/534619/157510959-6cf0327a-052a-432c-855b-c662824f15ce.png)

This is the process we'll use for local testing and development. When you've published your bot to Cloudflare, you will _want to update this field to use your Cloudflare Worker URL._

## Deploying app

This repository can be deployed to Cloudflare Workers when new changes are ready. To deploy manually, run `bun run publish`, which uses the `wrangler deploy` command under the hood.

### Available Scripts

- `bun run start` - Start the development server with wrangler
- `bun run ngrok` - Start ngrok tunnel for local development
- `bun run gateway` - Run the gateway bot
- `bun run test` - Run tests
- `bun run lint` - Lint the code
- `bun run fix` - Fix linting issues automatically
- `bun run register` - Register Discord slash commands
- `bun run publish` - Deploy to Cloudflare Workers

### Storing secrets

The credentials in `.dev.vars` are only applied locally. The production service needs access to credentials from your app:

```
$ wrangler secret put DISCORD_TOKEN
$ wrangler secret put DISCORD_PUBLIC_KEY
$ wrangler secret put DISCORD_APPLICATION_ID
```

## Questions?

Feel free to post an issue in the repository or reach out for support!

---

*Kiki-chan - Little sister of Kimi, powered by bun and Cloudflare Workers 🚀*
