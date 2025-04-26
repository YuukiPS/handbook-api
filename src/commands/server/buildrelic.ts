import Logger from "@UT/logger"
import { Command } from "./Interface"
import * as fs from "fs"
import SRTool, { FOLDER_SR } from "@DB/book/star-rail"
import General from "@DB/book/general"
import { getTimeV2, readJsonFileAsync } from "@UT/library"
import { BuildRelicData } from "@UT/response"

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
    */
	//convertCsvToJson(`${FOLDER_SR}/data/lc.csv`, `${FOLDER_SR}/data/lc.json`)
	var data = await readJsonFileAsync<any>(`${FOLDER_SR}/data/lc.json`)
	var id = 0
	const slots = ["Rope", "Orb", "Shoes", "Body", "Gloves", "Hat"] as const
	for (const item of data) {
		var find = item.Character

		// TODO: make this better
		if (find.includes("Destruction (Phys) Trailblazer")) {
			find = "Trailblazer Girl Warrior"
		}
		if (find.includes("Preservation (Fire) Trailblazer")) {
			find = "Trailblazer Girl Knight"
		}
		if (find.includes("Harmony (Imaginary) Trailblazer")) {
			find = "Trailblazer Girl Shaman"
		}
		if (find.includes("Remembrance (Ice) Trailblazer")) {
			find = "Trailblazer Girl Memory"
		}

		// get id avatar
		var avatarData = await General.findItem({
			search: find.split(" ")[0], // TODO: make this better
			game: 2,
			type: 1,
			lang: "en"
		})
		if (!avatarData.data) {
			log.warn(`Avatar ${find} not found in datebase`)
			continue
		}
		const obj: BuildRelicData = {
			//id,
			owner: 110000000, // tmp uid yuuki account for auto build lc data
			title: item.Mode,
			avatar: avatarData.data[0].id,
			lightcone: 0,
			vote: 0,
			time: getTimeV2(true),
			cmd: []
		}
		id++
		obj.cmd = slots
			.map((slotName) => item[slotName]) // pull each value
			.filter((v): v is string => Boolean(v)) // drop undefined / empty
			.map((str) => str.replace(/\//g, "")) // strip ALL “/”

		if (item["Light Cone"]) {
			obj.lightcone = parseInt(item["Light Cone"].split(" ")[1])
		}

		if (obj.cmd.length >= 1) {
			log.info(`Build relic ${obj.avatar} - ${obj.title} - ${obj.cmd.join(",")}`)
            await SRTool.addRelicBuild(obj)
		} else {
			//console.log(obj)
		}
	}
}
