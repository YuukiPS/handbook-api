import Logger from "@UT/logger"
import { Command } from "./Interface"
import * as fs from "fs"
import SRTool, { FOLDER_SR } from "@DB/book/star-rail"
import General from "@DB/general/api"
import { getTimeV2, readJsonFileAsync } from "@UT/library"
import { BuildData } from "@UT/response"

const log = new Logger("/buildrelic", "blue")

/**
 * Parses a single line of CSV into fields, handling quoted values.
 */
function parseCSVLine(line: string): string[] {
	const fields: string[] = []
	let current = ""
	let inQuotes = false

	for (let i = 0; i < line.length; i++) {
		const char = line[i]

		if (char === '"') {
			// Toggle inQuotes, or handle escaped quotes
			if (inQuotes && line[i + 1] === '"') {
				current += '"'
				i++ // Skip the escaped quote
			} else {
				inQuotes = !inQuotes
			}
		} else if (char === "," && !inQuotes) {
			fields.push(current)
			current = ""
		} else {
			current += char
		}
	}
	fields.push(current)
	return fields
}

/**
 * Reads a CSV file, parses it into a 2D array of strings.
 */
function parseCSV(text: string): string[][] {
	return text.split(/\r?\n/).map(parseCSVLine)
}

/**
 * Converts the given CSV file into JSON objects (one per character + mode).
 */
function convertCsvToJson(inputPath: string, outputPath: string): void {
	// Load raw CSV
	const raw = fs.readFileSync(inputPath, "utf8")
	const rows = parseCSV(raw)

	if (rows.length < 3) {
		console.error("CSV must have at least a header row and one data block.")
		process.exit(1)
	}

	// Header row (row 0): empty + mode names
	const header = rows[0]
	const modes = header.slice(1).filter((mode) => mode.trim() !== "")

	const result: Record<string, any>[] = []
	let i = 2 // Skip header and the empty-second line

	while (i < rows.length) {
		const line = rows[i]
		// Blank line signals a new block
		if (line.every((cell) => cell.trim() === "")) {
			i++
			continue
		}
		// Expect 'Character' line
		if (line[0] === "Character") {
			const charName = line[1]
			i++

			// Collect rows until next blank
			const blockRows: { name: string; values: string[] }[] = []
			while (i < rows.length && !rows[i].every((c) => c.trim() === "")) {
				const r = rows[i]
				blockRows.push({ name: r[0], values: r.slice(1) })
				i++
			}

			// For each mode, build an object with Character, Mode, and all fields
			modes.forEach((modeName, idx) => {
				const obj: Record<string, any> = { Character: charName, Mode: modeName }
				blockRows.forEach((br) => {
					obj[br.name] = (br.values[idx] || "").trim()
				})
				result.push(obj)
			})
		} else {
			// Skip unexpected lines
			i++
		}
	}

	// Write JSON output
	fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8")
	console.log(`Successfully wrote JSON to ${outputPath}`)
}

export default async function handle(command: Command) {
	/* 
    TODO auto update:
    https://docs.google.com/spreadsheets/d/1Fxq4QJDQo4965AkH_7S_vStV-anfpkrRGUQdozKcBiM/edit?gid=0#gid=0
    https://docs.google.com/spreadsheets/d/e/2PACX-1vRsm60jYo8MdHWimjvY42wE8-j-0NBwG9-KutpNcQbylhhBiKBpGmUm1x3CXExthl2EB438RdMWdeT3/pubhtml#
    https://genshin.gg/star-rail/characters/castorice/
    https://game8.co/games/Honkai-Star-Rail/archives/486305
	https://github.com/Samuel-Nguyen/LunarCore-Builder-Plugin/releases
    */
	//convertCsvToJson(`${FOLDER_SR}/data/lc.csv`, `${FOLDER_SR}/data/lc.json`)
	var data = await readJsonFileAsync<any>(`${FOLDER_SR}/data/lc.json`)
	var id = 0
	const slots = ["Rope", "Orb", "Shoes", "Body", "Gloves", "Hat"] as const
	for (const item of data) {
		var find = item.Character
		var r = find
		var title = item.Mode

		// TODO: make this better
		if (find.includes("Destruction (Phys) Trailblazer")) {
			find = "Trailblazer Girl Physical"
		} else if (find.includes("Preservation (Fire) Trailblazer")) {
			find = "Trailblazer Girl Fire"
		} else if (find.includes("Harmony (Imaginary) Trailblazer")) {
			find = "Trailblazer Girl Imaginary"
		} else if (find.includes("Remembrance (Ice) Trailblazer")) {
			find = "Trailblazer Girl Ice"
		} else if (find.includes("March 7th (Preservation)")) {
			find = "March 7th Ice"
		} else if (find.includes("March 7th (Hunt)")) {
			find = "March 7th Imaginary"
		} else if (find.includes("Dan Heng Imbibitor Lunae (Dan IL)")) {
			find = "Dan Heng • Imbibitor Lunae"
		} else if (find.includes("Dan Heng Glamoth")) {
			find = "Dan Heng"
		} else {
			find = find.split(" ")[0]
		}

		// get id avatar
		var avatarData = await General.findItem({
			search: find, // TODO: make this better
			game: 2,
			type: 1,
			lang: "en"
		})
		if (!avatarData.data) {
			log.warn(`Avatar ${find} not found in datebase`)
			continue
		}

		var dataAva = avatarData.data[0]
		const obj: BuildData = {
			owner: 110000000, // tmp uid yuuki account for auto build lc data
			title,
			avatar: {
				id: dataAva.id,
				level: 80,
				rank: 6,
				promotion: 6
			},
			vote: 0,
			time: getTimeV2(true),
			update: getTimeV2(true),
			relic: [],
			_id: 0//await General.getCount("buildSR")
		}
		id++

		if (item["Light Cone"]) {
			obj.equipment = {
				id: parseInt(item["Light Cone"].split(" ")[1]),
				level: 80,
				promotion: 6, // This changes based on level
				rank: 5 // Super Impostion
			}
		}

		// Extract values containing "/give" for each object
		const giveItems = Object.entries(item)
			.map(([key, value]) => {
				if (key === "Light Cone") return null
				if (typeof value === "string" && value.includes("/give")) {
					return value
				}
				return null
			})
			.filter((value): value is string => value !== null)

		for (const giveItem of giveItems) {
			var d = SRTool.GenRelic(giveItem)
			if (!d) {
				log.warn(`Relic ${giveItem} not found in datebase`)
				continue
			}
			obj.relic?.push(d.raw)
		}

		if ((obj.relic ?? []).length >= 1) {
			log.info(`Build [${find} = ${r}] (${obj.avatar?.id}) - ${obj.title} - ${obj.relic?.length} relics`)
			//console.log(JSON.stringify(obj, null, 2))
			//await SRTool.addBuild(obj)
		} else {
			//console.log(obj)
		}
	}
}
