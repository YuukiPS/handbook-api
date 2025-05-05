import Logger from "@UT/logger"
import { Command } from "./Interface"
import AI from "@DB/book/ai"
import General from "@DB/book/general"
import fs from "fs"
import { QuestionData, TypeDocumentation } from "@UT/response"
import { getTimeV2 } from "@UT/library"

const log = new Logger("/dataset", "blue")

// This command is used just building the dataset use https://github.com/YuukiPS/Chatbot/blob/main/src/data/dataset.md
// In the future, the dataset will be stored in a database so that users can add it on the web without a GitHub account.

const FOLDER = `./src/server/web/public/resources/general`

interface CommandData {
	command: string
	description: string
	usage: string
	type: string
}

interface QAData {
	question: string
	answer: string
}

type DataPair = CommandData | QAData

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
		const commandData: CommandData = {
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

	const questionAnswerPairs = parseMarkdown(`${FOLDER}/dataset.md`, "Knowledge", "Q:", [
		"question",
		"answer"
	]) as QAData[]
	//log.log(`QA: `, questionAnswerPairs)
	var toadd: QuestionData[] = []
	for (const pair of questionAnswerPairs) {
		log.log(`Q: ${pair.question}`)
		log.log(`A: ${pair.answer}`)
		var ask: QuestionData = {
			question: pair.question.endsWith('\\') ? pair.question.slice(0, -1) : pair.question,
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
		toadd.push(ask)
	}
	await AI.embedDataset(toadd)
	log.info(`Add ${toadd.length} question to database`)
	for (const doc of toadd) {
		var isAdd = await General.addDoc(doc);
		log.info(`Add ${doc.question} to database? `, isAdd)
		
	}
}
