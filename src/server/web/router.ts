import express, { Request, Response } from "express"
import General from "@DB/book/general"
import AI from "@DB/book/ai"
import SRTool from "@DB/book/star-rail"
const r = express.Router()

r.all("/", (req: Request, res: Response) => {
	res.send(`Book API`)
})

r.all("/ai/ask", async (req: Request, res: Response) => {
	const { message, uid } = req.query
	if (!message || !uid) {
		res.status(400).send("Missing message or uid")
		return
	}
	const result = await AI.openChat(message as string, uid as string)
	res.send(result)
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
	const langString = (lang as string) || "en"

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
/*
r.all("/gen/relic", async (req: Request, res: Response) => {
	const { cmd } = req.query
	var tes = await SRTool.GenRelic(cmd as string)
	res.json(tes)
})
*/
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

export default r
