import Logger from "@UT/logger"
import { AvatarData, ItemData } from "@UT/response"
import { readJsonFileAsync, sleep } from "@UT/library"
import { domainPublic } from "@UT/share"
// thrid party
import { isMainThread } from "worker_threads"
import { SetIntervalAsyncTimer } from "set-interval-async"
// datebase
import General from "@DB/book/general"

const log = new Logger("Update")

export const REPO_GI = "Dimbreath/AnimeGameData"
export const FOLDER_GI = "./src/server/web/public/resources/genshin-impact"
export const LANG_GI = ["CHS", "CHT", "DE", "EN", "ES", "FR", "ID", "IT", "JP", "KR", "PT", "RU", "TR", "VI"] // TODO: TH_0,TH_1
// file only in PC not in server (TODO: auto move file local to server)
export const DUMP_GI = "../../../../Docker/GS/gs/GC-Resources/tool/resources_tmp/dump"

class GI {
	private timeUpdate: SetIntervalAsyncTimer<[]> | undefined

	constructor() {
		if (isMainThread) {
			log.info(`This is GI main thread`)
		} else {
			log.info(`This is GI another thread`)
		}
	}

	public async Update() {
		log.info(`Try to update Genshin Impact resources`)

		// TODO: move to config
		let demo = true
		let rebuild = true

		if (!(await General.checkGit(REPO_GI, "commit_gi", demo))) {
			log.info(`No update available`)
			return
		}
		log.info(`Update available`)

		log.info(`Downloading localization files`)

		for (const lang of LANG_GI) {
			await General.downloadGit(REPO_GI, FOLDER_GI, `TextMap/TextMap${lang}.json`, demo)
		}

		await this.runAvatar(demo, rebuild)
	}

	async runAvatar(skip: boolean, rebuild: boolean): Promise<void> {
		var urlDL = `ExcelBinOutput/AvatarExcelConfigData.json`
		const savePath = await General.downloadGit(REPO_GI, FOLDER_GI, urlDL, skip)
		if (savePath == "") {
			log.errorNoStack(`Error download file: ${urlDL}`)
			return
		}

		const getAvatar: Record<string, AvatarData> = await readJsonFileAsync(savePath)

		for (const data of Object.values(getAvatar)) {
			if (data && data.nameTextMapHash) {
				const hash = data.nameTextMapHash
				const id = data.id
				const iconName = data.iconName

				if (id < 10000002 || id >= 11000000) continue

				const obj: ItemData = {
					type: 1,
					game: 1,
					id,
					name: {},
					icon: ""
				}

				if (!rebuild && await General.itemExists(obj.id, obj.type)) {
					log.info("Item already exists, skipping", obj)
					//await sleep(5)
					continue
				}

				obj.icon = await General.downloadImageOrCopyLocal(
					`${DUMP_GI}/${iconName}.png`, // local file dump (private)
					`${FOLDER_GI}/icon/avatar/${iconName}.png`, // local file (public)
					`${domainPublic}/resources/genshin-impact/icon/avatar/${iconName}.png`, // url public
					`https://enka.network/ui/${iconName}.png` // fallback url
				)

				// add name
				obj.name = General.addMultiLangNamesAsObject(hash.toString(), LANG_GI, FOLDER_GI, 1)

				log.info("Avatar data:", obj)

				// add to datebase
				await General.itemAdd(obj, rebuild)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}
}

const _ = new GI()
export default _
