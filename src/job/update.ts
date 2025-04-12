import { isMainThread } from "worker_threads"
import { SetIntervalAsyncTimer } from "set-interval-async"
import Logger from "@UT/logger"
import { GetProfile } from "@UT/config"
// Book
import BOOK_GI from "@DB/book/genshin-impact"

const log = new Logger("Update")

class Update {
	private timeUpdate: SetIntervalAsyncTimer<[]> | undefined

	constructor() {
		if (isMainThread) {
			log.info(`This is main thread for update`)

			if (!GetProfile().autoTesting) {
				log.info(`autoTesting is disabled, so skip cek update manual`)
				return
			}            
			this.Sync()

		} else {
			log.info(`This is another thread for update`)
		}
	}

	public Run() {
		log.info(`Pong`)
	}

	public Sync() {
		// GI - https://gitlab.com/Dimbreath/AnimeGameData
		// SR - https://gitlab.com/Dimbreath/turnbasedgamedata
		BOOK_GI.Update()
	}
}

const _ = new Update()
export default _
