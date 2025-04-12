import express, { Request, Response } from "express"

const r = express.Router()

r.all("/", (req: Request, res: Response) => {
	res.send(`Book API`)
})

export default r
