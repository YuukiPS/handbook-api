import express, { Request, Response } from "express"
import DB from "@DB/book/general"
const r = express.Router()

r.all("/", (req: Request, res: Response) => {
	res.send(`Book API`)
})

r.all("/item", async (req: Request, res: Response) => {
	const { search, game, page, lang, type } = req.query

	// parse once
	const pageNum = parseInt(page as string) || 1
	const gameNum = parseInt(game as string) || 0
	const typeNum = parseInt(type as string) || 0

	// try to parse limit; NaN means “not provided”
	const rawLimit = parseInt(req.query.limit as string)
	const hasLimit = !Number.isNaN(rawLimit)

	// if type=0, default limit to 10 unless user gave a positive limit
	// if type≠0, allow 0 (all) or any user‑provided limit
	const limit = typeNum === 0 ? (hasLimit && rawLimit > 0 ? rawLimit : 10) : hasLimit ? rawLimit : 0

	const result = await DB.getItem({
		search: search as string,
		page: pageNum,
		game: gameNum,
		type: typeNum,
		lang: lang as string,
		limit
	})

	res.json(result)
})

export default r
