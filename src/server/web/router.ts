import express, { Request, Response } from "express"
import General from "@DB/book/general"
import SRTool from "@DB/book/star-rail"
const r = express.Router()

r.all("/", (req: Request, res: Response) => {
	res.send(`Book API`)
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

	var tes = await SRTool.findBuild({
		avatar: avatarNum,
		search: searchString,
		page,
		limit
	})
	res.json(tes)
})

export default r
