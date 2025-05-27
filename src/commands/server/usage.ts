import Logger from "@UT/logger"
import { Command } from "./Interface"
import { getSystemUsage } from "@UT/library";

const log = new Logger("/usage", "blue")

export default async function handle(command: Command) {
    var data = await getSystemUsage()
    log.log(`System Usage: ${JSON.stringify(data)}`)
}
