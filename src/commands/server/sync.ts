import Logger from "@UT/logger"
import { Command } from "./Interface"
import job from "@JO/update"

const log = new Logger("/ping", "blue")

export default async function handle(command: Command) {
	log.log(`Sync manual`)
	//await job.Sync(true, true, false, true)
	await job.Sync()
}
