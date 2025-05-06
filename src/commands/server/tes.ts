//import Logger from "@UT/logger"
import { Command } from "./Interface"
import General from "@DB/book/general"
//const log = new Logger("/tes", "blue")

export default async function handle(command: Command) {
    General.checkGit(`Dimbreath/turnbasedgamedata`,`commit_sr`, false, true)
}
