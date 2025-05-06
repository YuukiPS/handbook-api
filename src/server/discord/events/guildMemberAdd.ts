import Logger from "@UT/logger"
import { GuildMember } from "discord.js"

const log = new Logger("Discord(Member)")

export default async function run(member: GuildMember) {
	log.info(`${member.user.username} joined server.`)
}
