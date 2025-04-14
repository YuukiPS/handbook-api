import Logger from "@UT/logger"
import { ClassAvatarExcelSR, ClassAvatarItemExcelSR, ItemAvatar } from "@UT/response"
import { isEmpty } from "@UT/library"
import { domainPublic } from "@UT/share"
import ExcelManager from "@UT/excel"
// thrid party
import { isMainThread } from "worker_threads"
// datebase
import General from "@DB/book/general"

const nameGame = "star-rail"

const log = new Logger(nameGame.replace("-", " ").toLocaleUpperCase())

export const REPO_SR = "Dimbreath/turnbasedgamedata"
export const REPO_BRANCH_SR = "main"
export const PATHBIN_SR = `ExcelOutput`
export const FOLDER_SR = `./src/server/web/public/resources/${nameGame}`
export const LANG_SR = ["CHS", "CHT", "DE", "EN", "ES", "FR", "ID", "JP", "KR", "PT", "RU", "TH", "VI"] // TODO: TH_0(GI)=TH(SR),TH_1
export const EXCEL_SR = {
	"AvatarConfig.json": ClassAvatarExcelSR,
	"ItemConfigAvatar.json": ClassAvatarItemExcelSR // damm why hoyo put info avatar in item config
	//"AvatarBaseType.json": ClassAvatarBaseTypeExcelSR,
	//"MaterialExcelConfigData.json": ClassItemExcel,
	//"HomeWorldFurnitureExcelConfigData.json": ClassItemExcel,
	//"MonsterExcelConfigData.json": ClassMonsterExcel,
	//"MonsterDescribeExcelConfigData.json": ClassMonsterNameExcel,
	//"MonsterSpecialNameExcelConfigData.json": ClassMonsterNameSpecialExcel,
	//"WeaponExcelConfigData.json": ClassWeaponExcel,
	//"SceneExcelConfigData.json": ClassSceneExcel,
	//"GadgetExcelConfigData.json": ClassGadgetExcel,
	//"ManualTextMapConfigData.json": ClassManualTextMapExcel,
	//"ReliquaryExcelConfigData.json": ClassReliquaryExcel,
	//"ReliquaryMainPropExcelConfigData.json": ClassReliquaryMainPropExcel,
	//"ReliquaryAffixExcelConfigData.json": ClassReliquaryAffixExcel,
	//"ReliquaryLevelExcelConfigData.json": ClassReliquaryLevelExcel,
	//"QuestExcelConfigData.json": ClassQuestExcel // TODO: maybe we need use yuuki res (because dim never update this or it is incomplete.)
	//"ExcelBinOutput/AvatarCurveExcelConfigData.json": ItemReliquary,
} as const
// file only in PC not in server (TODO: auto move file local to server)
export const DUMP_SR = "../../../../Docker/SR/sr/SR_Resources/Tool/dump"

// SR function
function Calculate(name: string, finalValue: number): string {
	if (
		name.includes("PERCENT") ||
		name.includes("CRITICAL") ||
		name.includes("CHARGE") ||
		name.includes("HURT") ||
		name.includes("HEAL")
	) {
		return `${(finalValue * 100).toFixed(2)}%`
	} else {
		return `+${Math.floor(finalValue)}`
	}
}

class SR {
	private excel!: ExcelManager<typeof EXCEL_SR>
	constructor() {
		if (isMainThread) {
			log.info(`This is SR main thread`)
		} else {
			log.info(`This is SR another thread`)
		}
	}

	public async Update(
		skip_update: boolean = false,
		foce_save: boolean = false,
		dont_build: boolean = false
	): Promise<void> {
		log.info(`Try to update Genshin Impact resources`)

		var skip_dl = true
		if (await General.checkGit(REPO_SR, "commit_sr", skip_update)) {
			log.info(`Update available`)
			skip_dl = false
		} else {
			log.info(`No update available: ${REPO_SR} > skip? ${skip_update}`)
		}

		log.info(`Downloading localization files`)
		for (const lang of LANG_SR) {
			await General.downloadGit(REPO_SR, FOLDER_SR, `TextMap/TextMap${lang}.json`, skip_dl, REPO_BRANCH_SR)
		}

		log.info(`Downloading Excel files`)
		this.excel = new ExcelManager(REPO_SR, FOLDER_SR, EXCEL_SR, skip_dl, REPO_BRANCH_SR, PATHBIN_SR)
		await this.excel.loadFiles()

		if (dont_build) {
			log.info(`Skip build item data`)
			return
		}

		log.info(`Building item data`)
		//await this.runAvatar(foce_save)
		//await this.runItem(foce_save)
		//await this.runMonster(foce_save)
		//await this.runWeapon(foce_save)
		//await this.runScene(foce_save)
		//await this.runGadget(foce_save)
		//await this.runReliquary(foce_save)
		//await this.runQuest(foce_save)
	}
	/*
	async runQuest(rebuild: boolean): Promise<void> {
		const getQuest = this.excel.getConfig("QuestExcelConfigData.json")
		if (!getQuest) {
			log.errorNoStack(`Error get QuestExcelConfigData.json`)
			return
		}
		for (const data of Object.values(getQuest)) {
			if (data) {
				const idMain = data.mainId
				const idSub = data.subId
				const hashDesc = data.failParent // descTextMapHash
				const hashStep = data.stepDescTextMapHash
				const hashGuide = data.guideTipsTextMapHash

				const obj: ItemQuest = {
					type: 10, // 10=quest
					game: 1,
					id: idMain,
					subId: idSub,
					name: {},
					desc: {},
					guideTips: {},
					icon: "",
					showType: data.failCondComb, // showType
					order: data.order
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Quest already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				if (!isEmpty(hashDesc)) {
					obj.name = General.addMultiLangNamesAsObject(hashDesc.toString(), LANG_GI, FOLDER_GI, obj.game)
				} else {
					obj.name = {
						EN: `UNKN-${idMain}-${idSub}`
					}
				}

				if (!isEmpty(hashStep)) {
					obj.desc = General.addMultiLangNamesAsObject(hashStep.toString(), LANG_GI, FOLDER_GI, obj.game)
				} else {
					obj.desc = {
						EN: `UNKS-${idMain}-${idSub}`
					}
				}

				if (!isEmpty(hashGuide)) {
					obj.guideTips = General.addMultiLangNamesAsObject(
						hashGuide.toString(),
						LANG_GI,
						FOLDER_GI,
						obj.game
					)
				} else {
					obj.guideTips = {
						EN: `UNKG-${idMain}-${idSub}`
					}
				}

				//log.info("quest data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Quest add > ${obj.id} (${obj.type}) is rebuild: ${rebuild} = db ${isAdd}`)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runReliquary(rebuild: boolean): Promise<void> {
		// Lock basic stats (TODO: remove stats in name)
		const maxLevel = 21
		const maxRank = 5

		const getManualTextMap = this.excel.getConfig("ManualTextMapConfigData.json")
		if (!getManualTextMap) {
			log.errorNoStack(`Error get ManualTextMapConfigData.json`)
			return
		}
		const getReliquaryConfig = this.excel.getConfig("ReliquaryExcelConfigData.json")
		if (!getReliquaryConfig) {
			log.errorNoStack(`Error get ReliquaryExcelConfigData.json`)
			return
		}
		const getReliquaryMain = this.excel.getConfig("ReliquaryMainPropExcelConfigData.json")
		if (!getReliquaryMain) {
			log.errorNoStack(`Error get ReliquaryMainPropExcelConfigData.json`)
			return
		}
		const getReliquarySub = this.excel.getConfig("ReliquaryAffixExcelConfigData.json")
		if (!getReliquarySub) {
			log.errorNoStack(`Error get ReliquaryAffixExcelConfigData.json`)
			return
		}
		const getReliquaryLevel = this.excel.getConfig("ReliquaryLevelExcelConfigData.json")
		if (!getReliquaryLevel) {
			log.errorNoStack(`Error get ReliquaryLevelExcelConfigData.json`)
			return
		}

		// Process Main Artifact
		log.info(`Try to update Reliquary Main`)
		for (const main of Object.values(getReliquaryMain)) {
			const id = main.id
			const getPropType = main.propType

			const hashEntry = Object.values(getManualTextMap).find((item) => item.textMapId === getPropType)
			if (!hashEntry) {
				log.warn(`ReliquaryMain not found`, name)
				continue
			}

			const obj: ItemArtifactMain = {
				type: 7, // 7=ArtifactMain
				game: 1,
				id,
				name: {},
				desc: {},
				icon: "",
				grup: main.propDepotId
			}
			if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
				log.info(`ReliquaryMain already exists, skipping ${obj.id} (${obj.type})`)
				continue
			}

			let valueMain = 0
			const TesLevel = Object.values(getReliquaryLevel).find(
				(entry) =>
					entry.level === maxLevel &&
					entry.rank === maxRank &&
					entry.addProps.some((prop) => prop.propType === getPropType)
			)

			if (!TesLevel) {
				// If no corresponding level configuration found, skip this entry.
				continue
			} else {
				const propFound = TesLevel.addProps.find((prop) => prop.propType === getPropType)
				if (propFound) {
					valueMain = propFound.value
				}
			}

			const bonus = Calculate(getPropType, valueMain)

			const mainPropHash = hashEntry.textMapContentTextMapHash
			obj.name = General.addMultiLangNamesAsObject(
				mainPropHash.toString(),
				LANG_GI,
				FOLDER_GI,
				obj.game,
				` (${bonus} > R${maxRank}LV${maxLevel})`
			)

			//log.info("reliquary main:", obj)

			// add to datebase
			var isAdd = await General.itemAdd(obj, rebuild)
			log.info(`ReliquaryMain add > ${obj.id} (${obj.type}) is rebuild: ${rebuild} = db ${isAdd}`)
		}

		// Process Sub Artifact
		log.info(`Try to update Reliquary Sub`)
		for (const sub of Object.values(getReliquarySub)) {
			const id = sub.id
			const name = sub.propType

			const hashEntry = Object.values(getManualTextMap).find((item) => item.textMapId === name)
			if (!hashEntry) {
				log.warn(`ReliquarySub not found`, name)
				continue
			}

			const obj: ItemArtifactSub = {
				type: 8, // 8=ArtifactSub
				game: 1,
				id,
				name: {},
				desc: {},
				icon: "",
				grup: sub.depotId
			}

			if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
				log.info(`ReliquarySub already exists, skipping ${obj.id} (${obj.type})`)
				continue
			}

			const bonus = Calculate(name, sub.propValue)

			const mainPropHash = hashEntry.textMapContentTextMapHash
			obj.name = General.addMultiLangNamesAsObject(
				mainPropHash.toString(),
				LANG_GI,
				FOLDER_GI,
				obj.game,
				` (${bonus})`
			)

			//log.info("reliquary sub:", obj)

			// add to datebase
			var isAdd = await General.itemAdd(obj, rebuild)
			log.info(`ReliquarySub add > ${obj.id} (${obj.type}) is rebuild: ${rebuild} = db ${isAdd}`)
		}

		// Process Artifact (Item)
		log.info(`Try to update Reliquary Config`)
		for (const item of Object.values(getReliquaryConfig)) {
			const nameItemHash = item.nameTextMapHash
			const descriptionItemHash = item.descTextMapHash
			const id = item.id
			const rank = item.rankLevel
			const iconName = item.icon
			//const name = getHashLANG[hash] || getHashCN[hash] || 'N/A';

			const hashEntry = Object.values(getManualTextMap).find((itemFind) => itemFind.textMapId === item.equipType)
			if (!hashEntry) {
				log.warn(`ReliquaryConfig not found`, nameItemHash)
				continue
			}
			const nameIndexHash = hashEntry.textMapContentTextMapHash

			const obj: ItemArtifactConfig = {
				type: 9, // 9=ArtifactConfig
				game: 1,
				id,
				name: {},
				desc: {},
				icon: "",
				equipType: item.equipType,
				mainPropDepotId: item.mainPropDepotId,
				appendPropDepotId: item.appendPropDepotId,
				rankLevel: rank
			}
			if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
				log.info(`ReliquaryConfig already exists, skipping ${obj.id} (${obj.type})`)
				continue
			}

			obj.desc = General.addMultiLangNamesAsObject(descriptionItemHash.toString(), LANG_GI, FOLDER_GI, obj.game)

			var nameList1 = General.addMultiLangNamesAsObject(nameItemHash.toString(), LANG_GI, FOLDER_GI, obj.game) // HEAD
			var nameList2 = General.addMultiLangNamesAsObject(nameIndexHash.toString(), LANG_GI, FOLDER_GI, obj.game) // BODY

			var name_final: Record<string, string> = {}
			var nameLists = [nameList1, nameList2]
			var allLangs = new Set<string>()
			nameLists.forEach((n) => Object.keys(n).forEach((lang) => allLangs.add(lang)))
			allLangs.forEach((lang) => {
				name_final[lang] =
					nameLists
						.map((name) => name[lang])
						.filter((text) => typeof text === "string" && text.trim() !== "")
						.join(" - ") + ` (R${rank})`
			})
			/*
            if (Object.keys(name_final).length === 0) {
                name_final = {
                    EN: mName
                }
            }
            
			obj.name = name_final
			if (!isEmpty(iconName)) {
				obj.icon = await General.downloadImageOrCopyLocal(
					`${DUMP_GI}/${iconName}.png`, // local file dump (private)
					`${FOLDER_GI}/icon/artifact/${iconName}.png`, // local file (public)
					`${domainPublic}/resources/${nameGame}/icon/artifact/${iconName}.png`, // url public
					`https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/${iconName}.png` // fallback url
				)
			}

			//log.info("reliquary config:", obj)

			// add to datebase
			var isAdd = await General.itemAdd(obj, rebuild)
			log.info(`ReliquaryConfig add > ${obj.id} (${obj.type}) is rebuild: ${rebuild} = db ${isAdd}`)
		}
	}

	async runGadget(rebuild: boolean): Promise<void> {
		const getGadget = this.excel.getConfig("GadgetExcelConfigData.json")
		if (!getGadget) {
			log.errorNoStack(`Error get GadgetExcelConfigData.json`)
			return
		}
		for (const data of Object.values(getGadget)) {
			if (data && data.id) {
				const id = data.id
				const nameJson = data.jsonName

				const obj: ItemGadget = {
					type: 6, // 6=gadget
					game: 1,
					id,
					name: {},
					desc: {},
					icon: "", // TODO: add icon
					typeGadget: data.type
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Gadget already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name
				obj.desc = General.addMultiLangNamesAsObject(
					data.nameTextMapHash.toString(),
					LANG_GI,
					FOLDER_GI,
					obj.game
				)
				// add desc
				obj.name = General.addMultiLangNamesAsObject(
					data.interactNameTextMapHash.toString(),
					LANG_GI,
					FOLDER_GI,
					obj.game,
					nameJson
				)

				//log.info("gadget data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Gadget add > ${obj.id} is rebuild: ${rebuild} = db ${isAdd}`)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runScene(rebuild: boolean): Promise<void> {
		const getScene = this.excel.getConfig("SceneExcelConfigData.json")
		if (!getScene) {
			log.errorNoStack(`Error get SceneExcelConfigData.json`)
			return
		}
		for (const data of Object.values(getScene)) {
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
					log.info(`Scene already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name
				const name =
					`${data.scriptData}` + (data.levelEntityConfig == "" ? "" : " (" + data.levelEntityConfig + ")")
				obj.name = {
					EN: name
				}

				//log.info("scene data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Scene add > ${obj.id} is rebuild: ${rebuild} = db ${isAdd}`)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runWeapon(rebuild: boolean): Promise<void> {
		const getWeapon = this.excel.getConfig("WeaponExcelConfigData.json")
		if (!getWeapon) {
			log.errorNoStack(`Error get WeaponExcelConfigData.json`)
			return
		}
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
					log.info(`Weapon already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				obj.icon = await General.downloadImageOrCopyLocal(
					`${DUMP_GI}/${iconName}.png`, // local file dump (private)
					`${FOLDER_GI}/icon/weapon/${iconName}.png`, // local file (public)
					`${domainPublic}/resources/${nameGame}/icon/weapon/${iconName}.png`, // url public
					`https://feixiaoqiu.com/static/images/weapon/${iconName}.png` // fallback url
				)

				// add name
				obj.name = General.addMultiLangNamesAsObject(hash.toString(), LANG_GI, FOLDER_GI, obj.game)

				//log.info("weapon data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Weapon add > ${obj.id} is rebuild: ${rebuild} = db ${isAdd}`)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runMonster(rebuild: boolean): Promise<void> {
		const getMonsterData = this.excel.getConfig("MonsterExcelConfigData.json")
		if (!getMonsterData) {
			log.errorNoStack(`Error get MonsterExcelConfigData.json`)
			return
		}
		const getMonsterNama = this.excel.getConfig("MonsterDescribeExcelConfigData.json")
		if (!getMonsterNama) {
			log.errorNoStack(`Error get MonsterDescribeExcelConfigData.json`)
			return
		}
		const getMonsterNameSpecialExcel = this.excel.getConfig("MonsterSpecialNameExcelConfigData.json")
		if (!getMonsterNameSpecialExcel) {
			log.errorNoStack(`Error get MonsterSpecialNameExcelConfigData.json`)
			return
		}

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
					log.info(`Monster already exists, skipping ${obj.id} (${obj.type})`)
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
						`${domainPublic}/resources/${nameGame}/icon/monster/${iconPath}.png`, // url public
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

				//log.info("monster data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Monster add > ${obj.id} is rebuild: ${rebuild} = db ${isAdd}`)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runItem(rebuild: boolean): Promise<void> {
		for (const [filePath, clazz] of Object.entries(EXCEL_GI)) {
			if (clazz !== ClassItemExcel) continue

			log.info(`Try to update ${filePath} data`)
			const getItem = this.excel.getConfig(filePath as keyof typeof EXCEL_GI) as ClassItemExcel
			if (!getItem) {
				log.errorNoStack(`Error get ${filePath}`)
				return
			}

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
						log.info(`Item already exists, skipping ${obj.id} (${obj.type})`)
						continue
					}

					obj.icon = await General.downloadImageOrCopyLocal(
						`${DUMP_GI}/${iconName}.png`, // local file dump (private)
						`${FOLDER_GI}/icon/item/${iconName}.png`, // local file (public)
						`${domainPublic}/resources/${nameGame}/icon/item/${iconName}.png`, // url public
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

					//log.info("item data:", obj)

					// add to datebase
					var isAdd = await General.itemAdd(obj, rebuild)
					log.info(`Item add > ${obj.id} is rebuild: ${rebuild} = db ${isAdd}`)

					//await sleep(5)
				} else {
					log.info("skip", data)
				}
			}
		}
	}
        */

	async runAvatar(rebuild: boolean): Promise<void> {
		log.info(`Try to update Avatar data`)
		const getAvatar = this.excel.getConfig("AvatarConfig.json")
		if (!getAvatar) {
			log.errorNoStack(`Error get AvatarExcelConfigData.json`)
			return
		}
		const getAvatarItem = this.excel.getConfig("ItemConfigAvatar.json")
		if (!getAvatarItem) {
			log.errorNoStack(`Error get ItemConfigAvatar.json`)
			return
		}
		for (const data of Object.values(getAvatar)) {
			if (data) {
				const id = data.AvatarID
				const iconName = data.AvatarSideIconPath.toLocaleLowerCase()

				const obj: ItemAvatar = {
					type: 1, // 1=avatar
					game: 2,
					id,
					name: {},
					desc: {},
					icon: "",
					weaponType: data.DamageType,
					qualityType: data.Rarity,
					bodyType: data.AvatarBaseType
				}

				// bruh
				var isBoy = false
				if (data.UIAvatarModelPath.includes("Boy")) {
					isBoy = true
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Avatar already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				obj.icon = await General.downloadImageOrCopyLocal(
					`${DUMP_SR}/${iconName}`, // local file dump (private)
					`${FOLDER_SR}/icon/avatar/${id}.png`, // local file (public)
					`${domainPublic}/resources/${nameGame}/icon/avatar/${id}.png`, // url public
					`https://enka.network/ui/hsr/SpriteOutput/AvatarRoundIcon/${id}.png` // fallback url
				)

				// add name
				obj.name = General.addMultiLangNamesAsObject(
					data.AvatarName.Hash.toString(),
					LANG_SR,
					FOLDER_SR,
					obj.game,
					"",
					`${isBoy ? "Boy" : "Girl"} ${obj.weaponType}` // TODO: find NT name this
				)
				// add desc
				var infoAvatar = Object.values(getAvatarItem).find((item) => item.ID === id)
				if (infoAvatar && !isEmpty(infoAvatar.ItemBGDesc.Hash)) {
					obj.desc = General.addMultiLangNamesAsObject(
						infoAvatar.ItemBGDesc.Hash.toString(),
						LANG_SR,
						FOLDER_SR,
						obj.game
					)
				} else {
					obj.desc = {
						EN: `UNKD-${id}`
					}
				}

				//log.info("Avatar data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Avatar add > ${obj.id} (G${obj.game}) is rebuild: ${rebuild} = db ${isAdd}`)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}
}

const _ = new SR()
export default _
