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
import { detectLang, LanguageGame } from "@UT/library"
// third party
import { isMainThread } from "worker_threads"
import OpenAI from "openai"
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions"
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

/**
 * Type definitions
 */
enum ResponseType {
	None = 0,
	Chat = 1, // normal chat without list menu
	Item = 2, // need call sub item
	Answer = 3,
	CommandHelper = 4
}

interface ProcessResult {
	message: string
	data: null | any
}
interface MessageContent {
	response: string
	think: string
}

interface ChatUserDataReq {
	message: string
	uid: string
	returnJson?: boolean
	remember?: boolean
}
interface ChatUserDataRsp {
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

/**
 * Extract thinking content from AI response
 * @param message - The raw message from the AI
 * @returns Object containing visible response and thinking content
 */
function extractThinkingContent(message: string): MessageContent {
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
		think: thinkParts.join("\n")
	}
}

/**
 * Main AI class
 * Handles conversation management, tool calls, and embeddings
 */
class AI {
	private openaiClient!: OpenAI
	private conversations: Map<string, ChatCompletionMessageParam[]> = new Map()
	private initialized: boolean = false

	private urlAsk: string = ""
	private urlEmbed: string = ""
	private modelAsk: string = ""
	private modelEmbed: string = ""
	private key: string = ""
	private type: number = 1 // 1 = Ollama, 2 = LM-Studio
	private temperatureAsk: number = 0.7
	private temperatureEmbed: number = 0.7
	private maxTokensAsk: number = 800
	private maxTokensEmbed: number = 800
	private maxMatch: number = 2
	private maxSearch: number = 5
	private maxHistory: number = 10

	constructor() {
		if (isMainThread) {
			log.info(`AI system initializing on main thread`)
			this.init()
		} else {
			log.info(`AI running on worker thread`)
		}
	}

	/**
	 * Initialize the OpenAI client and embeddings
	 */
	async init(): Promise<void> {
		var configAi = GetAiServer()
		if (!configAi) {
			log.error(`No AI server configuration found`)
			return
		}
		try {
			this.urlAsk = `${configAi.url}/ollama/v1/`
			this.urlEmbed = `${configAi.url}/ollama/api/embed`
			this.modelAsk = configAi.model.ask.id
			this.modelEmbed = configAi.model.embed.id
			this.key = configAi.key
			this.type = configAi.type
			this.temperatureAsk = configAi.model.ask.temperature
			this.temperatureEmbed = configAi.model.embed.temperature
			this.maxTokensAsk = configAi.model.ask.max_tokens
			this.maxTokensEmbed = configAi.model.embed.max_tokens
			this.maxMatch = config.ai.maxMatch
			this.maxSearch = config.ai.maxSearch
			this.maxHistory = config.ai.maxHistory

			this.openaiClient = new OpenAI({
				apiKey: this.key,
				baseURL: this.urlAsk
			})

			log.info(`AI initialized at ${configAi.url} | Key: ${this.key}`)
			log.info(`Model Ask: ${this.modelAsk} | URL: ${this.urlAsk}`)
			log.info(`Model Embed: ${this.modelEmbed} | URL: ${this.urlEmbed}`)

			this.initialized = true
			log.info(`AI system ready`)
		} catch (error) {
			log.error(`AI initialization failed: ${error}`)
			throw new Error(`Failed to initialize AI: ${error}`)
		}
	}

	/**
	 * Embed a dataset of questions or commands
	 * @param items - Array of QuestionData or CommandData to embed
	 */
	async embedDataset(items: (QuestionData | CommandData)[]): Promise<void> {
		if (!this.initialized) {
			await this.init()
		}

		try {
			const texts = items
				.map((item) =>
					"question" in item
						? `${item.question} ${item.answer}`
						: `${item.command} ${item.description} ${item.usage} ${item.type}`
				)
				.filter(Boolean)

			log.info(`Embedding ${texts.length} items`)

			const response = await fetch(this.urlEmbed, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.key}`
				},
				body: JSON.stringify({ model: this.modelEmbed, input: texts })
			})

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(`Embedding API error ${response.status}: ${errorText}`)
			}

			const json = await response.json()
			const embeddings = json.embeddings || json.data?.map((d: any) => d.embedding) || []

			if (embeddings.length !== items.length) {
				throw new Error(`Expected ${items.length} embeddings, got ${embeddings.length}`)
			}

			embeddings.forEach((vec: number[], i: number) => {
				;(items[i] as QuestionData | CommandData).embedding = vec
			})

			log.info(`✅ Successfully embedded ${items.length} items`)
		} catch (error) {
			log.error(`Error embedding dataset: ${error}`)
			throw error
		}
	}

	/**
	 * Create embeddings for text inputs
	 * @param texts - Array of texts to embed
	 * @returns Array of embedding vectors
	 */
	async createEmbedding(texts: string[]): Promise<number[][]> {
		if (!this.initialized) {
			await this.init()
		}

		try {
			log.debug(`Creating embeddings for ${texts.length} texts`)

			const response = await fetch(this.urlEmbed, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.key}`
				},
				body: JSON.stringify({ model: this.urlEmbed, input: texts })
			})

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(`Embedding API error ${response.status}: ${errorText}`)
			}

			const json = await response.json()

			if (!Array.isArray(json.embeddings)) {
				throw new Error(`Unexpected embedding response format`)
			}

			return json.embeddings
		} catch (error) {
			log.error(`Error creating embeddings: ${error}`)
			throw error
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
			message: ``
		}
	}

	/**
	 * Process item search request
	 * @param search - Search query
	 * @param category - Item category
	 * @returns Search results
	 */
	async processItemSearch(search: string, category: string): Promise<ProcessResult> {
		try {
			const detectedLang = await detectLang(search)
			const language = LanguageGame(detectedLang)

			const results = await General.findItem({
				search: search,
				limit: this.maxSearch,
				split: true,
				type: getTypeItem(category),
				lang: language
			})
			log.info(`Item search results: ${JSON.stringify(results)}`)

			if (!results.data || results.data.length === 0) {
				return {
					data: null,
					message: `No items found matching "${search}" in category "${category || "any"}"`
				}
			}

			const formattedResults = results.data.map((item) => `${item.name} (ID: ${item.id})`).join("\n")

			return {
				data: results.data,
				message: `Found ${results.data.length} items:\n${formattedResults}`
			}
		} catch (error) {
			log.error(`Error processing item search: ${error}`)
			return {
				data: null,
				message: `Error searching for items: ${error}`
			}
		}
	}

	/**
	 * Process document/answer search
	 * @param question - Question to search for
	 * @returns Top matching answers
	 */
	async processDocumentSearch(question: string): Promise<ProcessResult> {
		try {
			log.info(`Processing document search for: ${question}`)

			const embeddings = await this.createEmbedding([question])
			const questionEmbedding = embeddings[0]

			const topMatches = (await General.findTopKSimilar(
				questionEmbedding,
				TypeDocumentation.Question,
				{},
				this.maxMatch
			)) as QuestionData[]
			log.info(`Found matches: ${JSON.stringify(topMatches)}`)

			if (!topMatches || topMatches.length === 0) {
				return {
					data: null,
					message: `No relevant information found for "${question}"`
				}
			}

			const formattedMatches = topMatches.map((item) => ({
				question: item.question,
				answer: item.answer
			}))

			return {
				data: formattedMatches,
				message: `Found ${topMatches.length} relevant answers:\n\n${topMatches
					.map((item) => `Q: ${item.question}\nA: ${item.answer}`)
					.join("\n\n")}`
			}
		} catch (error) {
			log.error(`Error processing document search: ${error}`)
			return {
				data: null,
				message: `Error searching documentation: ${error}`
			}
		}
	}

	/**
	 * Process command search
	 * @param command - Command to search for
	 * @param type - Game type
	 * @returns Matching commands
	 */
	async processCommandSearch(command: string, type: string): Promise<ProcessResult> {
		try {
			log.info(`Processing command search: "${command}" for game type "${type}"`)

			const embeddings = await this.createEmbedding([command])
			log.info(`Command embeddings: ${JSON.stringify(embeddings)}`)

			const commandEmbedding = embeddings[0]

			const searchParams: Partial<CommandData> = {
				typeEngine: getTypeGameEngine(type)
			}

			const topMatches = (await General.findTopKSimilar(
				commandEmbedding,
				TypeDocumentation.Command,
				searchParams,
				this.maxMatch
			)) as CommandData[]
			log.info(`Found command matches: ${JSON.stringify(topMatches)}`)

			if (!topMatches || topMatches.length === 0) {
				return {
					data: null,
					message: `No commands found matching "${command}" for game type "${type || "any"}"`
				}
			}

			// Format data for easier consumption by the AI
			const sanitizedMatches = topMatches.map((match) => ({
				command: match.command,
				description: match.description,
				usage: match.usage,
				type: getStringTypeGameEngine(match.typeEngine)
			}))

			return {
				data: sanitizedMatches,
				message: `Found ${topMatches.length} commands:\n\n${sanitizedMatches
					.map(
						(item) =>
							`Command: ${item.command}\nDescription: ${item.description}\nUsage: ${item.usage}\nGame: ${item.type}`
					)
					.join("\n\n")}`
			}
		} catch (error) {
			log.error(`Error processing command search: ${error}`)
			return {
				data: null,
				message: `Error searching for commands: ${error}`
			}
		}
	}

	/**
	 * Manage conversation history
	 * @param uid - User ID
	 * @param reset - Whether to reset the conversation
	 * @returns Current conversation messages
	 */
	private getConversation(uid: string, reset: boolean = false): ChatCompletionMessageParam[] {
		if (reset || !this.conversations.has(uid)) {
			const newConversation: ChatCompletionMessageParam[] = [
				{ role: "system", content: OPENAI_CONFIG.systemPrompt }
			]
			this.conversations.set(uid, newConversation)
			log.info(`${uid}: ${reset ? "Reset" : "Started new"} conversation`)
			return newConversation
		}

		const conversation = this.conversations.get(uid)!

		// Trim conversation if it gets too long
		if (conversation.length > this.maxHistory * 2) {
			// Keep system prompt and trim oldest messages
			const trimmed = [conversation[0], ...conversation.slice(-(this.maxHistory * 2 - 1))]
			this.conversations.set(uid, trimmed)
			log.info(`${uid}: Trimmed conversation history from ${conversation.length} to ${trimmed.length} messages`)
			return trimmed
		}

		return conversation
	}

	/**
	 * Process AI chat
	 * @param message - User message
	 * @param uid - User ID
	 * @param returnJson - Whether to return JSON response
	 * @param remember - Whether to remember conversation history
	 * @returns Chat response
	 */
	async chat(
		message: string,
		uid: string,
		returnJson: boolean = false,
		remember: boolean = true
	): Promise<string | ChatUserDataRsp> {
		if (!this.initialized) {
			await this.init()
		}

		try {
			// Get or create conversation
			const conversation = this.getConversation(uid, !remember)

			// Add user message
			conversation.push({ role: "user", content: message })
			log.info(`${uid} > User: ${message}`)

			// Send initial request to get tool calls
			const initialResponse = await this.openaiClient.chat.completions.create({
				model: this.modelAsk,
				messages: conversation,
				tools: OPENAI_CONFIG.tools,
				temperature: this.temperatureAsk,
				max_tokens: this.maxTokensAsk
			})

			const initialChoice = initialResponse.choices[0]
			const initialMessage = initialChoice.message

			log.info(
				`${uid} > Initial AI response: ${initialMessage.content || "[No content]"} (Finish reason: ${
					initialChoice.finish_reason
				})`
			)

			let processResult: ProcessResult = {
				message: "No tool calls were made",
				data: null
			}

			let responseType = ResponseType.None

			// Handle tool calls if present
			if (initialChoice.finish_reason === "tool_calls" && initialMessage.tool_calls?.length) {
				const toolCall = initialMessage.tool_calls[0]
				const { name, arguments: argsStr } = toolCall.function!
				const args = JSON.parse(argsStr || "{}")

				log.info(`${uid} > Tool call: ${name}(${argsStr})`)

				// Process different tool types
				switch (name) {
					case "find_id":
						processResult = await this.processItemSearch(args.search, args.category)
						responseType = ResponseType.Item
						break
					case "find_document":
						processResult = await this.processDocumentSearch(args.question)
						responseType = ResponseType.Answer
						break
					case "find_command":
						processResult = await this.processCommandSearch(args.command, args.type)
						responseType = ResponseType.CommandHelper
						break
					case "personal_information":
						processResult = await this.processAbout(args.ask)
						responseType = ResponseType.Chat
						break
					default:
						log.warn(`${uid} > Unknown tool called: ${name}`)
				}

				// Add tool response to conversation
				conversation.push({
					role: "tool",
					tool_call_id: toolCall.id,
					content: JSON.stringify(processResult.data)
				})

				// Add assistant response to conversation
				if (initialMessage.content) {
					conversation.push({
						role: "assistant",
						content: initialMessage.content
					})
				}
			} else if (initialMessage.content) {
				// Add assistant response if no tool calls
				conversation.push({
					role: "assistant",
					content: initialMessage.content
				})
			}

			// Get final response if needed
			let finalChoice = initialChoice
			let finalMessage = initialMessage

			if (initialChoice.finish_reason !== "stop") {
				log.info(`${uid} > Getting final response...`)

				const finalResponse = await this.openaiClient.chat.completions.create({
					model: this.modelAsk,
					messages: conversation,
					temperature: this.temperatureAsk,
					max_tokens: this.maxTokensAsk,
				})

				finalChoice = finalResponse.choices[0]
				finalMessage = finalChoice.message

				log.info(
					`${uid} > Final AI response: ${finalMessage.content || "[No content]"} (Finish reason: ${
						finalChoice.finish_reason
					})`
				)

				// Add final response to conversation if different
				if (finalMessage.content && finalMessage.content !== initialMessage.content) {
					conversation.push({
						role: "assistant",
						content: finalMessage.content
					})
				}
			}

			// Clean up if finished
			if (finalChoice.finish_reason === "stop") {
				// Keep conversation in memory unless explicitly requested
				if (!remember) {
					this.conversations.delete(uid)
					log.info(`${uid} > Conversation ended and deleted`)
				}
			}

			// Process final response
			const finalContent = finalMessage.content || processResult.message
			const { response, think } = extractThinkingContent(finalContent)

			log.info(`${uid} > Response processed: ${response.substring(0, 100)}${response.length > 100 ? "..." : ""}`)
			if (think) {
				log.info(`${uid} > Thinking: ${think.substring(0, 100)}${think.length > 100 ? "..." : ""}`)
			}

			// Return response
			if (returnJson) {
				return {
					uid,
					ask: message,
					message: response,
					think: think,
					type: responseType,
					data: processResult.data,
					totalChat: conversation.length
				}
			} else {
				return response
			}
		} catch (error) {
			log.error(`Error in chat: ${error}`)

			const errorMessage = `Sorry, I encountered an error while processing your request: ${error}`

			if (returnJson) {
				return {
					uid,
					ask: message,
					message: errorMessage,
					think: `Error: ${error}`,
					type: ResponseType.None,
					data: null,
					totalChat: this.conversations.has(uid) ? this.conversations.get(uid)!.length : 0
				}
			} else {
				return errorMessage
			}
		}
	}
}

// Create singleton instance
const aiInstance = new AI()
export default aiInstance
