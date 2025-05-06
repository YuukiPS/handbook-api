import Logger from "@UT/logger"
import { Message, PartialMessage } from "discord.js"

const log = new Logger("Discord(messageUpdate)")

export default async function run(
	oldMessage: Message<boolean> | PartialMessage,
	newMessage: Message<boolean> | PartialMessage
) {
	// if bot
	if (newMessage.author?.bot) return

	log.log(`Message edited by ${newMessage.author?.tag || ""} (${newMessage.id})`)
}
