import Logger from "@UT/logger"
import {
	ClassAvatarExcelGI,
	ClassAvatarSkillDepotExcelGI,
	ClassAvatarSkillExcelGI,
	ClassGadgetExcel,
	ClassItemExcelGI,
	ClassManualTextMapExcel,
	ClassMonsterExcel,
	ClassMonsterNameExcel,
	ClassMonsterNameSpecialExcel,
	ClassQuestExcel,
	ClassReliquaryAffixExcel,
	ClassReliquaryExcel,
	ClassReliquaryLevelExcel,
	ClassReliquaryMainPropExcel,
	ClassSceneExcel,
	ClassWeaponExcel,
	ItemArtifactConfig,
	ItemArtifactMain,
	ItemArtifactSub,
	ItemAvatar,
	ItemGadget,
	ItemMonster,
	ItemNormal,
	ItemQuest,
	ItemScene,
	ItemWeapon
} from "@UT/response"
import { isEmpty } from "@UT/library"
import { domainPublic } from "@UT/share"
import ExcelManager from "@UT/excel"
// thrid party
import { isMainThread } from "worker_threads"
// datebase
import General from "@DB/book/general"

const nameGame = "genshin-impact"

const log = new Logger(nameGame.replace("-", " ").toLocaleUpperCase())

export const REPO_GI = "Dimbreath/AnimeGameData"
export const REPO_BRANCH_GI = "master"
export const PATHBIN_GI = `ExcelBinOutput`
export const FOLDER_GI = `./src/server/web/public/resources/${nameGame}`
export const LANG_GI = ["CHS", "CHT", "DE", "EN", "ES", "FR", "ID", "IT", "JP", "KR", "PT", "RU", "TR", "VI"] // TODO: TH_0,TH_1
export const EXCEL_GI = {
	"AvatarExcelConfigData.json": ClassAvatarExcelGI,
	"AvatarSkillDepotExcelConfigData.json": ClassAvatarSkillDepotExcelGI, // get depo skill
	"AvatarSkillExcelConfigData.json": ClassAvatarSkillExcelGI, // get elemental skill
	"MaterialExcelConfigData.json": ClassItemExcelGI,
	"HomeWorldFurnitureExcelConfigData.json": ClassItemExcelGI,
	"MonsterExcelConfigData.json": ClassMonsterExcel,
	"MonsterDescribeExcelConfigData.json": ClassMonsterNameExcel,
	"MonsterSpecialNameExcelConfigData.json": ClassMonsterNameSpecialExcel,
	"WeaponExcelConfigData.json": ClassWeaponExcel,
	"SceneExcelConfigData.json": ClassSceneExcel,
	"GadgetExcelConfigData.json": ClassGadgetExcel,
	"ManualTextMapConfigData.json": ClassManualTextMapExcel,
	"ReliquaryExcelConfigData.json": ClassReliquaryExcel,
	"ReliquaryMainPropExcelConfigData.json": ClassReliquaryMainPropExcel,
	"ReliquaryAffixExcelConfigData.json": ClassReliquaryAffixExcel,
	"ReliquaryLevelExcelConfigData.json": ClassReliquaryLevelExcel,
	"QuestExcelConfigData.json": ClassQuestExcel // TODO: maybe we need use yuuki res (because dim never update this or it is incomplete.)
	//"ExcelBinOutput/AvatarCurveExcelConfigData.json": ItemReliquary,
} as const
// file only in PC not in server (TODO: auto move file local to server)
export const DUMP_GI = "../../../../Docker/GS/gs/GC-Resources/tool/resources_tmp/dump"

// GI function
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
/*
Data Weapon Star (5.5)
1 - common (11)
2 - ??? (5)
3 - blue (28)
4 - purple (123)
5 - orange (71)
*/
// This should use only for avatar not for weapon, weapon rank is number so no need?
function getStar(quality: string): number {
	switch (quality) {
		case "QUALITY_BLUE":
		case "3":
			return 3
		case "QUALITY_PURPLE":
		case "4":
			return 4
		case "QUALITY_ORANGE":
		case "5":
			return 5
		case "QUALITY_ORANGE_SP": // lol only Aloy
		case "6":
			return 6
		default:
			return -1
	}
}
enum WeaponType {
	WEAPON_NONE = 0,
	WEAPON_SWORD_ONE_HAND = 1,
	WEAPON_CROSSBOW = 2,
	WEAPON_STAFF = 3,
	WEAPON_DOUBLE_DAGGER = 4,
	WEAPON_KATANA = 5,
	WEAPON_SHURIKEN = 6,
	WEAPON_STICK = 7,
	WEAPON_SPEAR = 8,
	WEAPON_SHIELD_SMALL = 9,
	WEAPON_CATALYST = 10,
	WEAPON_CLAYMORE = 11,
	WEAPON_BOW = 12,
	WEAPON_POLE = 13
}
enum BodyType {
	BODY_BOY = 1,
	NPC_MALE = 1,
	BODY_MALE = 1,
	BODY_GIRL = 2,
	BODY_LADY = 2,
	NPC_FEMALE = 2,
	BODY_LOLI = 2, // most girl and testing stuff here lol why hoyo
}
enum ElementType {
	None = 0,
	Fire = 1,
	Water = 2,
	Grass = 3,
	Electric = 4,
	Ice = 5,
	Frozen = 6,
	Wind = 7,
	Rock = 8,
	AntiFire = 9,
	Default = 255
}
function getWeaponTypeNumber(name: string): number {
	return (WeaponType as any)[name] ?? -1
}
function getBodyTypeNumber(name: string): number {
	return (BodyType as any)[name] ?? -1
}
function getElementType(name: string): number {
	return (ElementType as any)[name] ?? -1
}
class GI {
	private excel!: ExcelManager<typeof EXCEL_GI>
	constructor() {
		if (isMainThread) {
			log.info(`This is GI main thread`)
		} else {
			log.info(`This is GI another thread`)
		}
	}

	public async Update(
		skip_update: boolean = false,
		foce_save: boolean = false,
		dont_build: boolean = false
	): Promise<void> {
		log.info(`Try to update Genshin Impact resources`)

		var skip_dl = true
		if (await General.checkGit(REPO_GI, "commit_gi", skip_update)) {
			log.info(`Update available`)
			skip_dl = false
		} else {
			log.info(`No update available: ${REPO_GI} > skip? ${skip_update}`)
		}

		log.info(`Downloading localization files`)
		for (const lang of LANG_GI) {
			await General.downloadGit(REPO_GI, FOLDER_GI, `TextMap/TextMap${lang}.json`, skip_dl, REPO_BRANCH_GI)
		}

		log.info(`Downloading Excel files`)
		this.excel = new ExcelManager(REPO_GI, FOLDER_GI, EXCEL_GI, skip_dl, REPO_BRANCH_GI, PATHBIN_GI)
		await this.excel.loadFiles()

		if (dont_build) {
			log.info(`Skip build item data`)
			return
		}

		log.info(`Building item data`)
		await this.runAvatar(foce_save)
		await this.runItem(foce_save)
		await this.runMonster(foce_save)
		await this.runWeapon(foce_save)
		await this.runScene(foce_save)
		await this.runGadget(foce_save)
		await this.runReliquary(foce_save)
		await this.runQuest(foce_save)
	}

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
					desc2: {},
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
				desc2: {},
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
				desc2: {},
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
				desc2: {},
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
			*/
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
					desc2: {},
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
					desc2: {},
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
					desc2: {},
					icon: "",
					starType: getStar(data.rankLevel.toString()), // data.qualityType || data.rankLevel.toString()
					weaponType: getWeaponTypeNumber(data.weaponType)
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
					desc2: {},
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
			if (clazz !== ClassItemExcelGI) continue

			log.info(`Try to update ${filePath} data`)
			const getItem = this.excel.getConfig(filePath as keyof typeof EXCEL_GI) as ClassItemExcelGI
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
						desc2: {},
						icon: "",
						starType: data.rankLevel, // TODO: maybe need string?
						itemType: data.itemType,
						// other
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

	async runAvatar(rebuild: boolean): Promise<void> {
		log.info(`Try to update Avatar data`)
		const getAvatar = this.excel.getConfig("AvatarExcelConfigData.json")
		if (!getAvatar) {
			log.errorNoStack(`Error get AvatarExcelConfigData.json`)
			return
		}
		const getAvatarSkillDepot = this.excel.getConfig("AvatarSkillDepotExcelConfigData.json")
		if (!getAvatarSkillDepot) {
			log.errorNoStack(`Error get AvatarSkillDepotExcelConfigData.json`)
			return
		}
		const getAvatarSkill = this.excel.getConfig("AvatarSkillExcelConfigData.json")
		if (!getAvatarSkill) {
			log.errorNoStack(`Error get AvatarSkillExcelConfigData.json`)
			return
		}
		for (const data of Object.values(getAvatar)) {
			if (data && data.nameTextMapHash) {
				const id = data.id
				const iconName = data.iconName

				//if (id < 10000002 || id >= 11000000) continue

				// 10000005 = boy | 10000007 = girl

				var depoData = Object.values(getAvatarSkillDepot).find((item) => item.id === data.skillDepotId)
				if (!depoData) {
					log.warn(`AvatarSkillDepot not found`, id)
					continue
				}
				var e = depoData.energySkill
				var skillData = Object.values(getAvatarSkill).find((item) => item.id === e)
				if (!skillData) {
					log.warn(`AvatarSkill not found`, id)
					continue
				}
				var elementType = getElementType(skillData.costElemType)
				/*
				var bodyType = getBodyTypeNumber(data.bodyType)
				if(bodyType === -1) {
					log.warn(`Avatar bodyType not found`, id)
				}
				*/

				const obj: ItemAvatar = {
					type: 1, // 1=avatar
					game: 1,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
					starType: getStar(data.qualityType.toString()),
					weaponType: getWeaponTypeNumber(data.weaponType),
					elementType,
					bodyType: -1 // TODO: get better bodyType
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Avatar already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				obj.icon = await General.downloadImageOrCopyLocal(
					`${DUMP_GI}/${iconName}.png`, // local file dump (private)
					`${FOLDER_GI}/icon/avatar/${iconName}.png`, // local file (public)
					`${domainPublic}/resources/${nameGame}/icon/avatar/${iconName}.png`, // url public
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

				//log.info("Avatar data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Avatar add > ${obj.id} is rebuild: ${rebuild} = db ${isAdd}`)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}
}

const _ = new GI()
export default _
