import {
	ApplicationCommandDataResolvable,
	CacheType,
	Client,
	DMChannel,
	GatewayIntentBits,
	Interaction,
	MessagePayload,
	NewsChannel,
	Partials,
	REST,
	Routes,
	TextChannel,
	WebhookClient
} from "discord.js"
import { isEmpty } from "@UT/library"
import Logger from "@UT/logger"
import Config, { GetProfile } from "@UT/config"
import { isMainThread } from "worker_threads"
import fs from "fs"
import getEvents, { findEvent } from "./events/eventHandler"

const log = new Logger("Discord")

async function registerEvent(event: string, ...args: any) {
	const events = await getEvents()
	const eventFunc = findEvent(events, event)
	//log.debug(`${event} was called`)
	if (eventFunc) await eventFunc(...args)
}

class Discord {
	private token: string = ""
	private client_id: string = ""
	private guild_id: string = ""

	private connectionDelay = 1000 * 10
	public bot: Client | undefined

	constructor(token: string, client_id: string, guild_id: string) {
		this.token = token
		this.client_id = client_id
		this.guild_id = guild_id
		if (isMainThread) {
			log.info(`This is main thread for discord server`)
			if (GetProfile().run.discord && !isEmpty(Config.bot.discord.token)) {
				this.Register()
				this.Start()
			} else {
				log.info(`Discord server skip...`)
			}
		} else {
			log.info(`This is another thread for discord server, so skip run server`)
		}
	}

	public Start() {
		log.info(`Discord server start...`)

		this.bot = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildExpressions,
				GatewayIntentBits.GuildIntegrations,
				GatewayIntentBits.GuildWebhooks,
				GatewayIntentBits.GuildInvites,
				GatewayIntentBits.GuildPresences,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildMessageReactions,
				GatewayIntentBits.GuildMessageTyping,
				GatewayIntentBits.DirectMessages,
				GatewayIntentBits.DirectMessageReactions,
				GatewayIntentBits.DirectMessageTyping,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildScheduledEvents
			],
			partials: [
				Partials.User,
				Partials.Channel,
				Partials.GuildMember,
				Partials.Message,
				Partials.Reaction,
				Partials.GuildScheduledEvent,
				Partials.ThreadMember
			]
		})

		// Event
		this.bot.on("messageCreate", async (message) => {
			await registerEvent("messageCreate", message, this.bot)
		})
		this.bot.on("messageReactionAdd", async (reaction, user) => {
			await registerEvent("messageReactionAdd", reaction, user, this.bot, false)
		})
		this.bot.on("messageReactionRemove", async (reaction, user) => {
			await registerEvent("messageReactionAdd", reaction, user, this.bot, true)
		})
		this.bot.on("guildMemberAdd", async (member) => {
			await registerEvent("guildMemberAdd", member)
		})
		this.bot.on("messageUpdate", async (oldMessage, newMessage) => {
			await registerEvent("messageUpdate", oldMessage, newMessage)
		})
		this.bot.on("messageDelete", async (message) => {
			await registerEvent("messageDelete", message)
		})
		this.bot.on("messageDeleteBulk", async (messages) => {
			await registerEvent("messageDeleteBulk", messages)
		})

		// Interaction Bot
		this.bot.on("interactionCreate", async (interaction) => {
			let username = interaction.user.username
			let username_id = interaction.user.id
			let channel_id = interaction.channel?.id

			const channel_name =
				interaction.channel instanceof TextChannel
					? interaction.channel.name
					: interaction.channel instanceof DMChannel
					? interaction.channel.recipient?.username // or any other property/method you want to use for DMChannel
					: interaction.channel instanceof NewsChannel
					? interaction.channel.name
					: "Unknown Channel"

			log.info(
				`Event Interaction ${username}#${username_id} in Channel${channel_name}#${channel_id} with Type ${interaction.type}`
			)

			if (interaction.isCommand()) {
				// check if bot channel
				if ("987879230585069609" != channel_id) {
					interaction.reply({
						content: `Can't do it here, please do it on the bot channel or you will get kicked if you continue using it.`,
						ephemeral: true
					})
					return
				}
				this.run_commands(interaction.commandName, interaction)
			} else if (interaction.isModalSubmit()) {
				this.run_commands(interaction.customId + `-helper`, interaction)
			} else if (interaction.isButton()) {
				this.run_commands(interaction.customId + `-helper`, interaction)
			} else if (interaction.isStringSelectMenu()) {
				this.run_commands(interaction.customId + `-helper`, interaction)
			}
		})

		this.bot.on("error", (error: Error) => {
			log.errorNoStack({ message: "Bot encountered an error", error: error })
		})
		this.bot.on("ready", () => {
			if (this.bot == undefined) {
				log.warn("idk bot")
				return
			}
			log.info(`Ready to serve in ${this.bot.guilds.cache.size} guilds as ${this.bot.user?.tag}.`)
		})
		this.connectWithRetry()
	}

	public run_commands(name: string, interaction: Interaction<CacheType>) {
		import(`@CMD/discord/${name}`)
			.then(async (cmd) => {
				await cmd.default.process(interaction)
			})
			.catch(async (error) => {
				log.error("log", error)
			})
	}

	private connectWithRetry() {
		if (this.bot == undefined) {
			return
		}
		this.bot
			.login(this.token)
			.then(() => {
				log.info(`Bot connected successfully. Username: ${this.bot?.user?.tag}`)
			})
			.catch((error) => {
				log.warn({ message: "Failed to connect:", error: error })
				log.warn(`Retrying connection in ${this.connectionDelay / 1000} seconds...`)
				setTimeout(this.connectWithRetry, this.connectionDelay)
				this.connectionDelay += 1000 * 5 // Increase delay by 5 seconds for subsequent attempts
			})
	}

	public async Register() {
		try {
			const allCommands: ApplicationCommandDataResolvable[] = []
			const files = await fs.promises.readdir("./src/commands/discord")
			for (const file of files) {
				// skip if helper
				if (file.includes("-helper")) {
					log.info(`Registered ${file} skip because it's helper`)
					continue
				}

				try {
					const module = await import(`../../../src/commands/discord/${file}`)
					const target = module.default.command
					if (!target) continue
					allCommands.push(target.toJSON())
					log.info(`Registered command /${target.name}`)
				} catch (error) {
					log.error(`Error reg ${file}`, error)
				}
			}

			const rest = new REST({ version: "10" }).setToken(this.token)
			if (allCommands.length === 0) {
				log.warn("No commands to register. Skipping registration.")
				return
			}

			log.debug("Registering commands:", allCommands)
			await rest.put(Routes.applicationGuildCommands(this.client_id, this.guild_id), {
				body: allCommands
			})
			log.info("Commands registered successfully.")
		} catch (error) {
			log.errorNoStack("Failed to register commands:", error)
		}
	}

	public SendWebhook(message: string | MessagePayload, data: { id: string; token: string }) {
		const Client = new WebhookClient(data)
		Client.send(message)
	}

	public Run() {
		log.info(`Pong Discord`)
	}
}

const instance = new Discord(Config.bot.discord.token, Config.bot.discord.client_id, Config.bot.discord.guild_id)
export default instance
