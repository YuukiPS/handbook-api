import Logger from "@UT/logger"
import { Client, DMChannel, Message, NewsChannel, TextChannel } from "discord.js"
import AI, { ChatUserDataRsp } from "@SV/ai"
import qAI from "@JO/aiQueue"

const log = new Logger("Discord(messageCreate)")

export default async function run(message: Message, client: Client) {
	// if bot
	if (message.author.bot) return

	var msg = message.content.toLowerCase()
	let user_id = message.author.id
	let username = message.author.username
	let channel_id = message.channel.id
	let channel_name =
		message.channel instanceof TextChannel
			? message.channel.name
			: message.channel instanceof DMChannel
			? message.channel.recipient?.username
			: message.channel instanceof NewsChannel
			? message.channel.name
			: "Unknown Channel"

	// If have message
	if (msg) {
		log.info(`Chat2: ${username}#${user_id} from ${channel_name}#${channel_id}):\n-> ${msg}`)

		// Ai
		if (channel_id == "1074283546929270804") {
			var us = await message.reply(`Wait a moment, I'm still learning to talk, please be patient with me.`)

			let buffer = ""
			let lastEdit = Date.now()
			let editInProgress = false
			let editQueued = false
			const EDIT_THROTTLE_MS = 1000 // 1 second throttle

			function tryEdit() {
				if (editInProgress) {
					editQueued = true
					return
				}
				editInProgress = true
				us.edit(buffer).finally(() => {
					lastEdit = Date.now()
					editInProgress = false
					if (editQueued) {
						editQueued = false
						setTimeout(tryEdit, EDIT_THROTTLE_MS)
					}
				})
			}

			AI.chatStream(msg, user_id, true, true, (respon: string | ChatUserDataRsp) => {
				if (typeof respon === "string") {
					buffer = respon
				} else {
					buffer = respon.message
				}
				const now = Date.now()
				if (now - lastEdit > EDIT_THROTTLE_MS) {
					tryEdit()
				}
			})
		}
	} else {
		log.info(`Chat: ${username}#${user_id} from ${channel_name}#${channel_id}):\n-> Empty message`)
		if (channel_name === "Unknown Channel") {
			log.warn(`Unknown Channel: `, JSON.stringify(message.channel, null, 2))
		}
	}

	// Tesing stuff
	if (msg === "melon") {
		message.reply("🍈")
	}
}
