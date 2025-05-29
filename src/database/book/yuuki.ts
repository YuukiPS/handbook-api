import Logger from "@UT/logger"
import { statusCodes } from "@UT/constants"
import { getTimeV2, isEmpty } from "@UT/library"
import { AccountDB, CommonDataRsp, PlayerBasic, PrivateServerInfo, Prop, PropRsp } from "@UT/response"
import axios from "axios"
import Config from "@UT/config"

// YuukiPS Datebase for acccount management (Read only?)
import DBMongo from "@DB/client/mongo"

const log = new Logger("Yuuki")

export const _ = {
	// YuukiPS GM Command for LC/TS
	SyncSRData: async function (
		url: string, // Server URL
		uid: number, // Player UID
		password: string, // Password server
		data: any, // Data to sync
		set_timeout = 30
	): Promise<{
		message: string
		retcode: number
	}> {
		try {
            log.info(`SyncSRData: ${url}api/sync with uid: ${uid} and password: ${password}`)
			const response = await axios.post(`${url}api/sync`, data,{
                params: {
                    uid,
                    password
                },
				timeout: 1000 * set_timeout
			})
			const d = response.data
            log.info(`SyncSRData response: `, d)
			return {
				message: d.message,
				retcode: d.retcode
			}
		} catch (error) {
			log.error(`SERVER_GC_ERROR_GM`, error)
			return {
				message: `api_cmd_player_unknown`,
				retcode: statusCodes.error.FAIL
			}
		}
	},
	getServerProfile: async function (server_name: string): Promise<CommonDataRsp<PrivateServerInfo>> {
		try {
			var data = await axios.request<CommonDataRsp<PrivateServerInfo>>({
				url: `${Config.auth.api}/api/server/config/${server_name}`,
				method: "POST",
				data: {
					token: Config.auth.token // if have token, show data private like api password server
				}
			})
			if (data.data) {
				return data.data
			} else {
				log.info(`getServerProfile: `, data)
				return {
					message: "api_server_profile_notfound",
					retcode: statusCodes.error.FAIL,
					data: null
				}
			}
		} catch (error) {
			log.errorNoStack("error getServerProfile", error)
			return {
				message: "api_server_profile_failed1",
				retcode: statusCodes.error.CANCEL,
				data: null
			}
		}
	},
	// Read only
	GET_ACCOUNT_BY_USERNAME: async function (i: string) {
		return this.getAccountByField({ username: i })
	},
	GET_ACCOUNT_BY_UID: async function (i: string) {
		return this.getAccountByField({ _id: i })
	},
	GET_ACCOUNT_BY_ID_DISCORD: async function (i: string) {
		return this.getAccountByField({ "third_login.discord": i })
	},
	GET_ACCOUNT_BY_TOKEN_INGAME: async function (i: string) {
		return this.getAccountByField({ token: i })
	},
	GET_ACCOUNT_BY_TOKEN_WEB: async function (i: string) {
		return this.getAccountByField({ sessionKey: i })
	},
	GET_ACCOUNT_BY_EMAIL: async function (i: string) {
		return this.getAccountByField({ email: i })
	},
	getAccountByField: async function (fields: { [key: string]: string }): Promise<CommonDataRsp<AccountDB>> {
		try {
			const cAccount = DBMongo.getCollection<AccountDB>("accounts")
			if (!cAccount) {
				return {
					message: `api_db_nofound_collection`,
					retcode: statusCodes.error.CANCEL,
					data: null
				}
			}
			const query = {
				$or: Object.entries(fields).map(([field, value]) => ({ [field]: value }))
			}
			let account = await cAccount.findOne(query)
			if (account) {
				return {
					message: `api_db_account_ok`,
					retcode: statusCodes.success.RETCODE,
					data: account
				}
			} else {
				return {
					message: `api_db_account_notfound`,
					retcode: statusCodes.error.FAIL,
					data: null
				}
			}
		} catch (error) {
			log.errorNoStack("error getAccountByField", error)
			return {
				message: "api_db_account_failed1",
				retcode: statusCodes.error.CANCEL,
				data: null
			}
		}
	},
	GET_BASIC_BY_UID_PLAYER: async function (UidPalayer: string, server_name: string) {
		return this.getPlayerBasicByField("uid", parseInt(UidPalayer), server_name)
	},
	GET_BASIC_BY_UID_ACCOUNT: async function (uidAccount: string, server_name: string) {
		return this.getPlayerBasicByField("accountId", uidAccount, server_name)
	},
	GET_BASIC_BY_EMAIL_ACCOUNT: async function (email: string, server_name: string) {
		return this.getPlayerBasicByField("email", email, server_name)
	},
	getPlayerBasicByField: async function (
		field: string,
		value: string | number,
		id_server: string
	): Promise<CommonDataRsp<PlayerBasic>> {
		const data_player = DBMongo.getCollection<PlayerBasic>("player_basic")
		if (!data_player) {
			return {
				message: `api_db_collection_nofound`,
				retcode: statusCodes.error.FAIL
			}
		}
		var query = {
			$and: [
				{
					[field]: value
				},
				{
					id_server
				}
			]
		}
		var datainDB = await data_player.findOne(query)
		if (datainDB) {
			const { _id, id_server, ...rest } = datainDB
			return {
				data: rest,
				retcode: statusCodes.success.RETCODE,
				message: "api_db_player_found"
			}
		} else {
			return {
				retcode: statusCodes.error.CANCEL,
				message: "api_db_player_not_found"
			}
		}
	},
	updateProp: async function (field: string, value: string, reason: string = "none"): Promise<PropRsp> {
		if (isEmpty(field)) {
			return {
				message: "api_db_prop_notoken",
				retcode: -2,
				data: null
			}
		}

		try {
			await DBMongo.isConnected() // TODO: move to constructor or init

			const cProp = DBMongo.getCollection<Prop>("prop")
			if (!cProp) {
				return {
					message: `api_db_nofound_collection`,
					retcode: statusCodes.error.CANCEL,
					data: null
				}
			}

			// Update the account based on the token and retrieve the updated document
			const updateResult = await cProp.findOneAndUpdate(
				{ _id: field },
				{
					$set: {
						value,
						time: getTimeV2(true),
						reason
					}
				},
				{
					upsert: true, // Insert a new document if not found
					returnDocument: "after" // Return the updated document
				}
			)
			if (updateResult) {
				return {
					message: "api_db_prop_update_success",
					retcode: 0,
					data: updateResult
				}
			} else {
				log.error({ name: "api_db_prop_update_failed", error: updateResult })
				return {
					message: "api_db_prop_update_failed",
					retcode: -1,
					data: null
				}
			}
		} catch (error) {
			log.error(error)
			return {
				message: "api_db_prop_failed1",
				retcode: -2,
				data: null
			}
		}
	},
	getCount: async function (field: string): Promise<number> {
		var count = 1
		var countData = await this.getProp(field)
		if (countData.data) {
			count = parseInt(countData.data.value) + 1
		}
		await this.updateProp(field, count.toString(), "count")
		return count
	},
	getProp: async function (field: string): Promise<PropRsp> {
		try {
			await DBMongo.isConnected() // TODO: move to constructor or init

			let cProp = DBMongo.getCollection<Prop>("prop")

			// After the loop, check if the collection was successfully retrieved
			if (!cProp) {
				return {
					message: `api_db_nofound_collection`,
					retcode: statusCodes.error.CANCEL,
					data: null
				}
			}

			let d = await cProp.findOne({ _id: field })
			if (d) {
				return {
					message: `api_db_prop_${field}_ok`,
					retcode: 0,
					data: d
				}
			} else {
				return {
					message: `api_db_prop_${field}_failed`,
					retcode: -1,
					data: null
				}
			}
		} catch (error) {
			log.error(error)
			return {
				message: "api_db_prop_failed1",
				retcode: -2,
				data: null
			}
		}
	}
}

export default _
