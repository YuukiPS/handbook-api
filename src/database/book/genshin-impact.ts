import Logger from "@UT/logger"
import {
	ClassAvatarExcelGI,
	ClassAvatarSkillDepotExcelGI,
	ClassAvatarSkillExcelGI,
	ClassGadgetExcel,
	ClassItemExcelGI,
	ClassManualTextMapExcel,
	ClassMonsterExcelGI,
	ClassMonsterNameExcelGI,
	ClassMonsterNameSpecialExcelGI,
	ClassQuestExcel,
	ClassReliquaryAffixExcel,
	ClassReliquaryExcelGI,
	ClassReliquaryLevelExcel,
	ClassReliquaryMainPropExcel,
	ClassSceneExcelGI,
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
import ExcelManager from "@UT/excel"
// thrid party
import { isMainThread } from "worker_threads"
// datebase
import General from "@DB/general/api"
import { domainPublic } from "@UT/config"

const nameGame = "genshin-impact"
const typeGame = 1

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
	"MonsterExcelConfigData.json": ClassMonsterExcelGI,
	"MonsterDescribeExcelConfigData.json": ClassMonsterNameExcelGI,
	"MonsterSpecialNameExcelConfigData.json": ClassMonsterNameSpecialExcelGI,
	"WeaponExcelConfigData.json": ClassWeaponExcel,
	"SceneExcelConfigData.json": ClassSceneExcelGI,
	"GadgetExcelConfigData.json": ClassGadgetExcel,
	"ManualTextMapConfigData.json": ClassManualTextMapExcel,
	"ReliquaryExcelConfigData.json": ClassReliquaryExcelGI,
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
	BODY_LOLI = 2 // most girl and testing stuff here lol why hoyo
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
enum EquipType {
	EQUIP_NONE = 0,
	EQUIP_BRACER = 1,
	EQUIP_NECKLACE = 2,
	EQUIP_SHOES = 3,
	EQUIP_RING = 4,
	EQUIP_DRESS = 5,
	EQUIP_WEAPON = 6
}
enum MonsterType {
	MONSTER_NONE = 0,
	MONSTER_ORDINARY = 1,
	MONSTER_BOSS = 2,
	MONSTER_ENV_ANIMAL = 3,
	MONSTER_LITTLE_MONSTER = 4,
	MONSTER_FISH = 5
}
enum EntityType {
	None = 0,
	Avatar = 1,
	Monster = 2,
	Bullet = 3,
	AttackPhyisicalUnit = 4,
	AOE = 5,
	Camera = 6,
	EnviroArea = 7,
	Equip = 8,
	MonsterEquip = 9,
	Grass = 10,
	Level = 11,
	NPC = 12,
	TransPointFirst = 13,
	TransPointFirstGadget = 14,
	TransPointSecond = 15,
	TransPointSecondGadget = 16,
	DropItem = 17,
	Field = 18,
	Gadget = 19,
	Water = 20,
	GatherPoint = 21,
	GatherObject = 22,
	AirflowField = 23,
	SpeedupField = 24,
	Gear = 25,
	Chest = 26,
	EnergyBall = 27,
	ElemCrystal = 28,
	Timeline = 29,
	Worktop = 30,
	Team = 31,
	Platform = 32,
	AmberWind = 33,
	EnvAnimal = 34,
	SealGadget = 35,
	Tree = 36,
	Bush = 37,
	QuestGadget = 38,
	Lightning = 39,
	RewardPoint = 40,
	RewardStatue = 41,
	MPLevel = 42,
	WindSeed = 43,
	MpPlayRewardPoint = 44,
	ViewPoint = 45,
	RemoteAvatar = 46,
	GeneralRewardPoint = 47,
	PlayTeam = 48,
	OfferingGadget = 49,
	EyePoint = 50,
	MiracleRing = 51,
	Foundation = 52,
	WidgetGadget = 53,
	Vehicle = 54,
	SubEquip = 55,
	FishRod = 56,
	CustomTile = 57,
	FishPool = 58,
	CustomGadget = 59,
	BlackMud = 60,
	RoguelikeOperatorGadget = 61,
	NightCrowGadget = 62,
	Projector = 63,
	Screen = 64,
	EchoShell = 65,
	UIInteractGadget = 66,
	CurveMoveGadget = 67,
	JourneyGearOperatorGadget = 69,
	Partner = 70,
	CoinCollectLevelGadget = 72,
	UgcSpecialGadget = 73,
	UgcTowerLevelUpGadget = 74,
	DeshretObeliskGadget = 71,
	Region = 98,
	PlaceHolder = 99
}
enum SceneType {
	SCENE_NONE = 0,
	SCENE_WORLD = 1,
	SCENE_DUNGEON = 2,
	SCENE_ROOM = 3,
	SCENE_HOME_WORLD = 4,
	SCENE_HOME_ROOM = 5,
	SCENE_ACTIVITY = 6
}
enum QuestShowType {
	QUEST_SHOW = 0,
	QUEST_HIDDEN = 1
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
function getEquipType(name: string): number {
	return (EquipType as any)[name] ?? -1
}
function getEquipTypeName(id: number): string {
	return EquipType[id] ?? "EQUIP_NONE"
}
function getMonsterType(name: string): number {
	return (MonsterType as any)[name] ?? -1
}
function getMonsterTypeName(id: number): string {
	return MonsterType[id] ?? "MONSTER_NONE"
}
function getEntityTypeId(name: string): number {
	return (EntityType as any)[name] ?? -1
}
function getEntityTypeName(id: number): string {
	return EntityType[id] ?? "None"
}
function getSceneTypeId(name: string): number {
	return (SceneType as any)[name] ?? -1
}
function getSceneTypeName(id: number): string {
	return SceneType[id] ?? "SCENE_NONE"
}
function getQuestShowTypeId(name: string): number {
	return (QuestShowType as any)[name] ?? 0
}
function getQuestShowTypeName(id: number): string {
	return QuestShowType[id] ?? "QUEST_SHOW"
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
		dont_build: boolean = false,
		replace: boolean = false
	): Promise<void> {
		log.info(`Try to update Genshin Impact resources`)

		var skip_dl = true
		if (await General.checkGit(REPO_GI, "commit_gi", skip_update)) {
			log.info(`Update available`)
			skip_dl = false
		} else {
			log.info(`No update available: ${REPO_GI} > skip? ${skip_update}`)
		}

		log.debug(`Downloading localization files`)
		for (const lang of LANG_GI) {
			await General.downloadGit(REPO_GI, FOLDER_GI, `TextMap/TextMap${lang}.json`, skip_dl, REPO_BRANCH_GI)
		}

		log.debug(`Downloading Excel files`)
		this.excel = new ExcelManager(REPO_GI, FOLDER_GI, EXCEL_GI, skip_dl, REPO_BRANCH_GI, PATHBIN_GI)
		await this.excel.loadFiles()

		if (dont_build) {
			log.info(`Skip build item data`)
			return
		}

		var demoFastcheck = true

		log.info(`Building item data`)
		await this.runAvatar(foce_save, replace, demoFastcheck)
		await this.runItem(foce_save, replace, demoFastcheck)
		await this.runMonster(foce_save, replace, demoFastcheck)
		await this.runWeapon(foce_save, replace, demoFastcheck)
		await this.runScene(foce_save, replace, demoFastcheck)
		await this.runGadget(foce_save, replace, demoFastcheck)
		await this.runReliquary(foce_save, replace, demoFastcheck)
		await this.runQuest(foce_save, replace, demoFastcheck)
	}

	async runQuest(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
		const getQuest = this.excel.getConfig("QuestExcelConfigData.json")
		if (!getQuest) {
			log.errorNoStack(`Error get QuestExcelConfigData.json`)
			return
		}
		var typeClass = 10
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredQuestData = Object.values(getQuest)
		if (fastcheck) {
			if (!rebuild) {
				filteredQuestData = Object.values(getQuest).filter(
					(data) => !getItemDB.includes(data.mainId) && !getItemDB.includes(data.subId)
				)
			}
		}
		log.warn(`Try update Quest ${filteredQuestData.length}x`)
		for (const data of filteredQuestData) {
			if (data) {
				const idMain = data.mainId
				const idSub = data.subId
				const hashDesc = data.failParent // descTextMapHash
				const hashStep = data.stepDescTextMapHash
				const hashGuide = data.guideTipsTextMapHash

				const obj: ItemQuest = {
					type: typeClass, // 10=quest
					game: typeGame,
					id: idMain,
					subId: idSub,
					name: {},
					desc: {},
					desc2: {},
					guideTips: {},
					icon: "",
					showType: getQuestShowTypeId(data.failCondComb), // showType
					order: data.order
				}

				if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type), { subId: idSub })) {
					log.info(`Quest already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				if (!isEmpty(hashDesc)) {
					obj.name = General.addMultiLangNamesAsObject(hashDesc.toString(), LANG_GI, FOLDER_GI, obj.game)
				}
				if (Object.keys(obj.name).length === 0) {
					//log.warn(`skip quest ${idMain}`)
					//continue
					obj.name = {
						EN: `???` //  ${idMain}/${idSub}
					}
				}

				if (!isEmpty(hashStep)) {
					obj.desc = General.addMultiLangNamesAsObject(hashStep.toString(), LANG_GI, FOLDER_GI, obj.game)
				}
				if (!isEmpty(hashGuide)) {
					obj.guideTips = General.addMultiLangNamesAsObject(
						hashGuide.toString(),
						LANG_GI,
						FOLDER_GI,
						obj.game
					)
				}

				//log.info("quest data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild, replace)
				log.info(
					`Quest add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
				)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runReliquary(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
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
		var typeClass1 = 7
		var getItemDB1 = await General.getItemIds(typeClass1, typeGame)
		var filteredReliquary1 = Object.values(getReliquaryMain)
		if (fastcheck) {
			if (!rebuild) {
				filteredReliquary1 = Object.values(getReliquaryMain).filter((data) => !getItemDB1.includes(data.id))
			}
		}
		log.warn(`Try update Reliquary Main ${filteredReliquary1.length}x`)
		for (const main of filteredReliquary1) {
			const id = main.id
			const getPropType = main.propType

			const hashEntry = Object.values(getManualTextMap).find((item) => item.textMapId === getPropType)
			if (!hashEntry) {
				log.warn(`ReliquaryMain not found`, name)
				continue
			}

			const obj: ItemArtifactMain = {
				type: typeClass1, // 7=ArtifactMain
				game: typeGame,
				id,
				name: {},
				desc: {},
				desc2: {},
				icon: "",
				grup: main.propDepotId
			}
			if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
				log.info(`ReliquaryMain already exists, skipping ${obj.id} (${obj.type})`)
				continue
			}

			const TesLevel = Object.values(getReliquaryLevel).find(
				(entry) =>
					entry.level === maxLevel &&
					entry.rank === maxRank &&
					entry.addProps.some((prop) => prop.propType === getPropType)
			)
			var bonusText = `(??? > R${maxRank}LV${maxLevel})`
			if (TesLevel) {
				const propFound = TesLevel.addProps.find((prop) => prop.propType === getPropType)
				let valueMain = 0
				if (propFound) {
					valueMain = propFound.value
				}
				const bonus = Calculate(getPropType, valueMain)
				bonusText = ` (${bonus} > R${maxRank}LV${maxLevel})`
			}

			const mainPropHash = hashEntry.textMapContentTextMapHash
			obj.name = General.addMultiLangNamesAsObject(
				mainPropHash.toString(),
				LANG_GI,
				FOLDER_GI,
				obj.game,
				"",
				bonusText
			)

			//log.info("reliquary main:", obj)

			// add to datebase
			var isAdd = await General.itemAdd(obj, rebuild, replace)
			log.info(
				`ReliquaryMain add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
			)
		}

		// Process Sub Artifact
		var typeClass2 = 8
		var getItemDB2 = await General.getItemIds(typeClass2, typeGame)
		var filteredReliquary2 = Object.values(getReliquarySub)
		if (fastcheck) {
			if (!rebuild) {
				filteredReliquary2 = Object.values(getReliquarySub).filter((data) => !getItemDB2.includes(data.id))
			}
		}
		log.warn(`Try update Reliquary Sub ${filteredReliquary2.length}x`)
		for (const sub of filteredReliquary2) {
			const id = sub.id
			const name = sub.propType

			const hashEntry = Object.values(getManualTextMap).find((item) => item.textMapId === name)
			if (!hashEntry) {
				log.warn(`ReliquarySub not found`, name)
				continue
			}

			const obj: ItemArtifactSub = {
				type: typeClass2, // 8=ArtifactSub
				game: typeGame,
				id,
				name: {},
				desc: {},
				desc2: {},
				icon: "",
				grup: sub.depotId
			}

			if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
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
				"",
				` (${bonus})`
			)

			//log.info("reliquary sub:", obj)

			// add to datebase
			var isAdd = await General.itemAdd(obj, rebuild, replace)
			log.info(
				`ReliquarySub add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
			)
		}

		// Process Artifact (Item)
		var typeClass3 = 9
		var getItemDB3 = await General.getItemIds(typeClass3, typeGame)
		var filteredReliquary3 = Object.values(getReliquaryConfig)
		if (fastcheck) {
			if (!rebuild) {
				filteredReliquary3 = Object.values(getReliquaryConfig).filter((data) => !getItemDB3.includes(data.id))
			}
		}
		log.warn(`Try update Reliquary Config ${filteredReliquary3.length}x`)
		for (const item of filteredReliquary3) {
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
				type: typeClass3, // 9=ArtifactConfig
				game: typeGame,
				id,
				name: {},
				desc: {},
				desc2: {},
				icon: "",
				main: item.mainPropDepotId,
				sub: item.appendPropDepotId,
				starType: rank,
				equipType: getEquipType(item.equipType),
				appendPropNum: item.appendPropNum,
			}
			if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
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
					`https://api.hakush.in/gi/UI/${iconName}.webp`,
					replace
				)
			}

			//log.info("reliquary config:", obj)

			// add to datebase
			var isAdd = await General.itemAdd(obj, rebuild, replace)
			log.info(
				`ReliquaryConfig add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
			)
		}
	}

	async runGadget(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
		const getGadget = this.excel.getConfig("GadgetExcelConfigData.json")
		if (!getGadget) {
			log.errorNoStack(`Error get GadgetExcelConfigData.json`)
			return
		}

		var typeClass = 6
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredGadgetData = Object.values(getGadget)
		if (fastcheck) {
			if (!rebuild) {
				filteredGadgetData = Object.values(getGadget).filter((data) => !getItemDB.includes(data.id))
			}
		}
		log.warn(`Try update Gadget ${filteredGadgetData.length}x`)

		for (const data of filteredGadgetData) {
			if (data && data.id) {
				const id = data.id
				const nameJson = data.jsonName

				const obj: ItemGadget = {
					type: typeClass, // 6=gadget
					game: typeGame,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "", // TODO: add icon
					typeGadget: getEntityTypeId(data.type)
				}

				if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Gadget already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name
				obj.name = General.addMultiLangNamesAsObject(
					data.interactNameTextMapHash.toString(),
					LANG_GI,
					FOLDER_GI,
					obj.game,
					nameJson
				)
				if (Object.keys(obj.name).length === 0) {
					log.warn(`skip gadget ${id}`)
					continue
				}
				// add desc
				obj.desc = General.addMultiLangNamesAsObject(
					data.nameTextMapHash.toString(),
					LANG_GI,
					FOLDER_GI,
					obj.game
				)

				//log.info("gadget data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild, replace)
				log.info(
					`Gadget add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
				)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runScene(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
		const getScene = this.excel.getConfig("SceneExcelConfigData.json")
		if (!getScene) {
			log.errorNoStack(`Error get SceneExcelConfigData.json`)
			return
		}

		var typeClass = 5
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredSceneData = Object.values(getScene)
		if (fastcheck) {
			if (!rebuild) {
				filteredSceneData = Object.values(getScene).filter((data) => !getItemDB.includes(data.id))
			}
		}
		log.warn(`Try update Scene ${filteredSceneData.length}x`)

		for (const data of filteredSceneData) {
			if (data && data.id) {
				const id = data.id

				const obj: ItemScene = {
					type: typeClass, // 5=scene
					game: typeGame,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "", // TODO: add icon
					typeScene: getSceneTypeId(data.type)
				}

				if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Scene already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name (TODO: find real name)
				const name =
					`${data.scriptData}` + (data.levelEntityConfig == "" ? "" : " (" + data.levelEntityConfig + ")")
				obj.name = {
					EN: name
				}

				//log.info("scene data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild, replace)
				log.info(
					`Scene add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
				)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runWeapon(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
		const getWeapon = this.excel.getConfig("WeaponExcelConfigData.json")
		if (!getWeapon) {
			log.errorNoStack(`Error get WeaponExcelConfigData.json`)
			return
		}

		var typeClass = 4
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredWeaponData = Object.values(getWeapon)
		if (fastcheck) {
			if (!rebuild) {
				filteredWeaponData = Object.values(getWeapon).filter((data) => !getItemDB.includes(data.id))
			}
		}
		log.warn(`Try update Weapon ${filteredWeaponData.length}x`)

		for (const data of filteredWeaponData) {
			if (data && data.nameTextMapHash) {
				const hash = data.nameTextMapHash
				const id = data.id
				const iconName = data.icon

				const obj: ItemWeapon = {
					type: typeClass, // 4=weapon
					game: typeGame,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
					starType: getStar(data.rankLevel.toString()), // data.qualityType || data.rankLevel.toString()
					weaponType: getWeaponTypeNumber(data.weaponType)
				}

				if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
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
				if (Object.keys(obj.name).length === 0) {
					log.warn(`skip weapon ${id}`)
					continue
				}
				// add desc
				obj.desc = General.addMultiLangNamesAsObject(
					data.descTextMapHash.toString(),
					LANG_GI,
					FOLDER_GI,
					obj.game
				)

				//log.info("weapon data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild, replace)
				log.info(
					`Weapon add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
				)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runMonster(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
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

		var typeClass = 3
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredMonsterData = Object.values(getMonsterData)
		if (fastcheck) {
			if (!rebuild) {
				filteredMonsterData = Object.values(getMonsterData).filter((data) => !getItemDB.includes(data.id))
			}
		}
		log.warn(`Try update Monster ${filteredMonsterData.length}x`)

		for (const data of filteredMonsterData) {
			if (data && data.nameTextMapHash) {
				var hashName1 = data.nameTextMapHash
				const id = data.id

				//if (id != 26230301) continue // demo only

				const mName = data.monsterName
				const varDP = data.describeId

				const obj: ItemMonster = {
					type: typeClass, // 3=monster
					game: typeGame,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
					typeMonster: getMonsterType(data.type)
				}

				if ((await General.itemExists(obj.id, obj.type))) {
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
				// if monster name is empty
				if (Object.keys(obj.name).length === 0) {
					log.warn(`skip monster ${id}`)
					continue
				}

				//log.info("monster data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild, replace)
				log.info(
					`Monster add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
				)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runItem(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
		var typeClass = 2
		var getItemDB = await General.getItemIds(typeClass, typeGame)

		//var enumTes1: string[] = []
		//var enumTes2: string[] = []
		//var enumTes3: string[] = []

		for (const [filePath, clazz] of Object.entries(EXCEL_GI)) {
			if (clazz !== ClassItemExcelGI) continue

			//log.info(`Try to update ${filePath} data`)
			const getItem = this.excel.getConfig(filePath as keyof typeof EXCEL_GI) as ClassItemExcelGI
			if (!getItem) {
				log.errorNoStack(`Error get ${filePath}`)
				return
			}

			var filteredItems = Object.values(getItem)
			if (fastcheck) {
				if (!rebuild) {
					filteredItems = Object.values(getItem).filter((data) => !getItemDB.includes(data.id))
				}
			}
			log.warn(`Try update Item ${filePath} ${filteredItems.length}x`)

			for (const data of filteredItems) {
				if (data && data.nameTextMapHash) {
					const id = data.id
					const iconName = data.icon

					const obj: ItemNormal = {
						type: typeClass, // 2=normal item
						game: typeGame,
						id,
						name: {},
						desc: {},
						desc2: {},
						icon: "",
						starType: data.rankLevel,
						itemType: -1, //data.itemType,
						// other
						materialType: -1, //data.materialType,
						foodQuality: -1, //data.foodQuality,
						specialFurnitureType: -1, //data.specialFurnitureType,
						surfaceType: -1 //data.surfaceType
					}

					/*
					if (!enumTes1.includes(data.itemType)) {
						enumTes1.push(data.itemType)
					}
					if (!enumTes2.includes(data.materialType)) {
						enumTes2.push(data.materialType)
					}
					if (!enumTes3.includes(data.foodQuality)) {
						enumTes3.push(data.foodQuality)
					}
					*/

					if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
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
					if (Object.keys(obj.name).length === 0) {
						log.warn(`skip item ${id}`)
						continue
					}

					// add desc
					obj.desc = General.addMultiLangNamesAsObject(
						data.descTextMapHash.toString(),
						LANG_GI,
						FOLDER_GI,
						obj.game
					)

					//log.info("item data:", obj)

					// add to datebase
					var isAdd = await General.itemAdd(obj, rebuild, replace)
					log.info(
						`Item add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
					)

					//await sleep(5)
				} else {
					log.info("skip", data)
				}
			}
		}

		//log.info(`tes1:`, createEnum(enumTes1, "getItemType"))
		//log.info(`tes2:`, createEnum(enumTes2, "getMaterialType"))
		//log.info(`tes3:`, createEnum(enumTes3, "getFoodQuality"))
	}

	async runAvatar(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
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

		var typeClass = 1
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredAvatars = Object.values(getAvatar)
		if (fastcheck) {
			if (!rebuild) {
				filteredAvatars = Object.values(getAvatar).filter((data) => !getItemDB.includes(data.id))
			}
		}
		log.warn(`Try update Avatar ${filteredAvatars.length}x`)

		for (const data of filteredAvatars) {
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
					type: typeClass, // 1=avatar
					game: typeGame,
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

				if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
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
				if (Object.keys(obj.name).length === 0) {
					log.warn(`skip avatar ${id} > ${data.nameTextMapHash}`)
					continue
				}

				// add desc
				obj.desc = General.addMultiLangNamesAsObject(
					data.descTextMapHash.toString(),
					LANG_GI,
					FOLDER_GI,
					obj.game
				)

				//log.info("Avatar data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild, replace)
				log.info(
					`Avatar add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
				)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}
}

const _ = new GI()
export default _
