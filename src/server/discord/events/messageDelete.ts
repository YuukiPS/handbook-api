import Logger from "@UT/logger"
import { Message } from "discord.js"

const log = new Logger("Discord(messageDeleted)")

export default async function run(message: Message) {
	log.warn(`Message in ${message.channel.toString()} deleted`)
	log.trail(message.cleanContent)
}
