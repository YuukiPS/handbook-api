import Logger from "@UT/logger"
import { getAllTypeItem, getTypeItem } from "@UT/response"
import config from "@UT/config"
// third party
import { isMainThread } from "worker_threads"
import OpenAI from "openai"
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions"
// database
import General from "@DB/book/general"
import { detectLang, isEmpty, LanguageGame } from "@UT/library"

const log = new Logger(`AI`)

// Configuration and tool definitions
const openaiConfig = {
	systemPrompt:
		"You are a helpful AI designed to assist users with issues related to Handbook.\n" +
		"You should ALWAYS retrieve information directly from data using tool calls before providing your own answer." +
		"\n\n" +
		"ADDITIONAL RULES FOR CATEGORIES:\n" +
		`1. ALWAYS extract category from these exact values: ${getAllTypeItem().join(
			", "
		)} (Additional info: Item=Normal, Mission/Story=Quest).\n` +
		"2. NEVER modify category names - use exact enum values." +
		"3. If category is not mentioned, use 'None' as default.\n" +
		"\n\n" +
		"When a user asks a question:\n" +
		"1. FIRST determine which tool would provide most relevant information.\n" +
		"2. Call that tool BEFORE attempting to respond yourself.\n" +
		"3. Wait for tool call results.\n" +
		"4. ONLY THEN formulate your response based on retrieved information." +
		"5. if user writing using another language, translate it to English as default.\n" +
		"6. Do not attempt to answer questions about commands, IDs, or YuukiPS documentation from memory",

	tools: [
		{
			type: "function",
			function: {
				name: "find_id",
				// Use EXCLUSIVELY for item ID lookups. Required parameter: 'search' containing item name.
				description: "Searches for game item IDs in database.",
				parameters: {
					type: "object",
					properties: {
						search: {
							type: "string",
							description:
								"EXACT name to search. Preserve full names from user input.\n" +
								"\nExamples:\n" +
								'- "give ayaka avatar" → {"search": "ayaka", "category": "avatars"}' +
								'- "ayaka avatar" → {"search": "ayaka", "category": "avatars"}' +
								'- "avatar ayaka" → {"search": "ayaka", "category": "avatars"}' +
								'- "minta kode id ayaka buat item" → {"search": "ayaka", "category": "Normal"}' +
								'- "What is the id for ayaka?" → {"search": "ayaka"}' +
								'- "give my love citlali :*" → {"search": "citlali"}' +
								'- "What is the mora id for the Genshin game?" → {"search": "mora"}'
						},
						category: {
							type: "string",
							description:
								"MUST use when type is mentioned. Match EXACTLY to: " +
								getAllTypeItem().join(", ") +
								"\nExamples:\n" +
								'- "avatar ayaka" → {"category": "avatar"}' +
								'- "ayaka avatar" → {"category": "avatar"}' +
								'- "item mora" → {"category": "normal"}'
						}
					},
					required: ["search"]
				}
			}
		}
	] as ChatCompletionTool[]
}

class AI {
	private openai!: OpenAI
	private conversation: Map<string, ChatCompletionMessageParam[]> = new Map()

	constructor() {
		if (isMainThread) {
			log.info(`This is AI main thread`)
			this.init()
		} else {
			log.info(`This is AI worker thread`)
		}
	}

	init() {
		this.openai = new OpenAI({
			apiKey: config.ai.key,
			baseURL: config.ai.baseURL
		})
		log.info(`AI initialized at ${config.ai.baseURL} | Model: ${config.ai.model}`)
	}

	/**
	 * Handles a user message, uses tool-calling to lookup IDs, and returns the assistant response.
	 */
	async openChat(message: string, uid: string, json: boolean = false): Promise<string | object> {
		// 1) Retrieve history, add system & user
		let conv = this.conversation.get(uid) || []
		if (conv.length === 0) {
			conv.push({ role: "system", content: openaiConfig.systemPrompt })
			log.info(`${uid} started conversation`)
		}

		conv.push({ role: "user", content: message })
		log.info(`${uid} (${conv.length}x) > ${message}`)

		// 2) First pass: ask model which tool to call
		const first = await this.openai.chat.completions.create({
			model: config.ai.model,
			messages: conv,
			tools: openaiConfig.tools,
			function_call: { name: "find_id" },
			temperature: 0.7,
			max_tokens: 800
		})
		const choice = first.choices[0]
		const msg = choice.message!

		//log.info(`${JSON.stringify(first)}`)
		log.info(`${uid} (${msg.role}) > ${choice.finish_reason} > `, msg.content)

		if (choice.finish_reason === "tool_calls" && msg.tool_calls?.length) {
			const call = msg.tool_calls[0]
			const { name, arguments: argsStr } = call.function!
			const args = JSON.parse(argsStr ?? "{}")

			log.info(`${uid} > Tool called: ${name}(${argsStr})`)

			// 0 - get data
			const results = await General.findItem({
				search: args.search,
				limit: 5,
				split: true,
				type: getTypeItem(args.category),
				lang: LanguageGame(await detectLang(message))
			})
			if (!results.data) {
				log.warn(`${uid} > Item ${args.search} not found in datebase`)
				return `Item ${args.search} not found in database`
			}
			/*
			// 1 - provide result info
			conv.push({
				role: "tool", // ← must be "tool"
				tool_call_id: "find_id",
				content: JSON.stringify(results.data)
			})
			// 2 - show final result
			conv.push({
				role: "system",
				content: "From the above data, reply *only* in the format `Name: ID`. No extra text. required only (ID,Name)"
			})
			// 3 - call the model again with the tool result
			const second = await this.openai.chat.completions.create({
				model: `deepseek-r1-distill-llama-8b`,
				messages: conv,
				temperature: 0.7,
				max_tokens: 800
			})
            log.info(`AI Respon: ${JSON.stringify(second)}`)
*/
			//const finalMsg = second.choices[0].message?.content || ""
			// save history
			//conv.push({ role: "assistant", content: finalMsg })
			//this.conversation.set(uid, conv)
			if (json) {
				return {
					data: results.data,
					ask: message,
					uid,
					message: msg.content,
					total: conv.length
				}
			} else {
				return `Found ${results.data.length}: ${results.data
					.map((item) => `${item.name} (${item.id})`)
					.join(", ")}`
			}
		} else {
			if (typeof msg.content === "string") {
				conv.push(msg)
				return isEmpty(msg.content) ? `No response from AI` : msg.content
			}
		}

		// if no tool was called, fall back to the raw model response
		//const fallback = msg.content || ""
		//conv.push({ role: "assistant", content: fallback })
		//this.conversation.set(uid, conv)
		this.conversation.delete(uid)
		log.info(`${uid} > No tool was called, and no fallback response available.`)
		return `No tool was called, and no fallback response available.`
	}
}

const _ = new AI()
export default _
