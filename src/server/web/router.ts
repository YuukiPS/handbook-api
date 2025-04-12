import express, { Request, Response } from "express"
import DB from "@DB/book/general"
const r = express.Router()

r.all("/", (req: Request, res: Response) => {
	res.send(`Book API`)
})

r.all("/item", async (req: Request, res: Response) => {
	const { search, page, lang } = req.query
	var result = await DB.getItem({
		search: search as string,
		page: page as unknown as number,
		lang: lang as string,
		limit: 10 // tmp lock 10 items
	})
	res.json(result)
})

export default r
