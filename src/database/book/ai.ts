import Logger from "@UT/logger"
import {
	CommandData,
	getAllGameEngine,
	getAllTypeItem,
	getStringTypeGameEngine,
	getTypeGameEngine,
	getTypeItem,
	QuestionData
} from "@UT/response"
import config from "@UT/config"
import { detectLang, LanguageGame } from "@UT/library"
// third party
import { isMainThread } from "worker_threads"
import OpenAI from "openai"
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions"
// database
import General from "@DB/book/general"

const log = new Logger(`AI`)

// Configuration (Source: https://github.com/YuukiPS/Chatbot/)
const openaiConfig = {
	systemPrompt:
		"You are a maid named Konno Yuuki, who helps solve various problems related to Handbook, Private Server and knows yourself from Sword Art Online.\n" +
		"You should ALWAYS retrieve information directly from data using tool calls before providing your own answer.\n\n" +
		"When a user asks you:\n" +
		"1. FIRST determine which tool would provide most relevant information.\n" +
		"2. Call that tool BEFORE attempting to respond yourself.\n" +
		"3. Wait for tool call results.\n" +
		"4. if user writing using another language, translate it to English as default.\n" +
		"6. ONLY THEN formulate your response based on retrieved information.\n" +
		"7. DO NOT attempt to answer questions without using tool calls first.\n" +
		"8. If there really is no tool available, you just answer as a Konno Yuuki (of course without a tool).",

	tools: [
		{
			type: "function",
			function: {
				name: "find_id",
				description:
					"Searches for game item IDs in the database. ONLY use this function when looking up specific game item IDs for use with commands",
				parameters: {
					type: "object",
					properties: {
						search: {
							type: "string",
							description:
								"The exact name or part of the name of the game item to search for.\n\n" +
								"Example:\n" +
								'- "give ayaka avatar" → {"search": "ayaka", "category": "avatars"}\n' +
								'- "ayaka avatar" → {"search": "ayaka", "category": "avatars"}\n' +
								'- "avatar ayaka" → {"search": "ayaka", "category": "avatars"}\n' +
								'- "minta kode id ayaka buat item" → {"search": "ayaka", "category": "Normal"}\n' +
								'- "What is the id for ayaka?" → {"search": "ayaka"}\n' +
								'- "give my love citlali :*" → {"search": "citlali"}\n' +
								'- "What is the mora id for the Genshin game?" → {"search": "mora"}'
						},
						category: {
							type: "string",
							description:
								"Filters the search by category.\n\n" +
								"ADDITIONAL RULES FOR CATEGORIES:\n" +
								`1. ALWAYS extract category from these exact values: ${getAllTypeItem().join(", ")}\n` +
								"2. Additional info: Item=Normal, Mission/Story=Quest).\n" +
								"3. If category is not mentioned, use 'None' as default.\n" +
								"2. NEVER modify category names - use exact enum values.\n\n" +
								"Examples:\n" +
								'- "avatar ayaka" → {"category": "avatar"}\n' +
								'- "ayaka avatar" → {"category": "avatar"}\n' +
								'- "item mora" → {"category": "normal"}'
						}
					},
					required: ["search"]
				}
			}
		},
		{
			type: "function",
			function: {
				name: "find_document",
				description:
					"Use this for searches for answers to general questions, if no other function is suitable this is the last option ",
				parameters: {
					type: "object",
					properties: {
						question: {
							type: "string",
							description:
								"Take user questions and put them here.\n\n" +
								"Examples:\n" +
								"how download gio?\n" +
								"How can I delete account?\n" +
								"Does anyone know where I can get the glider?\n" +
								"How to fix game crash on startup?\n" +
								"Is it impossible to challenge Simulated Universe or Divergent Universe on a private server? Or is this just a problem with my device?\n" +
								"Why can't I play simulated universe in HSR?\n" +
								"How to fix error code 4214?\n"
						}
					},
					required: ["question"]
				}
			}
		},
		{
			type: "function",
			function: {
				name: "find_command",
				description:
					"ONLY use this to search for specific command syntax, usage, and descriptions. " +
					"This is for finding how to use specific commands in the game console, NOT for general game questions or issues.",
				parameters: {
					type: "object",
					properties: {
						command: {
							type: "string",
							description:
								'The exact name or part of the command to search for (e.g., "give", "spawn", "weather").'
						},
						type: {
							type: "string",
							description:
								'The game server type for the command. Valid values: "gc" (Grasscutter/Genshin), ' +
								'"gio" (Genshin official), or "lc" (LunarCore/HSR).',
							enum: getAllGameEngine()
						}
					},
					required: ["command"]
				}
			}
		}
	] as ChatCompletionTool[]
}

function splitThinkContent(message: string): { response: string; think: string } {
	const thinkRegex = /<think>([\s\S]*?)<\/think>/g
	const thinkParts: string[] = []

	const response = message
		.replace(thinkRegex, (_match, content) => {
			thinkParts.push(content.trim())
			return "" // strip out the think block
		})
		.trim()

	return {
		response,
		think: thinkParts.join("\n") // or use " " if you prefer space-separated
	}
}

enum TypeResponse {
	None = 0,
	Chat = 1, // normal chat without list menu
	Item = 2, // need call sub item
	Answer = 3,
	CommandHelper = 4
}

interface ProsessData {
	message: string
	data: null | any
}
interface ResponChatData {
	uid: string
	ask: string
	message: string
	think: string
	type: TypeResponse
	data: null | any
	totalChat: number
}

class AI {
	private ask!: OpenAI
	private conversation: Map<string, ChatCompletionMessageParam[]> = new Map()

	constructor() {
		if (isMainThread) {
			log.info(`This is AI main thread`)
			this.init()
		} else {
			log.info(`This is AI worker thread`)
		}
	}

	async init() {
		this.ask = new OpenAI({
			apiKey: config.ai.key,
			baseURL: `${config.ai.baseURL}${config.ai.ask}`
		})
		log.info(`AI initialized at ${config.ai.baseURL}`)
		log.info(`Model Ask: ${config.ai.modelAsk} | URL: ${config.ai.baseURL}${config.ai.ask}`)
		log.info(`AModel Ask: ${config.ai.modelEmbed} | URL: ${config.ai.baseURL}${config.ai.embed}`)

		//await this.embedDataset(dataset)
		log.info(`Dataset embedded`)
	}

	async embedDataset(items: QuestionData[] | CommandData[]) {
		const texts = items
			.map((item) =>
				"question" in item
					? `${item.question} ${item.answer}`
					: `${item.command} ${item.description} ${item.usage} ${item.type}`
			)
			.filter(Boolean)
		const resp = await fetch(`${config.ai.baseURL}${config.ai.embed}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${config.ai.key}`
			},
			body: JSON.stringify({ model: config.ai.modelEmbed, input: texts })
		})
		if (!resp.ok) throw new Error(`Embedding failed ${resp.status}: ${await resp.text()}`)
		const json = await resp.json()
		const embeddings = json.embeddings || json.data?.map((d: any) => d.embedding) || []
		if (embeddings.length !== items.length)
			throw new Error(`Expected ${items.length} embeddings, got ${embeddings.length}`)
		embeddings.forEach((vec: number[], i: number) => {
			;(items[i] as QuestionData | CommandData).embedding = vec
		})
		log.info(`✔︎ Embedded ${items.length} items successfully`)
	}

	async createEmbedding(texts: string[]): Promise<number[][]> {
		const resp = await fetch(`${config.ai.baseURL}${config.ai.embed}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${config.ai.key}`
			},
			body: JSON.stringify({ model: config.ai.modelEmbed, input: texts })
		})
		if (!resp.ok) throw new Error(`Embedding failed ${resp.status}: ${await resp.text()}`)
		const json = await resp.json()
		if (!Array.isArray(json.embeddings)) throw new Error(`Unexpected embedding response shape`)
		return json.embeddings
	}

	async prosessItem(search: string, category: string): Promise<ProsessData> {
		const results = await General.findItem({
			search: search,
			limit: 5,
			split: true,
			type: getTypeItem(category),
			lang: LanguageGame(await detectLang(search))
		})
		var found = "Not Found"
		if (results.data) {
			found = `Found ${results.data.length} > ${results.data
				.map((item) => `${item.name} (${item.id})`)
				.join(", ")}`
		}
		return {
			data: results.data,
			message: found
		}
	}

	async prosessAnswer(qa: string): Promise<ProsessData> {
		var qEmbedResp = await this.createEmbedding([qa])
		log.info(`prosessAnswer1: ${JSON.stringify(qEmbedResp)}`)
		const qEmb = qEmbedResp[0] // TODO: check if this is correct
		const topMatches = (await General.findTopKSimilar(qEmb, 2)) as QuestionData[]
		log.debug(`prosessAnswer2: ${JSON.stringify(topMatches)}`)
		return {
			data: topMatches,
			message: `Found ${topMatches.length}\n\n${topMatches
				.map((item) => `${item.question}: ${item.answer}`)
				.join("\n")}`
		}
	}

	async prosessCommand(command: string, type: string): Promise<ProsessData> {
		var qEmbedResp = await this.createEmbedding([command])
		log.debug(`prosessCommand1: ${JSON.stringify(qEmbedResp)}`)
		const qEmb = qEmbedResp[0] // TODO: check if this is correct
		const topMatches = (await General.findTopKSimilar(qEmb, 2, {
			typeEngine: getTypeGameEngine(type)
		} as CommandData)) as CommandData[]

		const sanitized: any[] = topMatches.map((match) => {
			return {
				command: match.command,
				description: match.description,
				usage: match.usage,
				type: getStringTypeGameEngine(match.typeEngine) // so bot can understand
			}
		})
		log.info(`prosessCommand2: ${JSON.stringify(sanitized)}`)

		return {
			data: topMatches,
			message: `Found ${topMatches.length}\n\n${topMatches
				.map((item) => `${item.command}: ${item.description} (${item.usage})`)
				.join("\n")}`
		}
	}

	async openChat(
		message: string,
		uid: string,
		json: boolean = false,
		remember: boolean = false,
		loop: boolean = false
	): Promise<string | ResponChatData> {
		// 1. Check if the user is in a conversation
		let conv = this.conversation.get(uid) || []
		if (conv.length === 0) {
			conv.push({ role: "system", content: openaiConfig.systemPrompt })
			log.info(`${uid} started conversation with new session`)
		} else {
			if (!remember) {
				// remove all message and start with system prompt & user question
				conv = []
				conv.push({ role: "system", content: openaiConfig.systemPrompt })
				log.info(`${uid} started conversation with reset history`)
			} else [log.info(`${uid} resume conversation with ${conv.length} messages:`, conv)]
		}

		conv.push({ role: "user", content: message })
		log.info(`${uid} try ask > ${message}`)

		// 2. answer the question and call the tool
		const first = await this.ask.chat.completions.create({
			model: config.ai.modelAsk,
			messages: conv,
			tools: openaiConfig.tools,
			temperature: 0.7,
			max_tokens: 800
		})
		log.warn(`${JSON.stringify(first)}`)

		var choice = first.choices[0]
		const msg = choice.message!

		log.info(
			`Bot response > ${msg.content} to ${uid} (Reason: ${choice.finish_reason}) (${first.choices.length}x choices?)`
		)

		var prosess: ProsessData = {
			message: `No response from AI`,
			data: null
		}

		var typeResponse = TypeResponse.None

		if (choice.finish_reason === "tool_calls" && msg.tool_calls?.length) {
			log.info(`${uid} > Bot found ${msg.tool_calls.length}x tool need to call`)

			const call = msg.tool_calls[0]
			const { name, arguments: argsStr } = call.function!
			const args = JSON.parse(argsStr ?? "{}")

			log.info(`${uid} > Bot try call tool > ${name} > ${argsStr}`)

			if (name == "find_id") {
				prosess = await this.prosessItem(args.search, args.category)
				typeResponse = TypeResponse.Item
			} else if (name == "find_document") {
				prosess = await this.prosessAnswer(args.question)
				typeResponse = TypeResponse.Answer
			} else if (name == "find_command") {
				prosess = await this.prosessCommand(args.command, args.type)
				typeResponse = TypeResponse.CommandHelper
			} else {
				log.warn(`${uid} > Tool called unkow: ${name} (${argsStr})`)
			}

			conv.push({
				role: "tool",
				tool_call_id: call.id,
				content: JSON.stringify(prosess.data) // prosess.message ||
			})
		} else {
			//log.warn(`${uid} > Bot response: ${msg.content}`)
			conv.push({ role: "assistant", content: msg.content })
		}

		// 3. Check if the bot response is finished
		if (choice.finish_reason != "stop") {
			const chatResp = await this.ask.chat.completions.create({
				model: config.ai.modelAsk,
				messages: conv
			})
			log.info(`${JSON.stringify(chatResp)}`)
			choice = chatResp.choices[0]
		}

		if(choice.finish_reason == "stop") {
			this.conversation.delete(uid)
			log.info(`${uid} > Bot response finished, delete conversation`)
		}

		var chatRaw = choice.message?.content || prosess.message
		var chatResponse = splitThinkContent(chatRaw)
		log.info(`${uid} > ${choice.finish_reason} > `, chatResponse)

		if (json) {
			return {
				uid,
				ask: message,
				message: chatResponse.response,
				think: chatResponse.think,
				type: typeResponse,
				data: prosess.data,
				totalChat: conv.length
			}
		} else {
			return chatResponse.response
		}
	}
}

const _ = new AI()
export default _
