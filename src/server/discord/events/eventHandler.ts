import Logger from "@UT/logger"
import fs from "fs"

const log = new Logger("EventHandler")

type Events = {
	root: {
		name: string
		call: (...args: any[]) => void
	}[]
}

export default async function getEvents(): Promise<Events> {
	const files = fs.readdirSync("./src/server/discord/events")
	const events: Events = {
		root: []
	}

	await files.forEach((file: any) => {
		if (file.endsWith(".ts") && !file.endsWith("eventHandler.ts")) {
			import(`./${file}`).then(async (event) => {
				events.root.push({
					name: file.replace(".ts", ""),
					call: event.default
				})
			})
		}
	})

	return events
}

export function findEvent(events: Events, target: string): Function | undefined {
	const event = events.root.find((e) => e.name === target)
	if (event) return event.call
	log.errorNoStack(`Event ${target} not found.`)
	return undefined
}
