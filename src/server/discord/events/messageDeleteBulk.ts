import Logger from "@UT/logger"
import { Collection, Message, PartialMessage } from "discord.js"

const log = new Logger("Discord(messageDeletedBulk)")

export default async function run(messages: Collection<string, Message<boolean> | PartialMessage>) {
	log.warn(`${messages.size} messages deleted (bulk) in ${messages.first()?.channel.toString() || "???"}`)
}
