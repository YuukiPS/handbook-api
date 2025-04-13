import Logger from "@UT/logger"
import {
	AvatarExcel,
	ItemAvatar,
	ItemData,
	ItemExcel,
	ItemMonster,
	ItemNormal,
	ItemScene,
	ItemWeapon,
	MonsterExcel,
	MonsterNameExcel,
	MonsterNameSpecialExcel,
	SceneExcel,
	WeaponExcel
} from "@UT/response"
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
		await this.runScene(demo, rebuild)
	}

	async runScene(skip: boolean, rebuild: boolean): Promise<void> {
		var urlDL = `ExcelBinOutput/SceneExcelConfigData.json`
		const savePath = await General.downloadGit(REPO_GI, FOLDER_GI, urlDL, skip)
		if (savePath == "") {
			log.errorNoStack(`Error download file: ${urlDL}`)
			return
		}

		const getWeapon: Record<string, SceneExcel> = await readJsonFileAsync(savePath)

		for (const data of Object.values(getWeapon)) {
			if (data && data.id) {
				const id = data.id

				const obj: ItemScene = {
					type: 5, // 5=scene
					game: 1,
					id,
					name: {},
					desc: {},
					icon: "", // TODO: add icon
					typeScene: data.type
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

		const getWeapon: Record<string, WeaponExcel> = await readJsonFileAsync(savePath)

		for (const data of Object.values(getWeapon)) {
			if (data && data.nameTextMapHash) {
				const hash = data.nameTextMapHash
				const id = data.id
				const iconName = data.icon

				const obj: ItemWeapon = {
					type: 4, // 4=weapon
					game: 1,
					id,
					name: {},
					desc: {},
					icon: "",
					weaponType: data.weaponType,
					rankLevel: data.rankLevel
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
		const urlDL3 = `ExcelBinOutput/MonsterSpecialNameExcelConfigData.json`
		const savePath3 = await General.downloadGit(REPO_GI, FOLDER_GI, urlDL3, skip)
		if (savePath3 == "") {
			log.errorNoStack(`Error download file: ${urlDL3}`)
			return
		}
		const getMonsterData: Record<string, MonsterExcel> = await readJsonFileAsync(savePath1)
		const getMonsterNama: Record<string, MonsterNameExcel> = await readJsonFileAsync(savePath2)
		const getMonsterNameSpecialExcel: Record<string, MonsterNameSpecialExcel> = await readJsonFileAsync(savePath3)

		for (const data of Object.values(getMonsterData)) {
			if (data && data.nameTextMapHash) {
				var hashName1 = data.nameTextMapHash
				const id = data.id

				//if (id != 26230301) continue // demo only

				const mName = data.monsterName
				const varDP = data.describeId

				const obj: ItemMonster = {
					type: 3, // 3=monster
					game: 1,
					id,
					name: {},
					desc: {},
					icon: "",
					typeMonster: data.type
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info("Item already exists, skipping", obj)
					//await sleep(5)
					continue
				}

				var iconPath = ""
				var hashName2 = 0
				var hashName3 = 0

				// find via describe Id
				var infoMonster1 = Object.values(getMonsterNama).find((item) => item.id === Number(varDP))
				if (infoMonster1) {
					iconPath = infoMonster1.icon
					hashName2 = infoMonster1.nameTextMapHash
					//log.info("found monster0-1", infoMonster1)

					var infoMonsterNameSpecial1 = Object.values(getMonsterNameSpecialExcel).find(
						(item) => item.specialNameLabID === infoMonster1?.specialNameLabID
					)

					if (infoMonsterNameSpecial1) {
						hashName3 = infoMonsterNameSpecial1.specialNameTextMapHash
						//log.info("found monster0-2", infoMonsterNameSpecial1)
					}
				}

				// find via icon monster name
				var infoMonster2 = Object.values(getMonsterNama).find((item) => item.icon.includes(mName))
				if (infoMonster2) {
					iconPath = infoMonster2.icon
					hashName2 = infoMonster2.nameTextMapHash
					//log.info("found monster1-1", infoMonster2)

					var infoMonsterNameSpecial2 = Object.values(getMonsterNameSpecialExcel).find(
						(item) => item.specialNameLabID === infoMonster2?.specialNameLabID
					)

					if (infoMonsterNameSpecial2) {
						hashName3 = infoMonsterNameSpecial2.specialNameTextMapHash
						//log.info("found monster1-2", infoMonsterNameSpecial2)
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
				var nameList1
				if (!isEmpty(hashName1)) {
					nameList1 = General.addMultiLangNamesAsObject(hashName1.toString(), LANG_GI, FOLDER_GI, obj.game)
					//log.warn("found monster1", nameList1)
				} else {
					nameList1 = {}
				}
				var nameList2
				if (!isEmpty(hashName2)) {
					nameList2 = General.addMultiLangNamesAsObject(hashName2.toString(), LANG_GI, FOLDER_GI, obj.game)
					//log.warn("found monster32", nameList2)
				} else {
					nameList2 = {}
				}
				var nameList3
				if (!isEmpty(hashName3)) {
					nameList3 = General.addMultiLangNamesAsObject(hashName3.toString(), LANG_GI, FOLDER_GI, obj.game)
					//log.warn("found monster3", nameList3)
				} else {
					nameList3 = {}
				}

				//log.info(`hashName1: ${hashName1} - hashName2: ${hashName2} - hashName3: ${hashName3}`)
				var name_final: Record<string, string> = {}
				var nameLists = [nameList1, nameList2, nameList3]
				var allLangs = new Set<string>()
				nameLists.forEach((n) => Object.keys(n).forEach((lang) => allLangs.add(lang)))
				allLangs.forEach((lang) => {
					name_final[lang] = nameLists
						.map((name) => name[lang])
						.filter((text) => typeof text === "string" && text.trim() !== "")
						.join(" - ")
				})
				if (Object.keys(name_final).length === 0) {
					name_final = {
						EN: mName
					}
				}
				obj.name = name_final

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
			//"ExcelBinOutput/WeaponExcelConfigData.json",
			//"ExcelBinOutput/ReliquaryExcelConfigData.json",
		]
		for (const urlDL of filePaths) {
			const savePath = await General.downloadGit(REPO_GI, FOLDER_GI, urlDL, skip)
			if (savePath == "") {
				log.errorNoStack(`Error download file: ${urlDL}`)
				return
			}

			const getItem: Record<string, ItemExcel> = await readJsonFileAsync(savePath)

			for (const data of Object.values(getItem)) {
				if (data && data.nameTextMapHash) {
					const id = data.id
					const iconName = data.icon

					const obj: ItemNormal = {
						type: 2, // 2=normal item
						game: 1,
						id,
						name: {},
						desc: {},
						icon: "",
						rankLevel: data.rankLevel,
						itemType: data.itemType,
						materialType: data.materialType,
						foodQuality: data.foodQuality,
						specialFurnitureType: data.specialFurnitureType,
						surfaceType: data.surfaceType
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
					obj.name = General.addMultiLangNamesAsObject(
						data.nameTextMapHash.toString(),
						LANG_GI,
						FOLDER_GI,
						obj.game
					)
					// add desc
					obj.desc = General.addMultiLangNamesAsObject(
						data.descTextMapHash.toString(),
						LANG_GI,
						FOLDER_GI,
						obj.game
					)

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

		const getAvatar: Record<string, AvatarExcel> = await readJsonFileAsync(savePath)

		for (const data of Object.values(getAvatar)) {
			if (data && data.nameTextMapHash) {
				const id = data.id
				const iconName = data.iconName

				if (id < 10000002 || id >= 11000000) continue

				const obj: ItemAvatar = {
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
				obj.name = General.addMultiLangNamesAsObject(
					data.nameTextMapHash.toString(),
					LANG_GI,
					FOLDER_GI,
					obj.game
				)
				// add desc
				obj.desc = General.addMultiLangNamesAsObject(
					data.descTextMapHash.toString(),
					LANG_GI,
					FOLDER_GI,
					obj.game
				)

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
