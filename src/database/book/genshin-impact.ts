import Logger from "@UT/logger"
import { AvatarData, ItemAvatarGI, ItemData, MonsterData, MonsterNameData, NormalItemData, SceneData, WeaponData } from "@UT/response"
import { isEmpty, readJsonFileAsync, sleep } from "@UT/library"
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

		//await this.runAvatar(demo, rebuild)
		//await this.runItem(demo, rebuild)
		//await this.runMonster(demo, rebuild)
		//await this.runWeapon(demo, rebuild)
        //await this.runScene(demo, rebuild)
	}

	async runScene(skip: boolean, rebuild: boolean): Promise<void> {
		var urlDL = `ExcelBinOutput/SceneExcelConfigData.json`
		const savePath = await General.downloadGit(REPO_GI, FOLDER_GI, urlDL, skip)
		if (savePath == "") {
			log.errorNoStack(`Error download file: ${urlDL}`)
			return
		}

		const getWeapon: Record<string, SceneData> = await readJsonFileAsync(savePath)

		for (const data of Object.values(getWeapon)) {
			if (data && data.id) {
				const id = data.id

				const obj: ItemData = {
					type: 5, // 5=scene
					game: 1,
					id,
					name: {},
                    desc: {},
					icon: "" // TODO: add icon
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info("Item already exists, skipping", obj)
					//await sleep(5)
					continue
				}

				// add name
				const name =
					`${data.scriptData}` + (data.levelEntityConfig == "" ? "" : " (" + data.levelEntityConfig + ")")
				obj.name = {
					EN: name
				}

				log.info("scene data:", obj)

				// add to datebase
				await General.itemAdd(obj, rebuild)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runWeapon(skip: boolean, rebuild: boolean): Promise<void> {
		var urlDL = `ExcelBinOutput/WeaponExcelConfigData.json`
		const savePath = await General.downloadGit(REPO_GI, FOLDER_GI, urlDL, skip)
		if (savePath == "") {
			log.errorNoStack(`Error download file: ${urlDL}`)
			return
		}

		const getWeapon: Record<string, WeaponData> = await readJsonFileAsync(savePath)

		for (const data of Object.values(getWeapon)) {
			if (data && data.nameTextMapHash) {
				const hash = data.nameTextMapHash
				const id = data.id
				const iconName = data.icon

				const obj: ItemData = {
					type: 4, // 4=weapon
					game: 1,
					id,
					name: {},
                    desc: {},
					icon: ""
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info("Item already exists, skipping", obj)
					//await sleep(5)
					continue
				}

				obj.icon = await General.downloadImageOrCopyLocal(
					`${DUMP_GI}/${iconName}.png`, // local file dump (private)
					`${FOLDER_GI}/icon/weapon/${iconName}.png`, // local file (public)
					`${domainPublic}/resources/genshin-impact/icon/weapon/${iconName}.png`, // url public
					`https://feixiaoqiu.com/static/images/weapon/${iconName}.png` // fallback url
				)

				// add name
				obj.name = General.addMultiLangNamesAsObject(hash.toString(), LANG_GI, FOLDER_GI, obj.game)

				log.info("weapon data:", obj)

				// add to datebase
				await General.itemAdd(obj, rebuild)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runMonster(skip: boolean, rebuild: boolean): Promise<void> {
		var urlDL1 = `ExcelBinOutput/MonsterExcelConfigData.json`
		const savePath1 = await General.downloadGit(REPO_GI, FOLDER_GI, urlDL1, skip)
		if (savePath1 == "") {
			log.errorNoStack(`Error download file: ${urlDL1}`)
			return
		}
		const urlDL2 = `ExcelBinOutput/MonsterDescribeExcelConfigData.json`
		const savePath2 = await General.downloadGit(REPO_GI, FOLDER_GI, urlDL2, skip)
		if (savePath2 == "") {
			log.errorNoStack(`Error download file: ${urlDL2}`)
			return
		}
		const getMonsterData: Record<string, MonsterData> = await readJsonFileAsync(savePath1)
		const getMonsterNama: Record<string, MonsterNameData> = await readJsonFileAsync(savePath2)

		for (const data of Object.values(getMonsterData)) {
			if (data && data.nameTextMapHash) {
				var hash = data.nameTextMapHash
				const id = data.id
				const mName = data.monsterName
				const varDP = data.describeId

				const obj: ItemData = {
					type: 3, // 3=monster
					game: 1,
					id,
					name: {},
                    desc: {},
					icon: ""
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info("Item already exists, skipping", obj)
					//await sleep(5)
					continue
				}

				var iconPath = ""

				// some monster no have describe id (so skip download image)
				var infoMonster = Object.values(getMonsterNama).find((item) => item.id === Number(varDP))
				if (infoMonster) {
					//log.warn("found monster", infoMonster);
					iconPath = infoMonster.icon
					hash = infoMonster.nameTextMapHash
				} else {
					//log.warn("not found monster", data);
					infoMonster = Object.values(getMonsterNama).find((item) => item.icon.includes(mName))
					if (infoMonster) {
						iconPath = infoMonster.icon
						hash = infoMonster.nameTextMapHash
						//log.warn("found monster", infoMonster);
					} else {
						// TODO: find Partner icon
					}
				}

				if (!isEmpty(iconPath)) {
					obj.icon = await General.downloadImageOrCopyLocal(
						`${DUMP_GI}/${iconPath}.png`, // local file dump (private)
						`${FOLDER_GI}/icon/monster/${iconPath}.png`, // local file (public)
						`${domainPublic}/resources/genshin-impact/icon/monster/${iconPath}.png`, // url public
						`https://enka.network/ui/${iconPath}.png` // fallback url
					)
				}

				// add name
				obj.name = General.addMultiLangNamesAsObject(hash.toString(), LANG_GI, FOLDER_GI, obj.game, mName)

				log.info("monster data:", obj)

				// add to datebase
				await General.itemAdd(obj, rebuild)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runItem(skip: boolean, rebuild: boolean): Promise<void> {
		// add only normal item
		const filePaths = [
			"ExcelBinOutput/MaterialExcelConfigData.json",
			"ExcelBinOutput/HomeWorldFurnitureExcelConfigData.json"
		]
		for (const urlDL of filePaths) {
			const savePath = await General.downloadGit(REPO_GI, FOLDER_GI, urlDL, skip)
			if (savePath == "") {
				log.errorNoStack(`Error download file: ${urlDL}`)
				return
			}

			const getItem: Record<string, NormalItemData> = await readJsonFileAsync(savePath)

			for (const data of Object.values(getItem)) {
				if (data && data.nameTextMapHash) {
					const hash = data.nameTextMapHash
					const id = data.id
					const iconName = data.icon

					const obj: ItemData = {
						type: 2, // 2=normal item
						game: 1,
						id,
						name: {},
                        desc: {},
						icon: ""
					}

					if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
						log.info("Item already exists, skipping", obj)
						//await sleep(5)
						continue
					}

					obj.icon = await General.downloadImageOrCopyLocal(
						`${DUMP_GI}/${iconName}.png`, // local file dump (private)
						`${FOLDER_GI}/icon/item/${iconName}.png`, // local file (public)
						`${domainPublic}/resources/genshin-impact/icon/item/${iconName}.png`, // url public
						`https://enka.network/ui/${iconName}.png` // fallback url
					)

					// add name
					obj.name = General.addMultiLangNamesAsObject(hash.toString(), LANG_GI, FOLDER_GI, obj.game)

					log.info("item data:", obj)

					// add to datebase
					await General.itemAdd(obj, rebuild)

					//await sleep(5)
				} else {
					log.info("skip", data)
				}
			}
		}
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
				const id = data.id
				const iconName = data.iconName

				if (id < 10000002 || id >= 11000000) continue

				const obj: ItemAvatarGI = {
					type: 1, // 1=avatar
					game: 1,
					id,
					name: {},
                    desc: {},
					icon: "",
                    weaponType: data.weaponType,
                    qualityType: data.qualityType,
                    bodyType: data.bodyType
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
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
				obj.name = General.addMultiLangNamesAsObject(data.nameTextMapHash.toString(), LANG_GI, FOLDER_GI, obj.game)
                // add desc
                obj.desc = General.addMultiLangNamesAsObject(data.descTextMapHash.toString(), LANG_GI, FOLDER_GI, obj.game)

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
