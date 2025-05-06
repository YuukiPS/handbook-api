import Logger from "@UT/logger"
import { Command } from "./Interface"
import AI from "@SV/ai"
import fs from "fs"
import { CommandData, getTypeGameEngine, QuestionData, TypeDocumentation } from "@UT/response"
import { getTimeV2 } from "@UT/library"

const log = new Logger("/dataset", "blue")

// This command is used just building the dataset use https://github.com/YuukiPS/Chatbot/blob/main/src/data/dataset.md
// In the future, the dataset will be stored in a database so that users can add it on the web without a GitHub account.

const FOLDER = `./src/server/web/public/resources/general`

interface CommandDataOld {
	command: string
	description: string
	usage: string
	type: string
}

interface QAData {
	question: string
	answer: string
}

type DataPair = CommandDataOld | QAData

function parseMarkdown(filename: string, section: string, startsWith: string, fields: string[]): DataPair[] {
	const markdown = fs.readFileSync(filename, "utf-8")
	const lines = markdown.split("\n")
	let isCorrectSection = false
	const pairs: DataPair[] = []

	lines.forEach((line, i) => {
		if (line.startsWith("##")) {
			isCorrectSection = line.substring(3).trim() === section
		}
		if (isCorrectSection && line.startsWith(startsWith)) {
			const pair = parseLine(line, lines[i + 1], fields, startsWith)
			pairs.push(pair)
		}
	})

	return pairs
}

function parseLine(line: string, nextLine: string, fields: string[], startsWith: string): DataPair {
	if (fields.length === 2 && startsWith === "Q:") {
		const qaData: QAData = {
			question: line.substring(2).trim(),
			answer: nextLine.substring(2).trim()
		}
		return qaData
	} else {
		const parts = line.split("|").map((part) => part.trim())
		const commandData: CommandDataOld = {
			command: parts[1] || "",
			description: parts[2] || "",
			usage: parts[3] || "",
			type: parts[4] || ""
		}

		return commandData
	}
}

export default async function handle(command: Command) {
	log.log(`Dataset: ${command.args.join(" ")}`)
	const commandUsagePairs = parseMarkdown(`${FOLDER}/dataset.md`, "Command", "| `", [
		"command",
		"description",
		"usage",
		"type"
	]) as CommandDataOld[]
	var toadd: CommandData[] = []
	for (const pair of commandUsagePairs) {
		log.log(`Command: ${pair.command}`)
		log.log(`Description: ${pair.description}`)
		log.log(`Usage: ${pair.usage}`)
		log.log(`Type: ${pair.type}`)
		var cmd: CommandData = {
			command: pair.command.replace(/^`+|`+$/g, ""),
			description: pair.description,
			usage: pair.usage.replace(/^`+|`+$/g, ""),
			typeEngine: getTypeGameEngine(pair.type),
			id: 0, // set 0 for auto increment
			owner: 110000000, // yuuki account
			time: getTimeV2(true),
			update: getTimeV2(true),
			vote: 0,
			view: 0,
			tag: [`Command`],
			type: TypeDocumentation.Command,
			language: "EN",
			embedding: []
		}
		cmd.embedding = await AI.createEmbedding([`${cmd.command} ${cmd.description} ${cmd.usage} ${cmd.type}`])
		toadd.push(cmd)
	}

	log.info(`Done ${toadd.length} command to database`)

	const questionAnswerPairs = parseMarkdown(`${FOLDER}/dataset.md`, "Knowledge", "Q:", [
		"question",
		"answer"
	]) as QAData[]
	//log.log(`QA: `, questionAnswerPairs)
	var toadd2: QuestionData[] = []
	for (const pair of questionAnswerPairs) {
		log.log(`Q: ${pair.question}`)
		log.log(`A: ${pair.answer}`)
		var ask: QuestionData = {
			question: pair.question.endsWith("\\") ? pair.question.slice(0, -1) : pair.question,
			answer: pair.answer,
			id: 0, // set 0 for auto increment
			owner: 110000000, // yuuki account
			time: getTimeV2(true),
			update: getTimeV2(true),
			vote: 0,
			view: 0,
			tag: [`QA`],
			type: TypeDocumentation.Question,
			language: "EN",
			embedding: []
		}
		ask.embedding = await AI.createEmbedding([`${ask.question} ${ask.answer}`])
		toadd2.push(ask)
	}

	log.info(`done ${toadd.length} question to database`)
}
