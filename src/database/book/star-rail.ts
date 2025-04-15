import Logger from "@UT/logger"
import {
	ClassAvatarExcelSR,
	ClassEquipmentExcelSR,
	ClassItemExcelSR,
	ClassMazePlaneExcelSR,
	ClassMonsterExcelSR,
	ClassMonsterTemplateExcelSR,
	ClassStageConfigExcelSR,
	ItemAvatar,
	ItemData,
	ItemMonster,
	ItemNormal,
	ItemPlane,
	ItemStage,
	ItemWeapon
} from "@UT/response"
import { isEmpty, sleep } from "@UT/library"
import { domainPublic } from "@UT/share"
import ExcelManager from "@UT/excel"
// thrid party
import { isMainThread } from "worker_threads"
// datebase
import General from "@DB/book/general"
import path from "path"
import { count } from "console"

const nameGame = "star-rail"

const log = new Logger(nameGame.replace("-", " ").toLocaleUpperCase())

export const REPO_SR = "Dimbreath/turnbasedgamedata"
export const REPO_BRANCH_SR = "main"
export const PATHBIN_SR = `ExcelOutput`
export const FOLDER_SR = `./src/server/web/public/resources/${nameGame}`
export const LANG_SR = ["CHS", "CHT", "DE", "EN", "ES", "FR", "ID", "JP", "KR", "PT", "RU", "TH", "VI"] // TODO: TH_0(GI)=TH(SR),TH_1
export const EXCEL_SR = {
	"AvatarConfig.json": ClassAvatarExcelSR,
	"EquipmentConfig.json": ClassEquipmentExcelSR,
	"MonsterConfig.json": ClassMonsterExcelSR, // info basic monster
	"MonsterTemplateConfig.json": ClassMonsterTemplateExcelSR, // get icon monster
	"MazePlane.json": ClassMazePlaneExcelSR, // This is different from scenes like in GI because they have floor id so they have to be made into different classes
	"StageConfig.json": ClassStageConfigExcelSR, // This scene in SR but for battle
	"ItemConfig.json": ClassItemExcelSR,
	"ItemConfigAvatar.json": ClassItemExcelSR,
	"ItemConfigAvatarPlayerIcon.json": ClassItemExcelSR,
	"ItemConfigAvatarRank.json": ClassItemExcelSR,
	"ItemConfigAvatarSkin.json": ClassItemExcelSR,
	//"ItemConfigAvatarTest.json": ClassItemExcelSR,
	//"ItemConfigAvatarTestRank.json": ClassItemExcelSR,
	"ItemConfigBook.json": ClassItemExcelSR,
	"ItemConfigDisk.json": ClassItemExcelSR,
	"ItemConfigEquipment.json": ClassItemExcelSR, // > light cone class
	"ItemConfigRelic.json": ClassItemExcelSR, // > Relic class
	"ItemConfigTrainDynamic.json": ClassItemExcelSR
} as const
// file only in PC not in server (TODO: auto move file local to server)
export const DUMP_SR = "../../../../Docker/SR/sr/SR_Resources/Tool/dump"

// SR function
enum ItemRarity {
	Unknown = 0,
	Normal = 1,
	NotNormal = 2,
	Rare = 3,
	VeryRare = 4,
	SuperRare = 5
}
function getStarSR(name: string): number {
	return (ItemRarity as any)[name] ?? -1
}
enum AvatarBaseType {
	Unknown = 0,
	Warrior = 1,
	Rogue = 2,
	Mage = 3,
	Shaman = 4,
	Warlock = 5,
	Knight = 6,
	Priest = 7,
	Memory = 8
}
// in SR AvatarBase just like weaponType in GI, its call light cone
function getAvatarBase(name: string): number {
	return (AvatarBaseType as any)[name] ?? -1
}
function getAvatarBaseNumber(id: number): string {
	return AvatarBaseType[id] ?? "Unknown"
}
enum DamageType {
	Physical = 1000111,
	Fire = 1000112,
	Ice = 1000113,
	Thunder = 1000114,
	Wind = 1000115,
	Quantum = 1000116,
	Imaginary = 1000117
}
// in SR DamageType just like elementType in GI, its call ???
function getDamageType(name: string): number {
	return (DamageType as any)[name] ?? -1
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
		//await this.runPlane(foce_save)
        await this.runStage(foce_save)
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
*/

	async runStage(rebuild: boolean): Promise<void> {
		const getStage = this.excel.getConfig("StageConfig.json")
		if (!getStage) {
			log.errorNoStack(`Error get StageConfig.json`)
			return
		}

		// Stage
		for (const data of Object.values(getStage)) {
			if (data) {
				const id = data.StageID
				const nameStage = data.StageName.Hash
				const typeStage = data.StageType

				const obj: ItemStage = {
					type: 12, // 12=Stage for SR
					game: 2,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
                    // other
					stageType: typeStage,
                    stageLevel: data.Level,					
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Stage already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name
                /*
                TODO: get better info
                ChallengeGroupConfig (Moc)
                ChallengeStoryGroupConfig (Pure Fiction Enemies)
                ChallengeBossGroupConfig (Apocalytic Shadow Enemies)
                */
				obj.name = General.addMultiLangNamesAsObject(nameStage.toString(), LANG_SR, FOLDER_SR, obj.game, ` (${typeStage}) (L${data.Level})`)

				//log.info("stage data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Scene add > ${obj.id} (T${obj.type}-G${obj.game}) is rebuild: ${rebuild} = db ${isAdd}`)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runPlane(rebuild: boolean): Promise<void> {
		const getPlane = this.excel.getConfig("MazePlane.json")
		if (!getPlane) {
			log.errorNoStack(`Error get MazePlane.json`)
			return
		}

		// World Scene
		for (const data of Object.values(getPlane)) {
			if (data) {
				const id = data.PlaneID
				const namePlane = data.PlaneName.Hash
				const typePlane = data.PlaneType

				if (!["Train", "Town", "Maze"].includes(typePlane)) continue

				const obj: ItemPlane = {
					type: 11, // 11=Plane for SR
					game: 2,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",					
					// other
                    planeType: typePlane,
					worldId: data.WorldID,
					startFloorId: data.StartFloorID,
					floorIdList: data.FloorIDList
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Plane already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name
				obj.name = General.addMultiLangNamesAsObject(namePlane.toString(), LANG_SR, FOLDER_SR, obj.game)

				//log.info("plane data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Plane add > ${obj.id} (T${obj.type}-G${obj.game}) is rebuild: ${rebuild} = db ${isAdd}`)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runWeapon(rebuild: boolean): Promise<void> {
		const getWeapon = this.excel.getConfig("EquipmentConfig.json")
		if (!getWeapon) {
			log.errorNoStack(`Error get EquipmentConfig.json`)
			return
		}
		const getEquipmentItem = this.excel.getConfig("ItemConfigEquipment.json")
		if (!getEquipmentItem) {
			log.errorNoStack(`Error get ItemConfigEquipment.json`)
			return
		}
		for (const data of Object.values(getWeapon)) {
			if (data) {
				const id = data.EquipmentID

				// Config
				var infoItem = Object.values(getEquipmentItem).find((item) => item.ID === id)
				if (!infoItem) {
					log.warn(`Weapon not found: `, id)
					continue
				}

				const hash1 = data.EquipmentName.Hash
				const hash2 = infoItem.ItemBGDesc.Hash
				const hash3 = infoItem.ItemDesc.Hash
				const iconPath = infoItem.ItemIconPath.toLocaleLowerCase()

				const obj: ItemWeapon = {
					type: 4, // 4=weapon
					game: 2,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
                    // other
					starType: getStarSR(infoItem.Rarity), // get star from item not weapon ?
					weaponType: getAvatarBase(data.AvatarBaseType)					
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Weapon already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				obj.icon = await General.downloadImageOrCopyLocal(
					`${DUMP_SR}/${iconPath}`, // local file dump (private)
					`${FOLDER_SR}/icon/weapon/${id}.png`, // local file (public)
					`${domainPublic}/resources/${nameGame}/icon/weapon/${id}.png`, // url public
					`https://api.hakush.in/hsr/UI/lightconemediumicon/${id}.webp` // TODO: find fallback url
				)
				// https://sr.yatta.moe/hsr/assets/UI//equipment/medium/${id}.png

				// add name
				obj.name = General.addMultiLangNamesAsObject(hash1.toString(), LANG_SR, FOLDER_SR, obj.game)
				// add desc
				obj.desc = General.addMultiLangNamesAsObject(hash2.toString(), LANG_SR, FOLDER_SR, obj.game)
				// add desc2
				obj.desc2 = General.addMultiLangNamesAsObject(hash3.toString(), LANG_SR, FOLDER_SR, obj.game)

				//log.info("weapon data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Weapon add > ${obj.id} (T${obj.type}-G${obj.game}) is rebuild: ${rebuild} = db ${isAdd}`)

				await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runMonster(rebuild: boolean): Promise<void> {
		const getMonsterConfig = this.excel.getConfig("MonsterConfig.json")
		if (!getMonsterConfig) {
			log.errorNoStack(`Error get MonsterConfig.json`)
			return
		}
		const getMonsterTemplate = this.excel.getConfig("MonsterTemplateConfig.json")
		if (!getMonsterTemplate) {
			log.errorNoStack(`Error get MonsterTemplateConfig.json`)
			return
		}

		for (const data of Object.values(getMonsterTemplate)) {
			if (data) {
				const id = data.MonsterTemplateID

				// Config
				var infoMonster = Object.values(getMonsterConfig).find(
					(item) => item.MonsterTemplateID === data.MonsterTemplateID
				)
				if (!infoMonster) {
					log.warn(`Monster not found: `, id)
					continue
				}

				var hashName = infoMonster.MonsterName.Hash
				var hashInfo = infoMonster.MonsterIntroduction.Hash

				const obj: ItemMonster = {
					type: 3, // 3=monster
					game: 2,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
                    // other
					typeMonster: data.Rank
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Monster already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				const iconPath = data.RoundIconPath.toLocaleLowerCase()

				if (!isEmpty(iconPath)) {
					obj.icon = await General.downloadImageOrCopyLocal(
						`${DUMP_SR}/${iconPath}`, // local file dump (private)
						`${FOLDER_SR}/icon/monster/${id}.png`, // local file (public)
						`${domainPublic}/resources/${nameGame}/icon/monster/${id}.png`, // url public
						`` // TODO: find fallback url
					)
				}

				// add name
				obj.name = General.addMultiLangNamesAsObject(hashName.toString(), LANG_SR, FOLDER_SR, obj.game)
				// add desc
				obj.desc = General.addMultiLangNamesAsObject(hashInfo.toString(), LANG_SR, FOLDER_SR, obj.game)

				//log.info("monster data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Monster add > ${obj.id} (T${obj.type}-G${obj.game}) is rebuild: ${rebuild} = db ${isAdd}`)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runItem(rebuild: boolean): Promise<void> {
		for (const [filePath, clazz] of Object.entries(EXCEL_SR)) {
			if (clazz !== ClassItemExcelSR) continue

			// not necessary here
			if (filePath === "ItemConfigEquipment.json") continue
			if (filePath === "ItemConfigRelic.json") continue

			log.info(`Try to update ${filePath} data`)

			const getItem = this.excel.getConfig(filePath as keyof typeof EXCEL_SR) as ClassItemExcelSR
			if (!getItem) {
				log.errorNoStack(`Error get ${filePath}`)
				return
			}
			for (const data of Object.values(getItem)) {
				if (data) {
					const id = data.ID
					const typeSub = data.ItemSubType
					const iconPath = data.ItemIconPath.toLocaleLowerCase()

					let obj: ItemNormal = {
						type: 2,
						game: 2,
						id,
						name: {},
						desc: {},
						desc2: {},
						icon: "",
                        // other
						starType: getStarSR(data.Rarity),
						itemType: typeSub						
					}

					if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
						log.info(`Item already exists, skipping ${obj.id} (${obj.type})`)
						continue
					}

					if (!isEmpty(iconPath)) {
						obj.icon = await General.downloadImageOrCopyLocal(
							`${DUMP_SR}/${iconPath}`, // local file dump (private)
							`${FOLDER_SR}/icon/item/${id}.png`, // local file (public)
							`${domainPublic}/resources/${nameGame}/icon/item/${id}.png`, // url public
							`` // TODO: find fallback url
						)
					}

					// add name
					if (data.ItemName && !isEmpty(data.ItemName.Hash)) {
						obj.name = General.addMultiLangNamesAsObject(
							data.ItemName.Hash.toString(),
							LANG_SR,
							FOLDER_SR,
							obj.game
						)
					} else {
						log.warn(`skip item ${id} (${typeSub}) > ${filePath}`)
						// TODO: Mission,TravelBrochurePaster,ChessRogueDiceSurface,Virtual,Gift,PlanetFesItem
						continue
					}

					// add desc
					if (data.ItemBGDesc && !isEmpty(data.ItemBGDesc.Hash)) {
						obj.desc = General.addMultiLangNamesAsObject(
							data.ItemBGDesc.Hash.toString(),
							LANG_SR,
							FOLDER_SR,
							obj.game
						)
					}
					// add desc2
					if (data.ItemDesc && !isEmpty(data.ItemDesc.Hash)) {
						obj.desc2 = General.addMultiLangNamesAsObject(
							data.ItemDesc.Hash.toString(),
							LANG_SR,
							FOLDER_SR,
							obj.game
						)
					}

					//log.info("item data:", obj)

					// add to datebase
					var isAdd = await General.itemAdd(obj, rebuild)
					log.info(`Item add > ${obj.id} (T${obj.type}-G${obj.game}) is rebuild: ${rebuild} = db ${isAdd}`)

					//await sleep(5)
				} else {
					log.info("skip", data)
				}
			}
		}
	}

	async runAvatar(rebuild: boolean): Promise<void> {
		log.info(`Try to update Avatar data`)
		const getAvatar = this.excel.getConfig("AvatarConfig.json")
		if (!getAvatar) {
			log.errorNoStack(`Error get AvatarConfig.json`)
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
				const iconPath = data.AvatarSideIconPath.toLocaleLowerCase()

				var infoCard = Object.values(getAvatarItem).find((item) => item.ID === id)
				if (!infoCard) {
					log.warn(`Avatar card not found`, id)
					continue
				}

				var wp = getAvatarBase(data.AvatarBaseType)
				const obj: ItemAvatar = {
					type: 1, // 1=avatar
					game: 2,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
                    // other
					starType: getStarSR(infoCard.Rarity), // maybe just use star item (infoCard) instead of star avatar in getAvatar (CombatPowerAvatarRarityType4)
					weaponType: wp,
					elementType: getDamageType(data.DamageType),
					bodyType: -1 //isBoy ? 1 : 2 // TODO: get better bodytype
				}

				// only main character
				var isBoy = false
				if (data.UIAvatarModelPath.includes("Boy")) {
					isBoy = true
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Avatar already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				obj.icon = await General.downloadImageOrCopyLocal(
					`${DUMP_SR}/${iconPath}`, // local file dump (private)
					`${FOLDER_SR}/icon/avatar/${id}.png`, // local file (public)
					`${domainPublic}/resources/${nameGame}/icon/avatar/${id}.png`, // url public
					`https://api.hakush.in/hsr/UI/avatarroundicon/${id}.webp` // fallback url
				)
				// https://enka.network/ui/hsr/SpriteOutput/AvatarRoundIcon/${id}.png

				// add name
				obj.name = General.addMultiLangNamesAsObject(
					data.AvatarName.Hash.toString(),
					LANG_SR,
					FOLDER_SR,
					obj.game,
					"",
					`${isBoy ? "Boy" : "Girl"} ${getAvatarBaseNumber(wp)}` // TODO: find NT name this
				)
				// add desc
				if (infoCard.ItemBGDesc && !isEmpty(infoCard.ItemBGDesc.Hash)) {
					obj.desc = General.addMultiLangNamesAsObject(
						infoCard.ItemBGDesc.Hash.toString(),
						LANG_SR,
						FOLDER_SR,
						obj.game
					)
				}

				//log.info("Avatar data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild)
				log.info(`Avatar add > ${obj.id} (T${obj.type}-G${obj.game}) is rebuild: ${rebuild} = db ${isAdd}`)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}
}

const _ = new SR()
export default _
