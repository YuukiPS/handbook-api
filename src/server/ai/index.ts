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
	ChatCompletionCreateParamsNonStreaming,
	ChatCompletionCreateParamsStreaming,
	ChatCompletionMessageParam,
	ChatCompletionTool
} from "openai/resources/chat/completions"
// database
import General from "@DB/book/general"

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
				strict: true,
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
								"1. Additional info: Item=Normal, Mission/Story=Quest).\n" +
								"2. If category is not mentioned, use 'None' as default.\n" +
								"3. NEVER modify category names - use exact enum values.\n\n" +
								"Examples:\n" +
								'- "avatar ayaka" → {"category": "avatar"}\n' +
								'- "ayaka avatar" → {"category": "avatar"}\n' +
								'- "item mora" → {"category": "normal"}',
							enum: getAllTypeItem()
						}
					},
					required: ["search", "category"],
					additionalProperties: false
				}
			}
		},
		{
			type: "function",
			function: {
				name: "find_document",
				description:
					"Use this for searches for answers to general questions, if no other function is suitable this is the last option ",
				strict: true,
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
					required: ["question"],
					additionalProperties: false
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
				strict: true,
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
					required: ["command", "type"],
					additionalProperties: false
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
		},
		{
			type: "function",
			function: {
				name: "reset_conversation",
				description: "Use this if the user asks you to reset/delete the chat/conversation, or end the question."
			}
		}
	] as ChatCompletionTool[]
}

enum ResponseType {
	None,
	Chat,
	Item,
	Answer,
	CommandHelper,
	AiHelper
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
	private readonly MAX_TOOL_TRIES_STREAM = 6
	private readonly MAX_TOOL_TRIES_NOSTREAM = 2
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

	public async createEmbedding(texts: string[]) {
		const res = await fetch(this.cfg.urlEmbed, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.key}` },
			body: JSON.stringify({ model: this.cfg.modelEmbed, input: texts })
		})
		if (!res.ok) {
			log.error(`Error creating embedding: ${res.status} ${res.statusText}`)
			return []
		}
		const json = await res.json()
		return json.embeddings || json.data.map((d: any) => d.embedding)
	}

	private async callToolByName(name: string, args: any): Promise<{ result: ProcessResult; type: ResponseType }> {
		switch (name) {
			case "find_id":
				return { result: await this.processItemSearch(args.search, args.category), type: ResponseType.Item }
			case "find_document":
			case "question":
				return { result: await this.processDocumentSearch(args.question), type: ResponseType.Answer }
			case "find_command":
				return {
					result: await this.processCommandSearch(args.command, args.type),
					type: ResponseType.CommandHelper
				}
			case "personal_information":
				return { result: await this.processAbout(args.ask), type: ResponseType.Chat }
			case "reset_conversation":
				return { result: { data: "conversation reset", message: "reset" }, type: ResponseType.Chat }
			default:
				return { result: { data: null, message: "unknown" }, type: ResponseType.None }
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
			if (!res.data?.length) return { data: null, message: `No Found ${search} ${category}` }
			return { data: res.data, message: `Found` }
		} catch (e) {
			return { data: null, message: `Error: ${e}` }
		}
	}

	private async processDocumentSearch(question: string): Promise<ProcessResult> {
		try {
			const [embed] = await this.createEmbedding([question])
			if (!embed) return { data: null, message: `error search` }

			const top = (await General.findTopKSimilar(
				embed,
				TypeDocumentation.Question,
				{},
				this.cfg.maxMatch
			)) as QuestionData[]
			if (!top.length) return { data: null, message: `No Found ${question}` }
			return { data: top, message: `Found` }
		} catch (e) {
			return { data: null, message: `Error: ${e}` }
		}
	}

	private async processCommandSearch(command: string, type: string): Promise<ProcessResult> {
		try {
			const [embed] = await this.createEmbedding([command])
			if (!embed) return { data: null, message: `error` }

			const searchParams: Partial<CommandData> = {
				typeEngine: getTypeGameEngine(type)
			}
			const top = (await General.findTopKSimilar(
				embed,
				TypeDocumentation.Command,
				searchParams,
				this.cfg.maxMatch
			)) as CommandData[]
			if (!top.length) return { data: null, message: `No Found ${command} ${type}` }
			const formatted = top.map((m) => ({
				command: m.command,
				description: m.description,
				usage: m.usage,
				type: getStringTypeGameEngine(m.typeEngine)
			}))
			return { data: formatted, message: `Found` }
		} catch (e) {
			return { data: null, message: `Error: ${e}` }
		}
	}

	async processAbout(ask: string): Promise<ProcessResult> {
		log.info(`Processing about request: ${ask}`)
		// TODO: Implement a more sophisticated response based on the ask parameter
		return {
			data: {
				name: `Konno Yuuki`,
				age: `15`,
				birthday: `May 23`,
				origin: `Sword Art Online`,
				occupation: `Maid`,
				abilities: `Assisting players, providing information, and solving problems related to the game.`,
				likes: `Helping players, exploring the world of SAO, and learning new things.`,
				dislikes: `Seeing players in trouble, and not being able to help them.`,
				interests: `Learning about the game, assisting players, and exploring new areas.`,
				quote: `I am here to assist you, my dear player. Please let me know how I can help you today!`,
				avatar: `https://pbs.twimg.com/media/CieFIHIU4AAnR7W.jpg`,
				info: `Yuuki Konno is a new player who appears in ALfeim Online in volume 7. She leads the Sleeping Knights guild and quickly becomes known as one of the strongest in the game winning 67 straight matches, earning her the title of "Absolute Sword."`
			},
			message: `Found`
		}
	}

	// Overloads for correct TS return types:
	private sendChat(
		messages: ChatCompletionMessageParam[],
		options: { stream: true; useTools?: boolean }
	): Promise<AsyncIterable<ChatCompletionChunk>>
	private sendChat(
		messages: ChatCompletionMessageParam[],
		options?: { stream?: false; useTools?: boolean }
	): Promise<ChatCompletion>

	// Unified implementation:
	private async sendChat(
		messages: ChatCompletionMessageParam[],
		{ stream = false, useTools = true }: { stream?: boolean; useTools?: boolean } = {}
	): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>> {
		// Build params conditionally
		const params: ChatCompletionCreateParamsStreaming | ChatCompletionCreateParamsNonStreaming = {
			model: this.cfg.modelAsk,
			messages,
			temperature: this.cfg.tempAsk,
			max_tokens: this.cfg.maxTokens,
			stream
		}
		if (useTools) {
			params.tools = OPENAI_CONFIG.tools
		}
		return this.client.chat.completions.create(params)
	}

	async chat(message: string, uid: string, returnJson = false, remember = true): Promise<string | ChatUserDataRsp> {
		if (!this.initialized) await this.init()
		const conv = this.getConv(uid, !remember)
		conv.push({ role: "user", content: message })

		let attempt = 0
		let data: any = null
		let type = ResponseType.None
		let lastChoice: { finish_reason: string; message: any } | null = null

		while (attempt < this.MAX_TOOL_TRIES_NOSTREAM) {
			attempt++
			const res = await this.sendChat(conv)
			const choice = res.choices[0]
			if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
				const call = choice.message.tool_calls[0]
				const args = JSON.parse(call.function?.arguments || "{}")
				const toolRes = await this.callToolByName(call.function!.name!, args)
				data = toolRes.result.data
				type = toolRes.type
				conv.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(data) })
				if (choice.message.content) conv.push({ role: "assistant", content: choice.message.content })
				continue
			} else {
				lastChoice = choice as any
				break
			}
		}

		if (!lastChoice) {
			const msg = "Sorry, I'm unable to fetch the information right now."
			conv.push({ role: "assistant", content: msg })
			return returnJson
				? {
						uid,
						ask: message,
						message: msg,
						think: "",
						type: ResponseType.None,
						data: null,
						totalChat: conv.length
				  }
				: msg
		}

		const text = lastChoice.message.content || lastChoice.message || ""
		conv.push({ role: "assistant", content: text })
		const { response, think } = this.extractThinking(text)
		return returnJson
			? { uid, ask: message, message: response, think, type, data, totalChat: conv.length }
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

		let attempt = 0
		let toolData: any = null
		let toolType = ResponseType.None
		let toolMsg = ""
		var tool = true
		var end = false
		var realend = false

		while (attempt < this.MAX_TOOL_TRIES_STREAM) {
			attempt++

			let aggregated = ""
			var callS = ""
			var idCall = ""
			var args = ""

			var stream: AsyncIterable<ChatCompletionChunk> | null = null

			if (end) {
				realend = true
			}

			try {
				stream = await this.sendChat(conv, {
					stream: true,
					useTools: tool
				})
			} catch (error) {
				log.errorNoStack(`Error in chatStream:`, error)
				const msg = "Sorry, I'm unable to fetch the information right now."
				conv.push({ role: "assistant", content: msg })
				onMessage(
					returnJson
						? {
								uid,
								ask: message,
								message: msg,
								think: "",
								type: ResponseType.None,
								data: null,
								totalChat: conv.length
						  }
						: msg
				)
				return
			}

			for await (const chunk of stream) {
				var c = chunk.choices[0]
				const delta = c?.delta
				if (delta?.content) aggregated += delta.content

				// Check if the message is a tool call
				if (delta?.tool_calls?.length) {
					const call = delta.tool_calls[0]

					args = call.function?.arguments || ""
					callS = call.function?.name || ""
					idCall = call.id || ""

					// Show only the tool call line
					var toolLine = ``
					if (!isEmpty(callS)) {
						toolLine = `call tool ${callS} with args: ${args}, try ${attempt}/${this.MAX_TOOL_TRIES_STREAM}, model: ${this.cfg.modelAsk}`
					}

					if (!isEmpty(toolLine))
						onMessage(
							returnJson
								? {
										uid,
										ask: message,
										message: toolLine,
										think: "",
										type: ResponseType.None,
										data: null,
										totalChat: conv.length
								  }
								: toolLine
						)
				}

				//log.info(`Stream chunk: ${JSON.stringify(chunk)}`)

				// As long as not a pure tool call prompt, stream content
				if (!isEmpty(aggregated)) {
					const { response, think } = this.extractThinking(aggregated)
					if (!isEmpty(response)) {
						onMessage(
							returnJson
								? {
										uid,
										ask: message,
										message: response,
										think,
										type: toolType,
										data: null,
										totalChat: conv.length
								  }
								: response
						)
						if (c.finish_reason === "stop") {
							log.info(`finish reason: ${c.finish_reason} at ${aggregated}`)
							realend = true
							//remember = false
						}
					} else {
						log.info(`T1: ${uid} > `, aggregated)
					}
				} else {
					log.info(`T2: ${uid} > `, aggregated)
				}
			}

			var noreset = true
			if (callS) {
				var final_msg = aggregated
				const toolRes = await this.callToolByName(callS, JSON.parse(args))
				//log.info(`tool debug ${JSON.stringify(toolRes)}`)
				toolData = toolRes.result.data
				toolMsg = toolRes.result.message
				toolType = toolRes.type

				if (toolMsg.includes("reset")) {
					remember = false
					noreset = false
				}

				if (!isEmpty(toolData)) {
					final_msg = `${toolMsg}: ${JSON.stringify(toolData)}`
					tool = false
					log.info(`Tool found ${callS}: ${JSON.stringify(toolData)} with message: ${toolMsg}`)
				} else {
					final_msg = `${toolMsg}, try ${attempt}/${this.MAX_TOOL_TRIES_STREAM}`
					log.info(
						`Tool not found: ${toolMsg} at ${callS}, try ${attempt}/${this.MAX_TOOL_TRIES_STREAM} at ${aggregated}`
					)
					if (attempt + 1 >= this.MAX_TOOL_TRIES_STREAM) {
						tool = false
						end = true
						//realend = true
						final_msg = `<think>Tool not found, so I ended it</think>`
					}
				}

				if (!isEmpty(final_msg) && noreset) {
					conv.push({
						role: "tool",
						tool_call_id: idCall,
						content: final_msg
					})
				}

				//continue // retry loop
				//return;
			} else {
				log.info(`no call, so end at try ${attempt}/${this.MAX_TOOL_TRIES_STREAM} at ${aggregated}`, conv)
				if (tool) {
					aggregated = `<think>I thought I didn't find anything so I ended it, by notifying the user</think>`
				} else {
					aggregated = `just end it because I found the answer, so answer it use data tool without thinking again`
					end = true
				}
				if (!realend && noreset) conv.push({ role: "assistant", content: aggregated })
				tool = false
			}

			if (realend) {
				//log.info(`Final end at try ${attempt}/${this.MAX_TOOL_TRIES_STREAM} at ${aggregated}`, conv)
				break
			}
		}

		log.info(`Final attempt ${attempt}/${this.MAX_TOOL_TRIES_STREAM}`, conv)

		if (!remember) this.convs.delete(uid)
	}
}

export default new AI()
