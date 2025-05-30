import { createInterface } from "readline"
import _alias from "./alias.json"
import Logger from "@UT/logger"

const log = new Logger("Command", "blue")
const alias: { [key: string]: string } = _alias

export class Command {
	public readonly name: string
	public readonly args: string[]

	public constructor(public readonly full: string) {
		const split = full.split(" ")
		this.name = split[0]
		this.args = split.slice(1)
	}
}

export default class Interface {
	public static readonly rl = createInterface({
		input: process.stdin,
		output: process.stdout
	})
	
	private constructor() {}

	public static readonly start = () => {
		Interface.rl.question("", (_command) => {
			if (!_command) {
				Interface.start()
				return
			}
			const cmd = new Command(_command)
			import(`./${alias[cmd.name] || cmd.name}`)
				.then(async (module) => {
					await module.default(cmd)
				})
				.catch((err) => {
					if (err.code == "MODULE_NOT_FOUND") {
						log.errorNoStack(`Command ${cmd.name} not found.`, err)
						return
					}
					log.error(err)
				})
			Interface.start()
		})

		Interface.rl.on("close", () => {
			log.log(`Bye0 :)`)
			process.exit()
		})
	}
}
