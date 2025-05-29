import acfg from "acfg"

export const _ = acfg({
	logger: 3, // 3 = warn
	database: {
		account: {
			// Mongo Only
			url: "mongodb://user:password@127.0.0.1:1234/melon",
			db: "melon"
		},
		cache: {
			// Redis Only
			url: "redis://:password@127.0.0.1:1234/0"
		}
	},
	ratelimit: {
		ai: {
			// base ip or global
			guest: {
				request: 1,
				time: 15 // 15 sec
			},
			// base user
			user: {
				request: 1,
				time: 3 // 3 sec
			}
		}
	},
	// foe get private data like password server
	auth: {
		api: "https://ps.yuuki.me", // url for auth
		token: "1234",
	},
	ai: {
		server: {
			name: "ollama cloud",
			default: true, // if false use backup server
			type: 1, // 1=Ollama, 2.LM Studio
			url: "https://xxx",
			key: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
			model: {
				ask: {
					id: "qwen3:0.6b", // better stream use qwen3:1.7b+
					temperature: 0.7,
					max_tokens: 800
				},
				embed: {
					id: "nomic-embed-text",
					temperature: 0.7,
					max_tokens: 800
				}
			}
		},
		maxQueus: 4, // users simultaneously use ai
		maxHistory: 10, // max history for each user
		maxSearch: 5, // max search item found it
		maxMatch: 2 // max embeddings search
	},
	bot: {
		discord: {
			token: "",
			client_id: "",
			client_secret: "",
			guild_id: "",
			permission: {
				admin: "",
				mod: [""],
				guest: [""],
				member: [""]
			},
			webhook: {
				notification: {
					id: "",
					token: ""
				}
			},
			ai: {
				channel: [""]
			}
		}
	},
	profile: [
		{
			name: "prod",
			title: "Yuuki Book API - PROD",
			url: {
				public: "https://book-api.yuuki.me",
				private: "http://2.0.0.101:10040"
			},
			port: {
				public: 443,
				private: 10040
			},
			autoTesting: false, // TODO: maybe just move to (run)
			run: {
				discord: true,
				ai: true
			}
		},
		{
			name: "dev",
			title: "Yuuki Book API - DEV",
			url: {
				public: "http://2.0.0.101:50040",
				private: "http://2.0.0.101:50040"
			},
			port: {
				public: 50040,
				private: 50040
			},
			autoTesting: true,
			run: {
				discord: true,
				ai: true
			}
		}
	]
})

const argv = require("minimist")(process.argv.slice(2))

/**
 * Get Profile Web
 */
export function GetProfile(name: string = "") {
	var set_env = argv.env || "prod"
	if (name != "") {
		set_env = name
	}
	let config_tmp = _.profile.find((profile) => profile.name === set_env)
	if (config_tmp == undefined) {
		process.exit(1)
	}
	return config_tmp
}

/**
 * Get URL Domain Public
 * @returns {URL}
 */
export function GetDomain(): URL {
	return new URL(GetProfile().url.public)
}
export const domainPublic = GetProfile("prod").url.public

/**
 * AI‐server configuration shape
 */
interface AiServerConfig {
	name: string
	default: boolean
	type: number
	url: string
	key: string
	model: {
		ask: {
			id: string
			temperature: number
			max_tokens: number
		}
		embed: {
			id: string
			temperature: number
			max_tokens: number
		}
	}
}

/**
 * Get the AI server marked as default.
 * @returns The AiServerConfig with default=true, or undefined if none.
 */
export function GetAiServer(): AiServerConfig | undefined {
	// normalize to an array in case you ever switch to multiple servers
	const servers = Array.isArray(_.ai.server) ? _.ai.server : [_.ai.server]

	return servers.find((s) => s.default)
}

export default _
