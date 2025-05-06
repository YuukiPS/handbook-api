import Logger from "@UT/logger"
import { Client, MessageReaction, User } from "discord.js"

const log = new Logger("Discord(MessageReaction)")

export default async function run(reaction: MessageReaction, user: User, client: Client, isDelete: boolean) {
	// Ignore reactions from other bots
	if (user.bot) return

	log.info(
		`Reaction ${isDelete ? "removed" : "added"} by ${user.username}#${
			user.id
		} in ${reaction.message.channel.toString()}`
	)
}
