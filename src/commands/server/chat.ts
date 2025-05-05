import Logger from "@UT/logger"
import { Command } from "./Interface"
import AI from "@DB/book/ai"
const log = new Logger("/chat", "blue")

export default async function handle(command: Command) {
	var chat = command.args.join(" ").replace("/chat", "")
	//var chat = "find avatar ayaka";
	try {
		log.log(`Chat: ${chat}`)
		var respon = await AI.chat(chat, "1")
		log.log(`AI: `, respon)
	} catch (error) {
		log.errorNoStack(`Error: ${error}`)
	}
}
