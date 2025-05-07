import Logger from "@UT/logger"
import { Client, DMChannel, Message, NewsChannel, TextChannel } from "discord.js"
import AI from "@SV/ai"
import config from "@UT/config"

const log = new Logger("Discord(messageCreate)")

/**
 * Helper to derive a readable channel name.
 */
function getChannelName(channel: TextChannel | DMChannel | NewsChannel | unknown): string {
	if (channel instanceof TextChannel || channel instanceof NewsChannel) {
		return channel.name
	} else if (channel instanceof DMChannel) {
		return channel.recipient?.username || "Direct Message"
	}
	return "Unknown Channel"
}

export default async function run(message: Message, client: Client) {
	// Ignore bots
	if (message.author.bot) return

	const content = message.content.trim()
	const userId = message.author.id
	const username = message.author.username
	const channelId = message.channel.id
	const channelName = getChannelName(message.channel)

	log.info(`Received message from ${username}#${userId} in ${channelName}#${channelId}: "${content}"`)

	// AI interaction in designated channel
	if (config.bot.discord.ai.channel.includes(channelId) && content.length > 0) {
		
		const replyMessage = await message.reply(
			"Wait a moment, I'm still learning to talk, please be patient with me."
		)

		let buffer = ""
		let editInProgress = false
		let editQueued = false
		const EDIT_THROTTLE_MS = 1000 // 1 second
		let lastEditTimestamp = 0

		/**
		 * Attempts to edit the bot reply, respecting throttle
		 */
		function scheduleEdit() {
			if (editInProgress) {
				editQueued = true
				return
			}
			editInProgress = true
			replyMessage
				.edit(buffer)
				.catch((err) => log.error("Failed to edit message:", err))
				.finally(() => {
					lastEditTimestamp = Date.now()
					editInProgress = false
					if (editQueued) {
						editQueued = false
						setTimeout(scheduleEdit, EDIT_THROTTLE_MS)
					}
				})
		}

		// Stream AI response
		try {
			AI.chatStream(content, userId, true, true, (response) => {
				// Update buffer with latest chunk
				buffer = typeof response === "string" ? response : response.message
				//log.info("AI response chunk:", buffer)

				const now = Date.now()
				if (now - lastEditTimestamp > EDIT_THROTTLE_MS) {
					scheduleEdit()
				}

				// If this chunk signals end of conversation, flush remaining text
				if (typeof response !== "string" && response.type === 0) {
					scheduleEdit()
				}
			})
		} catch (err) {
			log.error("AI stream failed:", err)
			replyMessage.edit("Sorry, I'm having trouble generating a response right now.")
		}
	}

	// Fun easter egg: "melon"
	if (/^melon$/i.test(content)) {
		message.reply("🍈").catch((err) => log.error("Failed to send melon reply:", err))
	}
}
