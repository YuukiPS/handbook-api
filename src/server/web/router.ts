import express, { Request, Response } from "express"
import AI from "@SV/ai"
import Logger from "@UT/logger"
import { getTimeV2, isEmpty } from "@UT/library"

import SRTool from "@DB/book/star-rail"
import General from "@DB/general/api"
import Yuuki from "@DB/general/yuuki"
import { AccountDB, BuildData, SRToolsReq } from "@UT/response"

const r = express.Router()

const log = new Logger("Web")

r.all("/", (req: Request, res: Response) => {
	res.send(`Book API`)
})

r.all("/ai/ask", async (req: Request, res: Response) => {
	const { message, uid, json } = req.query
	var isJson = false
	if (json && typeof json === "string") {
		isJson = json.toLowerCase() === "true"
	}
	if (!message || !uid) {
		res.status(400).send("Missing message or uid")
		return
	}
	const result = await AI.chat(message as string, uid as string, isJson)
	log.info(`AI: ${uid} > `, result)
	res.send(result)
})

r.all("/ask/list", async (req: Request, res: Response) => {
	const { page, limit } = req.query
	const pageNum = parseInt(page as string) || 1
	const limitNum = parseInt(limit as string) || 10
	const result = await General.listAsk(limitNum, pageNum)
	return res.json(result)
})

r.all("/item/:lang/:game/:type/:id", async (req: Request, res: Response) => {
	const { id, game, type, lang } = req.params

	// parse once
	const idNum = parseInt(id as string) || 0
	const gameNum = parseInt(game as string) || 0
	const typeNum = parseInt(type as string) || 0
	const langString = (lang as string) || "en"

	const result = await General.getItem(idNum, typeNum, gameNum, langString)
	// TODO: get details data

	res.json(result)
})

r.all("/item", async (req: Request, res: Response) => {
	const { search, game, page, lang, type } = req.query

	// parse once
	const pageNum = parseInt(page as string) || 1
	const gameNum = parseInt(game as string) || 0
	const typeNum = parseInt(type as string) || 0
	const langString = (lang as string) || (req.query.language as string) || "en"

	// try to parse limit; NaN means “not provided”
	const rawLimit = parseInt(req.query.limit as string)
	const hasLimit = !Number.isNaN(rawLimit)

	// if type=0, default limit to 10 unless user gave a positive limit
	// if type≠0, allow 0 (all) or any user‑provided limit
	const limit = typeNum === 0 ? (hasLimit && rawLimit > 0 ? rawLimit : 10) : hasLimit ? rawLimit : 0

	const result = await General.findItem({
		search: search as string,
		page: pageNum,
		game: gameNum,
		type: typeNum,
		lang: langString,
		limit
	})

	res.json(result)
})

// SR for Relic
r.all("/gen/relic", async (req: Request, res: Response) => {
	const { cmd } = req.query
	var tes = await SRTool.GenRelic(cmd as string)
	res.json(tes)
})
r.all("/build/sr", async (req: Request, res: Response) => {
	var idAvatar = req.query.avatar as string
	if (idAvatar == "all") idAvatar = "0"

	const avatarNum = parseInt(idAvatar) || 0
	const searchString = (req.query.search as string) || ""
	const page = parseInt(req.query.page as string) || 1
	const limit = parseInt(req.query.limit as string) || 0
	const recommendation = parseInt(req.query.recommendation as string) || 0 // 0 = snow all, 1 = Each avatar only gives 1 recommendation which is voted based on the user but if no vote it will give 1 random one and filter only those with avatars
	var tes = await SRTool.findBuild({
		avatar: avatarNum,
		search: searchString,
		page,
		limit,
		recommendation
	})
	res.json(tes)
})
r.all("/sync/sr", async (req: Request, res: Response) => {
	var b = req.body
	var p = req.params
	var q = req.query
	log.warn({
		name: "export_sr",
		query: q,
		body: b,
		params: p,
		header: req.headers,
		cookie: req.cookies
	})
})
r.all("/srtool/:id", async (req: Request, res: Response) => {
	var b = req.body
	var p = req.params
	var q = req.query

	var uid = b.username
	var code = b.password
	if (isEmpty(uid)) {
		return res.status(401).send(`Username is required`)
	}
	if (isEmpty(code)) {
		return res.status(401).send(`Password is required`)
	}

	var server_id = (p.id as string) ?? ""

	log.warn({
		name: "srtool",
		query: q,
		body: b,
		params: p,
		header: req.headers,
		cookie: req.cookies
	})

	var server = await Yuuki.getServerProfile(server_id)
	if (!server.data) {
		log.warn(`Server with ID ${server_id} not found`)
		return res.status(404).send(`Server with ID ${server_id} not found`)
	}
	log.warn("Server data", server)
	var type_game = server.data.game
	var type_engine = server.data.engine
	if (type_game != 2 || type_engine != 5) {
		log.warn(`Server with ID ${server_id} is not a valid SRTools`)
		return res
			.status(404)
			.send(`Server with ID ${server_id} is not a valid SR Tools server [${type_game}, ${type_engine}]`)
	}

	var rPlayer = await Yuuki.GET_BASIC_BY_UID_PLAYER(uid, server_id)
	log.warn("rPlayer", rPlayer)

	var dataPlayer = rPlayer.data
	if (dataPlayer) {
		var rAccount = await Yuuki.GET_ACCOUNT_BY_UID(dataPlayer.accountId)
		log.warn("rAccount", rAccount)

		if (rAccount.data) {
			var dataAccount = rAccount.data as AccountDB
			if (dataAccount.tokenAPI != code) {
				log.warn("Code mismatch", dataAccount.tokenAPI, code)
				return res.status(401).send(`Code mismatch for player ${uid} in server ${server_id}`)
			}
			var dataSync = b.data as SRToolsReq
			if (!isEmpty(dataSync)) {
				var build: BuildData[] = []

				// Avatar
				var avatar = dataSync.avatars
				if (!isEmpty(avatar)) {
					for (const a of Object.values(avatar)) {
						const filteredSkills = Object.fromEntries(
							Object.entries(a.data.skills || {}).filter(([_, v]) => v !== 0 && v !== 1)
						)
						const obj: BuildData = {
							owner: parseInt(dataPlayer.accountId),
							title: `build_default_${dataPlayer.uid}`,
							avatar: {
								id: a.avatar_id,
								level: a.level,
								rank: a.data.rank, // Promotion is the same as rank in SR?
								promotion: a.promotion,
								skills: filteredSkills
							},
							vote: 0,
							time: getTimeV2(true),
							update: getTimeV2(true),
							relic: [],
							_id: 0
						}
						// Check for duplicate avatar_id before adding
						if (!build.some((b) => b.avatar?.id === a.avatar_id)) {
							build.push(obj)
						} else {
							log.warn(
								`Duplicate avatar_id ${a.avatar_id} found for player ${dataPlayer.uid} in server ${server_id}`
							)
						}
					}
				}

				// Relic
				var relic = dataSync.relics
				if (!isEmpty(relic)) {
					for (const r of Object.values(relic)) {
						// Find the build with the matching avatar_id
						const buildIndex = build.findIndex((b) => b.avatar?.id === r.equip_avatar)
						if (buildIndex !== -1 && build[buildIndex]?.relic) {
							build[buildIndex].relic.push({
								id: r.relic_id,
								main: r.main_affix_id, // TODO: SetId in LC is auto?
								sub: [],
								level: r.level,
								count: 1,
								sort: true // TODO: handle sort logic if needed
							})
							// add sub stats if available
							if (r.sub_affixes && r.sub_affixes.length > 0) {
								build[buildIndex].relic[build[buildIndex].relic.length - 1].sub = r.sub_affixes.map(
									(s) => ({
										id: s.sub_affix_id,
										count: s.count,
										step: s.step
									})
								)
							} else {
								log.warn(
									`No sub affixes found for relic ${r.relic_id} for player ${dataPlayer.uid} in server ${server_id}`
								)
							}
						} else {
							log.warn(
								`No build found for avatar id ${r.equip_avatar} when adding relic ${r.relic_id} for player ${dataPlayer.uid} in server ${server_id}`
							)
						}
					}
				}

				// Equipment
				var equipment = dataSync.lightcones
				if (!isEmpty(equipment)) {
					for (const e of Object.values(equipment)) {
						// Find the build with the matching avatar_id
						const buildIndex = build.findIndex((b) => b.avatar?.id === e.equip_avatar)
						if (buildIndex !== -1) {
							build[buildIndex].equipment = {
								id: e.item_id,
								level: e.level,
								promotion: e.promotion, // Promotion is the same as rank in SR?
								rank: e.rank // Rank is the same as superimposition in SR?
							}
						} else {
							log.warn(
								`No build found for avatar id ${e.equip_avatar} when adding equipment ${e.item_id} for player ${dataPlayer.uid} in server ${server_id}`
							)
						}
					}
				}

				// Sync builds
				// In SRTool, does everything sync? In our version, we only sync the build avatar and maybe later there will be a team build version available
				if (build.length > 0) {
					log.info(`sync ${build.length} builds for player ${dataPlayer.uid} in server ${server_id}`)
					for (const b of build) {
						log.info(
							`Build (${b.avatar?.id}) - ${b.title} - ${b.relic?.length} relics - ${
								b.equipment?.id || "No Equipment"
							}`
						)
						// TODO: send to game server for sync and maybe save in database
						//log.info(`debug build: ${JSON.stringify(b, null, 2)}`)
					}
					var tesSync = await Yuuki.SyncSRData(
						server.data.api.url,
						dataPlayer.uid,
						server.data.api.passwrod_private,
						{
							data: build,
							retcode: 0,
							message: "api_sync_srdata_ok"
						}
					)
					log.info(`Sync result: `, tesSync)
				} else {
					log.warn(`No builds found to sync for player ${dataPlayer.uid} in server ${server_id}`)
				}
			}
		} else {
			log.warn("Account not found", rAccount.message)
			return res.status(404).send(`Account with UID ${dataPlayer.accountId} not found in server ${server_id}`)
		}
	} else {
		log.warn("Player not found", rPlayer.message)
		return res.status(404).send(`Player with UID ${uid} not found in server ${server_id}`)
	}

	return res.send(`Sync data for ${uid} in server ${server_id} is OK`)
})

export default r
