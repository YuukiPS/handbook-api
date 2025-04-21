import { isMainThread } from "worker_threads"
import { clearIntervalAsync, setIntervalAsync, SetIntervalAsyncTimer } from "set-interval-async"
import Logger from "@UT/logger"
import { GetProfile } from "@UT/config"
// Book
import BOOK_GI from "@DB/book/genshin-impact"
import BOOK_SR from "@DB/book/star-rail"

const log = new Logger("Update")

class Update {
	private timeUpdate: SetIntervalAsyncTimer<[]> | undefined

	constructor() {
		if (isMainThread) {
			log.info(`This is main thread for update`)
			this.Start()
		} else {
			log.info(`This is another thread for update`)
		}
	}

	public Run() {
		log.info(`Pong`)
	}

	public Start() {
		var rebuild = GetProfile().autoTesting // in dev mode away rebuild
		this.Sync(true, rebuild, !rebuild) // skip for first time (load file excel)
		if (!rebuild && !this.timeUpdate) {
			this.timeUpdate = setIntervalAsync(async () => {
				try {
					await this.Sync(false, false)
				} catch (er) {
					log.warn(er)
				}
			}, 1000 * 3600) // 1 hour
		}
	}

	public Stop() {
		log.info(`Ping stop...`)
		try {
			if (this.timeUpdate) clearIntervalAsync(this.timeUpdate)
		} catch (error) {
			log.errorNoStack(error)
		}
	}

	public async Sync(
		skip_update: boolean = false,
		rebuild: boolean = false,
		dont_build: boolean = false,
		replace: boolean = false
	) {
		// GI - https://gitlab.com/Dimbreath/AnimeGameData
		// SR - https://gitlab.com/Dimbreath/turnbasedgamedata
		//await BOOK_GI.Update(skip_update, rebuild, dont_build, replace)
		await BOOK_SR.Update(skip_update, rebuild, dont_build, replace)
	}
}

const _ = new Update()
export default _
