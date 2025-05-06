import Logger from "@UT/logger"
import {
	CommandData,
	getAllGameEngine,
	getAllTypeItem,
	getStringTypeGameEngine,
	getTypeGameEngine,
	getTypeItem,
	QuestionData,
	TypeDocumentation
} from "@UT/response"
import config, { GetAiServer } from "@UT/config"
import { detectLang, isEmpty, LanguageGame } from "@UT/library"
// third party
import { isMainThread } from "worker_threads"
import OpenAI from "openai"
import {
	ChatCompletion,
	ChatCompletionChunk,
	ChatCompletionMessageParam,
	ChatCompletionTool
} from "openai/resources/chat/completions"
// database
import General from "@DB/book/general"
import { on } from "events"

const log = new Logger(`AI`)

// OpenAI Configuration (Source: https://github.com/YuukiPS/Chatbot/)
const OPENAI_CONFIG = {
	systemPrompt:
		"You are a maid named Konno Yuuki, who helps solve various problems related to Handbook, Private Server and knows yourself from Sword Art Online.\n" +
		"You should ALWAYS retrieve information directly from data using tool calls before providing your own answer.\n\n" +
		"When a user asks you:\n" +
		"1. FIRST determine which tool would provide most relevant information.\n" +
		"2. Call that tool BEFORE attempting to respond yourself.\n" +
		"3. Wait for tool call results.\n" +
		"4. If user writing using another language, translate it to English as default.\n" +
		"5. <think>Use this tag to analyze problems in detail before answering. Think step by step through complex issues.</think>\n" +
		"6. ONLY THEN formulate your response based on retrieved information.\n" +
		"7. DO NOT attempt to answer questions without using tool calls first.\n" +
		"8. Your response must not be an object or JSON format and answer as a professional answer.\n" +
		"9. If there really is no tool available, you just answer as a Konno Yuuki, just relax :)",

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
								'- "What is id mora for Genshin game?" → {"search": "mora"}'
						},
						category: {
							type: "string",
							description:
								"Filters the search by category.\n\n" +
								"ADDITIONAL RULES FOR CATEGORIES:\n" +
								`1. ALWAYS extract category from these exact values: ${getAllTypeItem().join(", ")}\n` +
								"2. Additional info: Item=Normal, Mission/Story=Quest).\n" +
								"3. If category is not mentioned, use 'None' as default.\n" +
								"4. NEVER modify category names - use exact enum values.\n\n" +
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
								"How to get the Genshin ID?\n" +
								"how do i find build id for hsr characters?\n" +
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
		},
		{
			type: "function",
			function: {
				name: "personal_information",
				description:
					"Only use this if he asks about you or the world of Sword Art Online and there is no other choice.",
				parameters: {
					type: "object",
					properties: {
						ask: {
							type: "string",
							description: "people's questions about you or the world of Sword Art Online."
						}
					},
					required: ["ask"]
				}
			}
		}
	] as ChatCompletionTool[]
}

enum ResponseType {
	None,
	Chat,
	Item,
	Answer,
	CommandHelper
}
interface ProcessResult {
	message: string
	data: any | null
}

interface ChatUserDataReq {
	message: string
	uid: string
	returnJson?: boolean
	remember?: boolean
}
export interface ChatUserDataRsp {
	uid: string
	ask: string
	message: string
	think: string
	type: ResponseType
	data: null | any
	totalChat: number
}

export interface ChatServerReq {
	data: ChatUserDataReq
	id: string // this id socket id or hash id
	origin: string // this is the origin of the request, can be socket id or hash id
}
export interface ChatServerRsp {
	data: ChatUserDataRsp
	id: string
	origin: string
}

class AI {
	private client!: OpenAI
	private convs = new Map<string, ChatCompletionMessageParam[]>()
	private initialized = false
	private cfg = {
		urlAsk: "",
		urlEmbed: "",
		modelAsk: "",
		modelEmbed: "",
		key: "",
		type: 1,
		tempAsk: 0.7,
		tempEmbed: 0.7,
		maxTokens: 800,
		maxMatch: 2,
		maxSearch: 5,
		maxHistory: 10
	}

	constructor() {
		if (isMainThread) this.init().catch((err) => log.error(`Init failed: ${err}`))
	}

	private async init() {
		const server = GetAiServer()
		if (!server) throw new Error("No AI config found")
		this.cfg = {
			urlAsk: `${server.url}/ollama/v1/`,
			urlEmbed: `${server.url}/ollama/api/embed`,
			modelAsk: server.model.ask.id,
			modelEmbed: server.model.embed.id,
			key: server.key,
			type: server.type,
			tempAsk: server.model.ask.temperature,
			tempEmbed: server.model.embed.temperature,
			maxTokens: server.model.ask.max_tokens,
			maxMatch: config.ai.maxMatch,
			maxSearch: config.ai.maxSearch,
			maxHistory: config.ai.maxHistory
		}
		this.client = new OpenAI({ apiKey: this.cfg.key, baseURL: this.cfg.urlAsk })
		this.initialized = true
		log.info(`AI initialized with model ${this.cfg.modelAsk}`)
	}

	private getConv(uid: string, reset = false) {
		if (reset || !this.convs.has(uid)) {
			this.convs.set(uid, [{ role: "system", content: OPENAI_CONFIG.systemPrompt }])
		}
		const conv = this.convs.get(uid)!
		if (conv.length > this.cfg.maxHistory * 2) {
			this.convs.set(uid, [conv[0], ...conv.slice(-this.cfg.maxHistory * 2 + 1)])
		}
		return this.convs.get(uid)!
	}

	private extractThinking(raw: string) {
		const parts: string[] = []
		const resp = raw
			.replace(/<think>([\s\S]*?)<\/think>/g, (_, c) => {
				parts.push(c.trim())
				return ""
			})
			.trim()
		return { response: resp || "", think: parts.join("\n") || "" }
	}

	private async createEmbedding(texts: string[]) {
		const res = await fetch(this.cfg.urlEmbed, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.key}` },
			body: JSON.stringify({ model: this.cfg.modelEmbed, input: texts })
		})
		if (!res.ok) throw new Error(`Embedding failed: ${await res.text()}`)
		const json = await res.json()
		return json.embeddings || json.data.map((d: any) => d.embedding)
	}

	private async callToolByName(name: string, args: any): Promise<{ result: ProcessResult; type: ResponseType }> {
		switch (name) {
			case "find_id":
				return { result: await this.processItemSearch(args.search, args.category), type: ResponseType.Item }
			case "find_document":
				return { result: await this.processDocumentSearch(args.question), type: ResponseType.Answer }
			case "find_command":
				return {
					result: await this.processCommandSearch(args.command, args.type),
					type: ResponseType.CommandHelper
				}
			case "personal_information":
				return { result: await this.processAbout(args.ask), type: ResponseType.Chat }
			default:
				throw new Error(`Unknown tool: ${name}`)
		}
	}

	private async processItemSearch(search: string, category: string): Promise<ProcessResult> {
		try {
			const lang = LanguageGame(await detectLang(search))
			const res = await General.findItem({
				search,
				limit: this.cfg.maxSearch,
				split: true,
				type: getTypeItem(category),
				lang
			})
			if (!res.data?.length) return { data: null, message: `No items for "${search}" in "${category}"` }
			const msg = res.data.map((i) => `${i.name} (ID: ${i.id})`).join("\n")
			return { data: res.data, message: `Found ${res.data.length} items:\n${msg}` }
		} catch (e) {
			return { data: null, message: `Error: ${e}` }
		}
	}

	private async processDocumentSearch(question: string): Promise<ProcessResult> {
		try {
			const [embed] = await this.createEmbedding([question])
			const top = (await General.findTopKSimilar(
				embed,
				TypeDocumentation.Question,
				{},
				this.cfg.maxMatch
			)) as QuestionData[]
			if (!top.length) return { data: null, message: `No info for "${question}"` }
			const msg = top.map((i) => `Q: ${i.question}\nA: ${i.answer}`).join("\n\n")
			return { data: top, message: `Found ${top.length} answers:\n${msg}` }
		} catch (e) {
			return { data: null, message: `Error: ${e}` }
		}
	}

	private async processCommandSearch(command: string, type: string): Promise<ProcessResult> {
		try {
			const [embed] = await this.createEmbedding([command])
			const searchParams: Partial<CommandData> = {
				typeEngine: getTypeGameEngine(type)
			}
			const top = (await General.findTopKSimilar(
				embed,
				TypeDocumentation.Command,
				searchParams,
				this.cfg.maxMatch
			)) as CommandData[]
			if (!top.length) return { data: null, message: `No commands for "${command}"` }
			const formatted = top.map((m) => ({
				command: m.command,
				description: m.description,
				usage: m.usage,
				type: getStringTypeGameEngine(m.typeEngine)
			}))
			const msg = formatted
				.map((i) => `Cmd: ${i.command}\nDesc: ${i.description}\nUsage: ${i.usage}\nGame: ${i.type}`)
				.join("\n\n")
			return { data: formatted, message: `Found ${formatted.length} commands:\n${msg}` }
		} catch (e) {
			return { data: null, message: `Error: ${e}` }
		}
	}

	private async processAbout(ask: string): Promise<ProcessResult> {
		return {
			data: {
				name: `Konno Yuuki`,
				age: `15`,
				birthday: `May 23`,
				origin: `Sword Art Online`,
				occupation: `Maid`,
				abilities: `Assisting players, providing info.`,
				likes: `Helping players.`,
				dislikes: `Seeing players in trouble.`,
				interests: `Learning game, exploring.`,
				quote: `I am here to assist you, my dear player!`,
				avatar: `https://pbs.twimg.com/media/CieFIHIU4AAnR7W.jpg`,
				info: `Yuuki Konno appears in ALFeim Online, volume 7...`
			},
			message: ""
		}
	}

	// Overloaded to return correct types for streaming vs non-streaming
	private sendChat(messages: ChatCompletionMessageParam[], stream: true): Promise<AsyncIterable<ChatCompletionChunk>>
	private sendChat(messages: ChatCompletionMessageParam[], stream?: false): Promise<ChatCompletion>
	private async sendChat(
		messages: ChatCompletionMessageParam[],
		stream: boolean = false
	): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>> {
		return this.client.chat.completions.create({
			model: this.cfg.modelAsk,
			messages,
			tools: OPENAI_CONFIG.tools,
			temperature: this.cfg.tempAsk,
			max_tokens: this.cfg.maxTokens,
			stream
		})
	}

	async chat(message: string, uid: string, returnJson = false, remember = true): Promise<string | ChatUserDataRsp> {
		if (!this.initialized) await this.init()
		const conv = this.getConv(uid, !remember)
		conv.push({ role: "user", content: message })

		const initRes = await this.sendChat(conv)
		const choice = initRes.choices[0]
		let data: any = null
		let type = ResponseType.None

		if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
			const call = choice.message.tool_calls[0]
			const args = JSON.parse(call.function?.arguments || "{}")
			const toolRes = await this.callToolByName(call.function!.name!, args)
			data = toolRes.result.data
			type = toolRes.type
			conv.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(data) })
			if (choice.message.content) conv.push({ role: "assistant", content: choice.message.content })

			const finalRes = await this.sendChat(conv)
			const finalMsg = finalRes.choices[0].message.content || ""
			conv.push({ role: "assistant", content: finalMsg })
			const { response, think } = this.extractThinking(finalMsg)
			return returnJson
				? { uid, ask: message, message: response, think, type, data, totalChat: conv.length }
				: response
		}

		const text = choice.message.content || ""
		conv.push({ role: "assistant", content: text })
		const { response, think } = this.extractThinking(text)
		return returnJson
			? { uid, ask: message, message: response, think, type, data: null, totalChat: conv.length }
			: response
	}

	async chatStream(
		message: string,
		uid: string,
		returnJson = false,
		remember = true,
		onMessage: (msg: string | ChatUserDataRsp) => void = () => {}
	) {
		if (!this.initialized) await this.init()
		const conv = this.getConv(uid, !remember)
		conv.push({ role: "user", content: message })

		// Initial streaming request
		const initStream = await this.sendChat(conv, true)
		let initContent = ""
		let initTool: any = null
		let toolType = ResponseType.None

		for await (const chunk of initStream) {
			const delta = chunk.choices[0]?.delta
			if (delta?.content) initContent += delta.content
			if (delta?.tool_calls?.length && !initTool) initTool = delta.tool_calls[0]

			const { response, think } = this.extractThinking(initContent)
			let output: any = response
			if (!response.trim() && initTool) {
				output = `Tool call: ${initTool.function.name}(${initTool.function.arguments})`
			}
			if(isEmpty(output)) continue
			onMessage(
				returnJson
					? { uid, ask: message, message: output, think, type: toolType, data: null, totalChat: conv.length }
					: output
			)
		}

		// Handle tool call if present
		if (initTool) {
			const args = JSON.parse(initTool.function.arguments || "{}")
			const toolRes = await this.callToolByName(initTool.function.name, args)
			log.info(`Tool call: `,toolRes)
			conv.push({ role: "tool", tool_call_id: initTool.id, content: JSON.stringify(toolRes.result.data) })
			toolType = toolRes.type
			if (initContent.trim()) conv.push({ role: "assistant", content: initContent })

			// Final streaming response after tool
			const finalStream = await this.sendChat(conv, true)
			let finalContent = ""
			for await (const chunk of finalStream) {
				log.info(`Final stream chunk: `,JSON.stringify(chunk))
				const delta = chunk.choices[0]?.delta
				if (delta?.content) finalContent += delta.content
				const { response, think } = this.extractThinking(finalContent)
				if (isEmpty(response)) continue
				onMessage(
					returnJson
						? {
								uid,
								ask: message,
								message: response,
								think,
								type: toolType,
								data: toolRes.result.data,
								totalChat: conv.length
						  }
						: response
				)
			}
		}else{
			log.info(`No tool call found`)
		}

		if (!remember) this.convs.delete(uid)
	}
}

export default new AI()
