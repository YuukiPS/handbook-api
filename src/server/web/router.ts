import express, { Request, Response } from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import sharp from "sharp"
import AI from "@SV/ai"
import Logger from "@UT/logger"
import { getTimeV2, isEmpty } from "@UT/library"

import SRTool from "@DB/book/star-rail"
import General from "@DB/general/api"
import Yuuki from "@DB/general/yuuki"
import { AccountDB, BlogData, BuildData, Role, SRToolsReq, TypeArticle } from "@UT/response"
import { statusCodes } from "@UT/constants"

const r = express.Router()

const log = new Logger("Web")

// Extend Request interface to include file property from multer
interface MulterRequest extends Request {
	file?: Express.Multer.File
}

r.all("/", (req: Request, res: Response) => {
	res.send({
		message: "Welcome to the Handbook API",
		version: "0.0.1"
	})
})

// Authorization middleware function
const checkAuth = async (req: Request, res: Response, next: any) => {
	try {
		const auth = req.headers.authorization
		if (isEmpty(auth)) {
			return res.json({
				status: "No session?",
				retcode: statusCodes.error.FAIL
			})
		}

		const rAccount = await Yuuki.GET_ACCOUNT_BY_TOKEN_WEB(auth as string)
		if (!rAccount.data) {
			return res.json({
				status: rAccount.message || "Invalid session",
				retcode: rAccount.retcode || statusCodes.error.LOGIN_FORBIDDED
			})
		}

		// Attach account data to request for later use
		;(req as any).account = rAccount.data as AccountDB
		next()
	} catch (error) {
		log.error("Authorization error:", error)
		return res.json({
			status: "Authorization failed",
			retcode: statusCodes.error.FAIL
		})
	}
}

// image upload endpoint with authorization checked first
r.post("/upload/image/:id", checkAuth, async (req: MulterRequest, res: Response) => {
	try {
		var id = req.params.id
		if (!(id == "user") && !(id == "avatar") && !(id == "blog")) {
			return res.json({
				status: "Invalid upload target",
				retcode: statusCodes.error.FAIL
			})
		}
		// Get account from middleware
		const account = (req as any).account as AccountDB
		const folder = `./src/server/web/public/image/${id}`
		if (!fs.existsSync(folder)) {
			fs.mkdirSync(folder, { recursive: true })
		}
		log.info(`image upload by ${account._id} (${account.role}) in folder ${folder}`)

		// Create a custom multer instance for this specific request
		const customImageUpload = multer({
			storage: multer.diskStorage({
				destination: (req, file, cb) => {
					cb(null, folder)
				},
				filename: (req, file, cb) => {
					const timestamp = Date.now()
					// Always use .webp extension for optimized images
					let filename: string
					if (id === "user") {
						filename = `${account._id}_${timestamp}.webp`
					} else if (id === "blog") {
						filename = `${account._id}_${timestamp}_original.webp`
					} else {
						filename = `${account._id}.webp`
					}
					cb(null, filename)
				}
			}),
			limits: {
				fileSize: 20 * 1024 * 1024, // 20MB limit
				files: 1
			},
			fileFilter: (req, file, cb) => {
				const allowedTypes = /jpeg|jpg|png|webp/ // todo support gif later
				const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
				const mimetype = allowedTypes.test(file.mimetype)
				if (mimetype && extname) {
					return cb(null, true)
				} else {
					cb(new Error("Only image files are allowed"))
				}
			}
		}).single("image")

		customImageUpload(req, res, async (err) => {
			if (err) {
				log.error("Image upload error:", err)
				return res.json({
					status: err instanceof Error ? err.message : "Image upload failed",
					retcode: statusCodes.error.FAIL
				})
			}

			if (!req.file) {
				log.warn("No image file provided in the request")
				return res.json({
					status: "No image file provided",
					retcode: statusCodes.error.FAIL
				})
			}

			try {
				// Convert all images to WebP format for optimization
				const resizedImagePath = req.file.path
				let thumbnailPath: string | null = null
				let originalThumbnailPath: string | null = null

				if (id === "avatar") {
					// For avatar images, resize to 170x170 and convert to WebP
					await sharp(req.file.path)
						.resize(170, 170, {
							fit: "cover",
							position: "center"
						})
						.webp({ quality: 90 })
						.toFile(resizedImagePath + ".tmp")
				} else if (id === "blog") {
					// First, convert original to WebP
					await sharp(req.file.path)
						.webp({ quality: 90 })
						.toFile(resizedImagePath + ".tmp")
					// Create thumbnail version
					const thumbnailFilename = req.file.filename.replace("_original.webp", "_thumbnail.webp")
					thumbnailPath = path.join(path.dirname(resizedImagePath), thumbnailFilename)
					await sharp(req.file.path)
						.resize(382, 192, {
							fit: "cover",
							position: "center"
						})
						.webp({ quality: 70 })
						.toFile(thumbnailPath)
					// Create quality 50 but resize same size as original
					const originalThumbnailFilename = req.file.filename.replace("_original.webp", "_small.webp")
					originalThumbnailPath = path.join(path.dirname(resizedImagePath), originalThumbnailFilename)
					await sharp(req.file.path).webp({ quality: 50 }).toFile(originalThumbnailPath)
				} else {
					// For other images, just convert to WebP without resizing
					await sharp(req.file.path)
						.webp({ quality: 90 })
						.toFile(resizedImagePath + ".tmp")

					log.info(`Image converted to WebP format: ${req.file.filename}`)
				}

				// Replace the original file with the processed one
				fs.renameSync(resizedImagePath + ".tmp", resizedImagePath)

				const baseUrl = `${req.protocol}://${req.get("host")}`
				const imageUrl = `${baseUrl}/image/${id}/${req.file.filename}`
				log.info(`image uploaded: ${req.file.filename}, URL: ${imageUrl}`)

				// Prepare response data
				const responseData: any = {
					id: 0, // Will be set after saving to DB
					filename: req.file.filename,
					originalname: req.file.originalname,
					size: req.file.size,
					url: imageUrl,
					mimetype: "image/webp", // Always WebP now
					uploader: account._id
				}

				// Add thumbnail info for blog images
				if (id === "blog" && thumbnailPath) {
					const thumbnailFilename = path.basename(thumbnailPath)
					const thumbnailUrl = `${baseUrl}/image/${id}/${thumbnailFilename}`
					responseData.thumbnail = {
						filename: thumbnailFilename,
						url: thumbnailUrl,
						size: "800x450"
					}
				}

				var saveToDB = await General.addUploadData({
					id: 0, // Auto incremented by database
					owner: parseInt(account._id),
					time: getTimeV2(true),
					url: imageUrl,
					filename: req.file.filename,
					size: req.file.size,
					type: 1 // Always image type for this endpoint
				})
				if (!saveToDB.data) {
					log.error("Failed to save upload data to database")
					// Clean up the uploaded files if saving to DB fails
					fs.unlinkSync(resizedImagePath)
					if (thumbnailPath && fs.existsSync(thumbnailPath)) {
						fs.unlinkSync(thumbnailPath)
					}
					return res.json({
						status: "Failed to save upload data",
						retcode: statusCodes.error.FAIL
					})
				}

				responseData.id = saveToDB.data.id

				return res.json({
					status: "Image uploaded successfully",
					retcode: statusCodes.success.RETCODE,
					data: responseData
				})
			} catch (resizeError) {
				log.error("Image processing error:", resizeError)
				return res.json({
					status: "Image processing failed",
					retcode: statusCodes.error.FAIL
				})
			}
		})
	} catch (error) {
		log.error("Image upload error:", error)
		return res.json({
			status: error instanceof Error ? error.message : "Upload failed",
			retcode: statusCodes.error.FAIL
		})
	}
})

r.get("/game/resource/version", async (req: Request, res: Response) => {
	var getLastGI = (await Yuuki.getProp("commit_gi")).data?.value || "?"
	var getLastSR = (await Yuuki.getProp("commit_sr")).data?.value || "?"
	var getLastBA = (await Yuuki.getProp("commit_ba")).data?.value || "?"
	res.send([
		{
			id: 1,
			game: "Genshin Impact",
			version: "5.7",
			commit: getLastGI
		},
		{
			id: 2,
			game: "Star Rail",
			version: "3.3",
			commit: getLastSR
		},
		{
			id: 3,
			game: "Blue Archive",
			version: "1.57",
			commit: getLastBA
		}
	])
})

/*
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
*/

r.get("/ask/list", async (req: Request, res: Response) => {
	const { page, limit } = req.query
	const pageNum = parseInt(page as string) || 1
	const limitNum = parseInt(limit as string) || 10
	const result = await General.listAsk(limitNum, pageNum)
	return res.json(result)
})

r.get("/blog/list", async (req: Request, res: Response) => {
	const { page, limit, tags, search, content } = req.query
	const pageNum = parseInt(page as string) || 1
	const limitNum = parseInt(limit as string) || 10
	const tagsArray = typeof tags === "string" ? tags.split(",").map((tag) => tag.trim()) : []
	const searchString = (search as string) || ""
	const result = await General.listBlog(limitNum, pageNum, searchString, tagsArray)
	return res.json(result)
})
r.get("/blog/detail/:id", async (req: Request, res: Response) => {
	const { id } = req.params
	if (!id || isNaN(parseInt(id))) {
		return res.json({
			status: "Invalid ID",
			retcode: statusCodes.error.FAIL
		})
	}
	const { full } = req.query
	const fullDetails = full === "true" || full === "1" // Convert to boolean
	const result = await General.detailsBlog(parseInt(id), fullDetails)
	return res.json(result)
})
r.post("/blog/create", checkAuth, async (req: Request, res: Response) => {
	const { title, slug, content, shortContent, thumbnail, comment, index, tags, language } = req.body
	if (isEmpty(title) || isEmpty(content) || isEmpty(shortContent) || isEmpty(slug)) {
		return res.json({
			status: "Title, content, shortContent, and slug are required",
			retcode: statusCodes.error.FAIL
		})
	}
	const account = (req as any).account as AccountDB
	log.info(`Creating blog post by ${account._id} (${account.role})`)
	if (!account.role.includes(Role.EDITOR) && !account.role.includes(Role.ADMIN)) {
		return res.json({
			status: "You do not have permission to create a blog post",
			retcode: statusCodes.error.LOGIN_FORBIDDED
		})
	}
	var isComment = comment === true || comment === "true" || comment === "1"
	var isIndex = index === true || index === "true" || index === "1"
	var tagArray = Array.isArray(tags) ? tags : tags ? (tags as string).split(",").map((tag) => tag.trim()) : []
	var blog: BlogData = {
		id: 0, // set 0 for auto increment
		title,
		slug,
		content,
		shortContent,
		thumbnail,
		comment: isComment,
		index: isIndex,
		owner: parseInt(account._id),
		time: getTimeV2(true),
		update: getTimeV2(true),
		vote: 0,
		view: 0,
		tag: tagArray,
		type: TypeArticle.Blog
		//language
	}
	var isAdd = await General.addArticle(blog)
	return res.json({
		status: isAdd ? "Blog post created successfully" : "Failed to create blog post",
		retcode: isAdd ? statusCodes.success.RETCODE : statusCodes.error.CANCEL
		//data: isAdd ? blog : null
	})
})
r.post("/blog/edit/:id", checkAuth, async (req: Request, res: Response) => {
	const { title, slug, content, shortContent, thumbnail, comment, index, tags, language } = req.body
	const { id } = req.params
	if (!id || isNaN(parseInt(id))) {
		return res.json({
			status: "Invalid ID",
			retcode: statusCodes.error.FAIL
		})
	}
	const account = (req as any).account as AccountDB
	log.info(`Editing blog post by ${account._id} (${account.role})`)
	if (!account.role.includes(Role.EDITOR) && !account.role.includes(Role.ADMIN)) {
		return res.json({
			status: "You do not have permission to edit a blog post",
			retcode: statusCodes.error.LOGIN_FORBIDDED
		})
	}
	var isComment = comment === true || comment === "true" || comment === "1"
	var isIndex = index === true || index === "true" || index === "1"
	var tagArray = Array.isArray(tags) ? tags : tags ? (tags as string).split(",").map((tag) => tag.trim()) : []
	var blogUpdate: Partial<BlogData> = {
		title,
		slug,
		content,
		shortContent,
		thumbnail,
		comment: isComment,
		index: isIndex,
		update: getTimeV2(true),
		tag: tagArray
	}
	var result = await General.editArticle(parseInt(id), parseInt(account._id), blogUpdate)
	return res.json({
		status: result.retcode === 0 ? "Blog post updated successfully" : result.message,
		retcode: result.retcode,
		data: result.data
	})
})
r.delete("/article/remove/:id", checkAuth, async (req: Request, res: Response) => {
	const { id } = req.params
	if (!id || isNaN(parseInt(id))) {
		return res.json({
			status: "Invalid ID",
			retcode: statusCodes.error.FAIL
		})
	}
	const account = (req as any).account as AccountDB
	log.info(`Removing article with ID ${id} by ${account._id} (${account.role})`)
	if (!account.role.includes(Role.EDITOR) && !account.role.includes(Role.ADMIN)) {
		return res.json({
			status: "You do not have permission to remove an article",
			retcode: statusCodes.error.LOGIN_FORBIDDED
		})
	}
	const result = await General.removeArticle(parseInt(id))
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
