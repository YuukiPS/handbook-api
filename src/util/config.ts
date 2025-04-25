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
	notification: {
		id_channel: "",
		token: ""
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
			autoTesting: false
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
			autoTesting: true
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

export default _
