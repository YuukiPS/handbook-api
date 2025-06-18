import Logger from "@UT/logger"
import {
	BuildData,
	BuildRelicData,
	BuildRsp,
	ClassAvatarExcelSR,
	ClassAvatarPropertyExcelSR,
	ClassEquipmentExcelSR,
	ClassItemExcelSR,
	ClassMazePlaneExcelSR,
	ClassMazePropExcelSR,
	ClassMonsterExcelSR,
	ClassMonsterTemplateExcelSR,
	ClassRelicExcelSR,
	ClassRelicMainAffixExcelSR,
	ClassRelicSubAffixExcelSR,
	ClassStageConfigExcelSR,
	GenRelicResult,
	ItemArtifactConfig,
	ItemArtifactMain,
	ItemArtifactSub,
	ItemAvatar,
	ItemGadget,
	ItemMonster,
	ItemNormal,
	ItemPlane,
	ItemStage,
	ItemWeapon
} from "@UT/response"
import { isEmpty, sleep } from "@UT/library"
import ExcelManager from "@UT/excel"
// thrid party
import { isMainThread } from "worker_threads"
import path from "path"
import { Document, Sort } from "mongodb"
// datebase
import DBMongo from "@DB/client/mongo"
import General from "@DB/general/api"
import { domainPublic } from "@UT/config"

const nameGame = "star-rail"
const typeGame = 2
const assetImageBackup = `https://api.hakush.in`

const log = new Logger(nameGame.replace("-", " ").toLocaleUpperCase())

export const REPO_SR = "Dimbreath/turnbasedgamedata"
export const REPO_BRANCH_SR = "main"
export const PATHBIN_SR = `ExcelOutput`
export const FOLDER_SR = `./src/server/web/public/resources/${nameGame}`
export const LANG_SR = ["CHS", "CHT", "DE", "EN", "ES", "FR", "ID", "JP", "KR", "PT", "RU", "TH", "VI"] // TODO: TH_0(GI)=TH(SR),TH_1
export const EXCEL_SR = {
	"AvatarConfig.json": ClassAvatarExcelSR,
	"AvatarPropertyConfig.json": ClassAvatarPropertyExcelSR,
	"EquipmentConfig.json": ClassEquipmentExcelSR,
	"MonsterConfig.json": ClassMonsterExcelSR, // info basic monster
	"MonsterTemplateConfig.json": ClassMonsterTemplateExcelSR, // get icon monster
	"MazePlane.json": ClassMazePlaneExcelSR, // This is different from scenes like in GI because they have floor id so they have to be made into different classes
	"StageConfig.json": ClassStageConfigExcelSR, // This scene in SR but for battle
	"MazeProp.json": ClassMazePropExcelSR,
	"RelicConfig.json": ClassRelicExcelSR,
	"RelicMainAffixConfig.json": ClassRelicMainAffixExcelSR,
	"RelicSubAffixConfig.json": ClassRelicSubAffixExcelSR,
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
	return AvatarBaseType[id] ?? "???"
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
function getDamageTypeNumber(id: number): string {
	return DamageType[id] ?? "???"
}
enum RelicType {
	HEAD = 0,
	HAND = 1,
	BODY = 2,
	FOOT = 3,
	NECK = 4,
	OBJECT = 5
}
function getRelicType(name: string): number {
	return (RelicType as any)[name] ?? -1
}
function getRelicTypeNumber(id: number): string {
	return RelicType[id] ?? "HEAD"
}
enum RelicMode {
	BASIC = 0,
	CUSTOM = 1
}
function getRelicMode(name: string): number {
	return (RelicMode as any)[name] ?? -1
}
function getRelicModeNumber(id: number): string {
	return RelicMode[id] ?? "BASIC"
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
		dont_build: boolean = false,
		replace: boolean = false
	): Promise<void> {
		log.info(`Try to update Star Rail resources`)

		var skip_dl = true
		if (await General.checkGit(REPO_SR, "commit_sr", skip_update)) {
			log.info(`Update available`)
			skip_dl = false
		} else {
			log.info(`No update available: ${REPO_SR} > skip? ${skip_update}`)
		}

		log.debug(`Downloading localization files`)
		for (const lang of LANG_SR) {
			await General.downloadGit(REPO_SR, FOLDER_SR, `TextMap/TextMap${lang}.json`, skip_dl, REPO_BRANCH_SR)
		}

		log.debug(`Downloading Excel files`)
		this.excel = new ExcelManager(REPO_SR, FOLDER_SR, EXCEL_SR, skip_dl, REPO_BRANCH_SR, PATHBIN_SR)
		await this.excel.loadFiles()

		if (dont_build) {
			log.info(`Skip build item data`)
			return
		}

		var demoFastcheck = true
		//foce_save = true
		//replace = true

		log.info(`Building item data`)
		await this.runAvatar(foce_save, replace, demoFastcheck)
		await this.runItem(foce_save, replace, demoFastcheck)
		await this.runMonster(foce_save, replace, demoFastcheck)
		await this.runWeapon(foce_save, replace, demoFastcheck)
		await this.runPlane(foce_save, replace, demoFastcheck)
		await this.runStage(foce_save, replace, demoFastcheck)
		await this.runGadget(foce_save, replace, demoFastcheck)
		await this.runRelic(foce_save, replace, demoFastcheck)
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
		*/
	async addBuild(obj: BuildData): Promise<boolean> {
		await DBMongo.isConnected()
		const collection = DBMongo.getCollection<BuildData>("build_sr")
		if (!collection) {
			log.errorNoStack("api_db_nofound_collection_build")
			return false
		}

		await collection.insertOne(obj as Required<BuildData>)
		return true
	}

	async findBuild(
		options: {
			search?: string
			avatar?: number
			limit?: number
			page?: number
			sortBy?: "vote" | "time"
			sortOrder?: number
			recommendation?: number
		} = {}
	): Promise<BuildRsp> {
		await DBMongo.isConnected()
		const collection = DBMongo.getCollection<BuildData>("build_sr")
		if (!collection) {
			log.errorNoStack("api_db_nofound_collection_build")
			return {
				message: 'Collection "build_sr" not found',
				retcode: 500,
				data: null
			}
		}

		// Destructure with defaults (added sortOrder & recommendation)
		const { search, avatar, limit = 10, page = 1, sortBy = "time", sortOrder = -1, recommendation = 0 } = options

		// Build filter
		const filter: Record<string, any> = {}
		if (!isEmpty(search)) {
			filter.title = { $regex: search, $options: "i" }
		}
		if (!isEmpty(avatar)) {
			filter["avatar.id"] = avatar
		}

		let results: BuildData[]

		// Recommendation mode: one build per avatar
		if (recommendation === 1) {
			// only consider documents with an avatar
			filter["avatar.id"] = { $exists: true }

			const pipeline: Document[] = [
				{ $match: filter },
				{ $sort: { [sortBy]: sortOrder } },
				// group by avatar.id, pick the first (highest‐sorted) document
				{ $group: { _id: "$avatar.id", build: { $first: "$$ROOT" } } },
				// unwind back to root
				{ $replaceRoot: { newRoot: "$build" } }
				// (optional) add pagination here:
				// { $skip: (page - 1) * limit },
				// { $limit: limit },
			]

			results = await collection.aggregate<BuildData>(pipeline).toArray()
		} else {
			// Regular find/sort/paginate
			const skip = (page - 1) * limit
			let cursor = collection
				.find(filter)
				.sort({ [sortBy]: sortOrder } as Sort)
				.skip(skip)
			if (limit > 0) {
				cursor = cursor.limit(limit)
			}
			results = await cursor.toArray()
		}

		log.info(`sea > ${results.length}x`, filter)

		return {
			message: "success",
			retcode: 0,
			data: results
		}
	}

	async generatePreview(cmds?: string[]): Promise<GenRelicResult[] | undefined> {
		if (!cmds || cmds.length === 0) return undefined

		const results = await Promise.all(
			cmds.map(async (cmd) => {
				return await this.GenRelic(cmd)
			})
		)
		return results.filter((result): result is GenRelicResult => result !== null)
	}

	GenRelic(cmd: string, Language: string = "EN"): GenRelicResult | null {
		// Load configs
		const relicConfig = this.excel.getConfig("RelicConfig.json")
		const itemConfigRelic = this.excel.getConfig("ItemConfigRelic.json")
		const relicMainAffix = this.excel.getConfig("RelicMainAffixConfig.json")
		const relicSubAffix = this.excel.getConfig("RelicSubAffixConfig.json")
		const avatarProperty = this.excel.getConfig("AvatarPropertyConfig.json")
		if (!relicConfig || !itemConfigRelic || !relicMainAffix || !relicSubAffix || !avatarProperty) {
			log.errorNoStack("Error loading one or more config files")
			return null
		}

		var raw: BuildRelicData = {
			id: 0,
			main: -1,
			sub: [],
			sort: true, // TODO: add command to sort
			level: 15,
			count: 1
		}

		// Parse input command
		const parts = cmd.split(" ")
		if (parts.length < 3) {
			log.errorNoStack("Invalid command format")
			return null
		}
		const item_id = parseInt(parts[1], 10)
		raw.id = item_id

		// Initialize parameters
		let level = 0
		let itemCount = 1
		let mainPropId = 0
		let maxSteps = false
		const subTokens: string[] = []

		// Classify all tokens (flags vs sub-affixes)
		for (let i = 2; i < parts.length; i++) {
			const p = parts[i]
			if (p === "-maxsteps") {
				maxSteps = true
			} else if (p.startsWith("x")) {
				itemCount = parseInt(p.substring(1), 10)
				raw.count = itemCount
			} else if (p.startsWith("lv")) {
				level = parseInt(p.substring(2), 10)
				raw.level = level
			} else if (p.startsWith("s")) {
				mainPropId = parseInt(p.substring(1), 10)
				raw.main = mainPropId
			} else if (/^\d+[:.,;]\d+$/.test(p)) {
				subTokens.push(p)
			}
		}

		// Lookup main relic data
		const dataRelic = Object.values(relicConfig).find((it) => it.ID === item_id)
		if (!dataRelic) {
			log.errorNoStack(`Relic ID ${item_id} not found`)
			return null
		}

		// Determine maxLevel from config
		let maxLevel = dataRelic.MaxLevel ?? 900

		// Clamp mainPropId between 1–5
		mainPropId = Math.min(Math.max(mainPropId, 1), 5)

		const mainAff = Object.values(relicMainAffix).find(
			(a) => a.AffixID === mainPropId && a.GroupID === dataRelic.MainAffixGroup
		)
		if (!mainAff) {
			log.errorNoStack(`Main Affix ID ${mainPropId} not found`)
			return null
		}

		// Resolve main property name and value
		const propDefMain = Object.values(avatarProperty).find((p) => p.PropertyType === mainAff.Property)
		if (!propDefMain) {
			log.errorNoStack(`Property type ${mainAff.Property} not found`)
			return null
		}
		const nameMain = General.findNameHash(propDefMain.PropertyName.Hash, Language, LANG_SR, FOLDER_SR)
		const baseMain = mainAff.BaseValue.Value
		const addMain = mainAff.LevelAdd.Value * level
		const mainFormatted = mainAff.Property.endsWith("Delta")
			? `${nameMain}: ${Math.floor(baseMain + addMain)}`
			: `${nameMain}: ${((baseMain + addMain) * 100).toFixed(2)} %`

		// Limit to at most 4 sub-affixes
		const limitedSubs = subTokens.slice(0, 4)
		const subResults: string[] = []

		// Process each sub-affix token
		for (const token of limitedSubs) {
			const [idStr, countStr, stepStr] = token.split(/[,:;.]/)
			const subId = parseInt(idStr, 10)
			const qty = parseInt(countStr, 10)
			let step = parseInt(stepStr, 10) || -1
			if (maxSteps) {
				step = qty * 2
			}

			const subAff = Object.values(relicSubAffix).find(
				(a) => a.AffixID === subId && a.GroupID === dataRelic.SubAffixGroup
			)
			if (!subAff) continue

			const propDefSub = Object.values(avatarProperty).find((p) => p.PropertyType === subAff.Property)
			if (!propDefSub) continue
			const nameSub = General.findNameHash(propDefSub.PropertyName.Hash, Language, LANG_SR, FOLDER_SR)

			const maxCount = Math.floor(maxLevel / 3) + 1
			const count = Math.min(qty, maxCount)
			let value = subAff.BaseValue.Value + subAff.StepValue.Value * 2
			if (count >= 2) value *= count

			const subFormatted = subAff.Property.endsWith("Delta")
				? `${nameSub}: ${Math.floor(value)}`
				: `${nameSub}: ${(value * 100).toFixed(2)} %`
			subResults.push(subFormatted)
			raw.sub.push({
				id: subId,
				count,
				step
			})
		}

		// Build and return JSON
		return {
			id: item_id,
			count: itemCount,
			level,
			main: mainFormatted,
			sub: subResults,
			raw
		}
	}

	async runRelic(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
		// Lock basic stats (TODO: remove stats in name)
		var maxLevel = 0
		var maxStep = 2

		const getRelicConfig = this.excel.getConfig("RelicConfig.json")
		if (!getRelicConfig) {
			log.errorNoStack(`Error get RelicConfig.json`)
			return
		}
		const getItemConfigRelic = this.excel.getConfig("ItemConfigRelic.json")
		if (!getItemConfigRelic) {
			log.errorNoStack(`Error get ItemConfigRelic.json`)
			return
		}
		const getRelicMainAffix = this.excel.getConfig("RelicMainAffixConfig.json")
		if (!getRelicMainAffix) {
			log.errorNoStack(`Error get RelicMainAffixConfig.json`)
			return
		}
		const getRelicSubAffix = this.excel.getConfig("RelicSubAffixConfig.json")
		if (!getRelicSubAffix) {
			log.errorNoStack(`Error get RelicSubAffixConfig.json`)
			return
		}
		const getAvatarProperty = this.excel.getConfig("AvatarPropertyConfig.json")
		if (!getAvatarProperty) {
			log.errorNoStack(`Error get AvatarPropertyConfig.json`)
			return
		}

		// Process Main Artifact
		var typeClass1 = 7
		var getItemDB1 = await General.getItemIds(typeClass1, typeGame)
		var filteredRelic1 = Object.values(getRelicMainAffix)
		if (fastcheck) {
			if (!rebuild) {
				filteredRelic1 = Object.values(getRelicMainAffix).filter(
					(data) => !getItemDB1.includes(data.AffixID) && !getItemDB1.includes(data.GroupID)
				)
			}
		}
		log.warn(`Try update Relic Main ${filteredRelic1.length}x`)
		for (const main of filteredRelic1) {
			const id = main.AffixID
			const grup = main.GroupID
			const getPropType = main.Property

			const hashEntry = Object.values(getAvatarProperty).find((item) => item.PropertyType === getPropType)
			if (!hashEntry) {
				log.warn(`AvatarProperty1 not found`, getPropType)
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
				grup,
				stats: {
					Property: getPropType, // if PropertyType not Delta then its percent
					BaseValue: main.BaseValue.Value, // base value
					LevelAdd: main.LevelAdd.Value, // level add value
				}
			}
			if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type), { grup })) {
				log.info(`RelicMain already exists, skipping ${obj.id} (${obj.type})`)
				continue
			}

			var bonus = ``
			if (getPropType.endsWith("Delta")) {
				bonus = `${Math.floor(main.BaseValue.Value + main.LevelAdd.Value * maxLevel)}`
			} else {
				bonus = `${((main.BaseValue.Value + main.LevelAdd.Value * maxLevel) * 100).toFixed(2)} %`
			}

			const mainPropHash = hashEntry.PropertyName.Hash
			obj.name = General.addMultiLangNamesAsObject(
				mainPropHash.toString(),
				LANG_SR,
				FOLDER_SR,
				obj.game,
				"",
				` (${bonus})` //  > S${maxStep}LV${maxLevel}
			)

			//log.info("Relic main:", obj)

			// add to datebase
			var isAdd = await General.itemAdd(obj, rebuild, replace, { grup })
			log.info(
				`RelicMain add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
			)
		}

		// Process Sub Artifact
		var typeClass2 = 8
		var getItemDB2 = await General.getItemIds(typeClass2, typeGame)
		var filteredRelic2 = Object.values(getRelicSubAffix)
		if (fastcheck) {
			if (!rebuild) {
				filteredRelic2 = Object.values(getRelicSubAffix).filter(
					(data) => !getItemDB2.includes(data.AffixID) && !getItemDB2.includes(data.GroupID)
				)
			}
		}
		log.warn(`Try update Relic Sub ${filteredRelic2.length}x`)
		for (const sub of filteredRelic2) {
			const id = sub.AffixID
			const grup = sub.GroupID
			const getPropType = sub.Property

			const hashEntry = Object.values(getAvatarProperty).find((item) => item.PropertyType === getPropType)
			if (!hashEntry) {
				log.warn(`AvatarProperty2 not found`, name)
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
				grup: grup,
				stats: {
					Property: getPropType, // if PropertyType not Delta then its percent
					BaseValue: sub.BaseValue.Value, // base value
					StepValue: sub.StepValue.Value, //step so base + step * (maxStep is 2 or StepNum)
					StepNum: sub.StepNum, // step number default
				}
			}

			if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type), { grup })) {
				log.info(`RelicSub already exists, skipping ${obj.id} (${obj.type})`)
				continue
			}

			var bonus = ``
			var finalValue = sub.BaseValue.Value + sub.StepValue.Value * maxStep
			if (getPropType.endsWith("Delta")) {
				bonus = `${Math.floor(finalValue)}`
			} else {
				bonus = `${(finalValue * 100).toFixed(2)} %`
			}

			const subPropHash = hashEntry.PropertyName.Hash
			obj.name = General.addMultiLangNamesAsObject(
				subPropHash.toString(),
				LANG_SR,
				FOLDER_SR,
				obj.game,
				"",
				` (${bonus})`
			)

			//log.info("Relic sub:", obj)

			// add to datebase
			var isAdd = await General.itemAdd(obj, rebuild, replace, { grup })
			log.info(
				`RelicSub add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
			)
		}

		// Process Relic (Item)
		var typeClass3 = 9
		var getItemDB3 = await General.getItemIds(typeClass3, typeGame)
		var filteredRelic3 = Object.values(getItemConfigRelic)
		if (fastcheck) {
			if (!rebuild) {
				filteredRelic3 = Object.values(getItemConfigRelic).filter((data) => !getItemDB3.includes(data.ID))
			}
		}
		log.warn(`Try update Relic Item ${filteredRelic3.length}x`)
		//var enumTes1: string[] = []
		//var enumTes2: string[] = []
		for (const item of filteredRelic3) {
			const nameItemHash = item.ItemName.Hash
			const id = item.ID
			const rank = item.Rarity
			const iconPath = item.ItemIconPath.toLocaleLowerCase()
			const iconName = path.basename(iconPath)
			const iconNameNoLower = path.basename(item.ItemIconPath)

			// Config
			var infoItem = Object.values(getRelicConfig).find((item) => item.ID === id)
			if (!infoItem) {
				log.warn(`RelicConfig not found: `, id)
				continue
			}

			const obj: ItemArtifactConfig = {
				type: typeClass3, // 9=ArtifactConfig
				game: typeGame,
				id,
				name: {},
				desc: {},
				desc2: {},
				icon: "",
				starType: getStarSR(item.Rarity), // use item Rarity instead infoItem Rarity
				equipType: getRelicType(infoItem.Type),
				main: infoItem.MainAffixGroup,
				sub: infoItem.SubAffixGroup
			}

			/*
			if (!enumTes1.includes(infoItem.Type)) {
				enumTes1.push(infoItem.Type)
			}
			if (!enumTes2.includes(infoItem.Mode)) {
				enumTes2.push(infoItem.Mode)
			}
			*/

			if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
				log.info(`RelicConfig already exists, skipping ${obj.id} (${obj.type})`)
				continue
			}

			obj.name = General.addMultiLangNamesAsObject(nameItemHash.toString(), LANG_SR, FOLDER_SR, obj.game)
			if (Object.keys(obj.name).length === 0) {
				log.warn(`skip relic ${id}`)
				continue
			}
			if (item.ItemBGDesc && !isEmpty(item.ItemBGDesc.Hash)) {
				obj.desc = General.addMultiLangNamesAsObject(
					item.ItemBGDesc.Hash.toString(),
					LANG_SR,
					FOLDER_SR,
					obj.game
				)
			}
			if (item.ItemDesc && !isEmpty(item.ItemDesc.Hash)) {
				obj.desc2 = General.addMultiLangNamesAsObject(
					item.ItemDesc.Hash.toString(),
					LANG_SR,
					FOLDER_SR,
					obj.game
				)
			}
			obj.icon = await General.downloadImageOrCopyLocal(
				`${DUMP_SR}/${iconPath}`, // local file dump (private)
				`${FOLDER_SR}/icon/relic/${iconName}`, // local file (public)
				`${domainPublic}/resources/${nameGame}/icon/relic/${iconName}`, // url public
				`${assetImageBackup}/hsr/UI/relicfigures/${iconNameNoLower.replace(".png", "")}.webp`,
				replace
			)

			//log.info("Relic config:", obj)

			// add to datebase
			var isAdd = await General.itemAdd(obj, rebuild)
			log.info(
				`RelicConfig add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
			)
		}
		//log.info(`Relic Config type:`, createEnum(enumTes1, "getRelicType"))
		//log.info(`Relic Config mode:`, createEnum(enumTes2, "getRelicMode"))
	}

	async runGadget(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
		const getGadget = this.excel.getConfig("MazeProp.json")
		if (!getGadget) {
			log.errorNoStack(`Error get MazeProp.json`)
			return
		}

		var typeClass = 6
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredGadgetData = Object.values(getGadget)
		if (fastcheck) {
			if (!rebuild) {
				filteredGadgetData = Object.values(getGadget).filter((data) => !getItemDB.includes(data.ID))
			}
		}
		log.warn(`Try update Gadget (Prop) ${filteredGadgetData.length}x`)

		for (const data of filteredGadgetData) {
			if (data) {
				const id = data.ID
				var name1 = data.JsonPath.replace(/^.*\//, "")
					.replace(/\.json$/, "")
					.replace("_Config", "")
				if (isEmpty(name1)) {
					name1 = data.ConfigEntityPath
				}
				var iconPath = data.PropIconPath.toLocaleLowerCase()
				var iconBaseName = path.basename(iconPath)

				const obj: ItemGadget = {
					type: typeClass, // 6=gadget
					game: typeGame,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "", // TODO: add icon
					typeGadget: -1 //data.PropType
				}

				if (!rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Gadget already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name
				obj.name = General.addMultiLangNamesAsObject(
					data.PropName.Hash.toString(),
					LANG_SR,
					FOLDER_SR,
					obj.game,
					name1
				)
				if (Object.keys(obj.name).length === 0) {
					log.warn(`skip gadget ${id}`)
					continue
				}

				if (!isEmpty(iconPath)) {
					obj.icon = await General.downloadImageOrCopyLocal(
						`${DUMP_SR}/${iconPath}`, // local file dump (private)
						`${FOLDER_SR}/icon/gadget/${iconBaseName}`, // local file (public)
						`${domainPublic}/resources/${nameGame}/icon/gadget/${iconBaseName}`, // url public
						`` // TODO: find fallback url
					)
				}

				//log.info("gadget data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild, replace)
				log.info(
					`Stage add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
				)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runStage(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
		const getStage = this.excel.getConfig("StageConfig.json")
		if (!getStage) {
			log.errorNoStack(`Error get StageConfig.json`)
			return
		}

		var typeClass = 12
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredStageData = Object.values(getStage)
		if (fastcheck) {
			if (!rebuild) {
				filteredStageData = Object.values(getStage).filter((data) => !getItemDB.includes(data.StageID))
			}
		}
		log.warn(`Try update Stage ${filteredStageData.length}x`)

		// Stage
		for (const data of filteredStageData) {
			if (data) {
				const id = data.StageID
				const nameStage = data.StageName.Hash
				const typeStage = data.StageType

				/*
                CocoonConfig > MappingInfo
                StageInfiniteWaveConfig > StageInfiniteGroup
                ClockParkActivity,StarFightActivity(notall),RogueEndlessActivity,Mainline(notall) > PlaneEvent? (NO NAME)
                AvatarDemoConfig,SwordTrainingExam

                ~ IDK ~
                ChallengeGroupConfig (Moc)
                ChallengeStoryGroupConfig (Pure Fiction Enemies)
                ChallengeBossGroupConfig (Apocalytic Shadow Enemies)
                */
				//if (!["Cocoon", "ClockParkActivity", "Trial", "SwordTraining","StarFightActivity","RogueEndlessActivity"].includes(typeStage)) continue

				const obj: ItemStage = {
					type: typeClass, // 12=Stage for SR
					game: typeGame,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
					// other
					stageType: -1, //typeStage,
					stageLevel: data.Level
				}

				if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Stage already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name
				obj.name = General.addMultiLangNamesAsObject(
					nameStage.toString(),
					LANG_SR,
					FOLDER_SR,
					obj.game,
					"",
					` (${typeStage}) (LV${data.Level})`
				)
				if (Object.keys(obj.name).length === 0) {
					log.warn(`skip Stage ${id} > ${typeStage}`)
					continue
				}

				//log.info("stage data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild, replace)
				log.info(
					`Stage add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
				)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runPlane(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
		const getPlane = this.excel.getConfig("MazePlane.json")
		if (!getPlane) {
			log.errorNoStack(`Error get MazePlane.json`)
			return
		}

		var typeClass = 11
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredPlaneData = Object.values(getPlane)
		if (fastcheck) {
			if (!rebuild) {
				filteredPlaneData = Object.values(getPlane).filter((data) => !getItemDB.includes(data.PlaneID))
			}
		}
		log.warn(`Try update Plane (Scene) ${filteredPlaneData.length}x`)

		// World Scene
		for (const data of filteredPlaneData) {
			if (data) {
				const id = data.PlaneID
				const namePlane = data.PlaneName.Hash
				const typePlane = data.PlaneType

				if (!["Train", "Town", "Maze"].includes(typePlane)) continue

				const obj: ItemPlane = {
					type: typeClass, // 11=Plane for SR
					game: typeGame,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
					// other
					planeType: -1, //typePlane,
					worldId: data.WorldID,
					startFloorId: data.StartFloorID,
					floorIdList: data.FloorIDList
				}

				if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Plane already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name
				obj.name = General.addMultiLangNamesAsObject(namePlane.toString(), LANG_SR, FOLDER_SR, obj.game)
				if (Object.keys(obj.name).length === 0) {
					log.warn(`skip plane ${id}`)
					continue
				}

				//log.info("plane data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild, replace)
				log.info(
					`Plane add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
				)

				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runWeapon(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
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

		var typeClass = 4
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredWeaponData = Object.values(getWeapon)
		if (fastcheck) {
			if (!rebuild) {
				filteredWeaponData = Object.values(getWeapon).filter((data) => !getItemDB.includes(data.EquipmentID))
			}
		}
		log.warn(`Try update Weapon ${filteredWeaponData.length}x`)

		for (const data of filteredWeaponData) {
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
					type: typeClass, // 4=weapon
					game: typeGame,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
					// other
					starType: getStarSR(infoItem.Rarity), // get star from item not weapon ?
					weaponType: getAvatarBase(data.AvatarBaseType)
				}

				if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Weapon already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name
				obj.name = General.addMultiLangNamesAsObject(hash1.toString(), LANG_SR, FOLDER_SR, obj.game)
				if (Object.keys(obj.name).length === 0) {
					log.warn(`skip weapon ${id}`)
					continue
				}

				obj.icon = await General.downloadImageOrCopyLocal(
					`${DUMP_SR}/${iconPath}`, // local file dump (private)
					`${FOLDER_SR}/icon/weapon/${id}.png`, // local file (public)
					`${domainPublic}/resources/${nameGame}/icon/weapon/${id}.png`, // url public
					`${assetImageBackup}/hsr/UI/lightconemediumicon/${id}.webp`,
					replace
				)
				// https://sr.yatta.moe/hsr/assets/UI//equipment/medium/${id}.png

				// add desc
				obj.desc = General.addMultiLangNamesAsObject(hash2.toString(), LANG_SR, FOLDER_SR, obj.game)
				// add desc2
				obj.desc2 = General.addMultiLangNamesAsObject(hash3.toString(), LANG_SR, FOLDER_SR, obj.game)

				//log.info("weapon data:", obj)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild, replace)
				log.info(
					`Weapon add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
				)

				await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}

	async runMonster(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
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

		var typeClass = 3
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredMonsterData = Object.values(getMonsterTemplate)
		if (fastcheck) {
			if (!rebuild) {
				filteredMonsterData = Object.values(getMonsterTemplate).filter(
					(data) => !getItemDB.includes(data.MonsterTemplateID)
				)
			}
		}
		log.warn(`Try update Monster ${filteredMonsterData.length}x`)

		for (const data of filteredMonsterData) {
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
					type: typeClass, // 3=monster
					game: typeGame,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
					// other
					typeMonster: -1 // maybe use CustomValueTags
				}

				if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Monster already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name
				obj.name = General.addMultiLangNamesAsObject(hashName.toString(), LANG_SR, FOLDER_SR, obj.game)
				if (Object.keys(obj.name).length === 0) {
					log.warn(`skip monster ${id}`)
					continue
				}

				const iconPath = data.RoundIconPath.toLocaleLowerCase()
				if (!isEmpty(iconPath)) {
					obj.icon = await General.downloadImageOrCopyLocal(
						`${DUMP_SR}/${iconPath}`, // local file dump (private)
						`${FOLDER_SR}/icon/monster/${id}.png`, // local file (public)
						`${domainPublic}/resources/${nameGame}/icon/monster/${id}.png`, // url public
						`${assetImageBackup}/hsr/UI/monstermiddleicon/Monster_${id}.webp`
					)
				}

				// add desc
				obj.desc = General.addMultiLangNamesAsObject(hashInfo.toString(), LANG_SR, FOLDER_SR, obj.game)

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

		for (const [filePath, clazz] of Object.entries(EXCEL_SR)) {
			if (clazz !== ClassItemExcelSR) continue

			// not necessary here
			if (filePath === "ItemConfigEquipment.json") continue
			if (filePath === "ItemConfigRelic.json") continue

			//log.info(`Try to update ${filePath} data`)

			const getItem = this.excel.getConfig(filePath as keyof typeof EXCEL_SR) as ClassItemExcelSR
			if (!getItem) {
				log.errorNoStack(`Error get ${filePath}`)
				return
			}

			var filteredItems = Object.values(getItem)
			if (fastcheck) {
				if (!rebuild) {
					filteredItems = Object.values(getItem).filter((data) => !getItemDB.includes(data.ID))
				}
			}
			log.warn(`Try update Item ${filePath} ${filteredItems.length}x`)

			for (const data of filteredItems) {
				if (data) {
					const id = data.ID
					const typeSub = data.ItemSubType
					const iconPath = data.ItemIconPath.toLocaleLowerCase()

					let obj: ItemNormal = {
						type: typeClass,
						game: typeGame,
						id,
						name: {},
						desc: {},
						desc2: {},
						icon: "",
						// other
						starType: getStarSR(data.Rarity),
						itemType: -1 //typeSub
					}

					if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
						log.info(`Item already exists, skipping ${obj.id} (${obj.type})`)
						continue
					}

					// add name
					if (data.ItemName && !isEmpty(data.ItemName.Hash)) {
						obj.name = General.addMultiLangNamesAsObject(
							data.ItemName.Hash.toString(),
							LANG_SR,
							FOLDER_SR,
							obj.game
						)
						if (Object.keys(obj.name).length === 0) {
							log.warn(`skip1 item ${id}`)
							continue
						}
					} else {
						log.warn(`skip2 item ${id} (${typeSub}) > ${filePath}`)
						// TODO: Mission,TravelBrochurePaster,ChessRogueDiceSurface,Virtual,Gift,PlanetFesItem
						continue
					}

					if (!isEmpty(iconPath)) {
						const parts = data.ItemIconPath.split("/")
						const folderName = parts[parts.length - 2].replace("ItemIcon", "itemfigures")
						//console.log("folderName", parts)

						const fileNameWithExtension = parts[parts.length - 1]
						const fileName = fileNameWithExtension.replace(".png", "") // "4006_2"

						log.info(`${folderName} > ${fileName} > ${iconPath}`)

						obj.icon = await General.downloadImageOrCopyLocal(
							`${DUMP_SR}/${iconPath}`, // local file dump (private)
							`${FOLDER_SR}/icon/item/${id}.png`, // local file (public)
							`${domainPublic}/resources/${nameGame}/icon/item/${id}.png`, // url public
							`${assetImageBackup}/hsr/UI/${folderName}/${fileName}.webp`, // TODO: find fallback url
							replace
						)
						// https://api.hakush.in/hsr/UI/itemfigures/900001.webp
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
	}

	async runAvatar(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
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

		var typeClass = 1
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		var filteredAvatars = Object.values(getAvatar)
		if (fastcheck) {
			if (!rebuild) {
				filteredAvatars = Object.values(getAvatar).filter((data) => !getItemDB.includes(data.AvatarID))
			}
		}
		log.warn(`Try update Avatar ${filteredAvatars.length}x`)

		for (const data of filteredAvatars) {
			if (data) {
				const id = data.AvatarID
				const iconPath = data.AvatarSideIconPath.toLocaleLowerCase()

				var infoCard = Object.values(getAvatarItem).find((item) => item.ID === id)
				if (!infoCard) {
					log.warn(`Avatar card not found`, id)
					continue
				}

				var wp = getAvatarBase(data.AvatarBaseType)
				var el = getDamageType(data.DamageType)
				const obj: ItemAvatar = {
					type: typeClass, // 1=avatar
					game: typeGame,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
					// other
					starType: getStarSR(infoCard.Rarity), // maybe just use star item (infoCard) instead of star avatar in getAvatar (CombatPowerAvatarRarityType4)
					weaponType: wp,
					elementType: el,
					bodyType: -1 //isBoy ? 1 : 2 // TODO: get better bodytype
				}

				// only main character
				var isBoy = false
				if (data.UIAvatarModelPath.includes("Boy")) {
					isBoy = true
				}

				if (!fastcheck && !rebuild && (await General.itemExists(obj.id, obj.type))) {
					log.info(`Avatar already exists, skipping ${obj.id} (${obj.type})`)
					continue
				}

				// add name
				var ma = ""
				if (data.AvatarVOTag.includes("mar7th")) {
					ma = `${getDamageTypeNumber(el)}`
				} else if (data.AvatarVOTag.includes("player")) {
					ma = `${isBoy ? "Boy" : "Girl"} ${getDamageTypeNumber(el)}`
				}
				obj.name = General.addMultiLangNamesAsObject(
					data.AvatarName.Hash.toString(),
					LANG_SR,
					FOLDER_SR,
					obj.game,
					"",
					"",
					``,
					ma
				)
				if (Object.keys(obj.name).length === 0) {
					log.warn(`skip avatar ${id}`)
					continue
				}

				obj.icon = await General.downloadImageOrCopyLocal(
					`${DUMP_SR}/${iconPath}`, // local file dump (private)
					`${FOLDER_SR}/icon/avatar/${id}.png`, // local file (public)
					`${domainPublic}/resources/${nameGame}/icon/avatar/${id}.png`, // url public
					`${assetImageBackup}/hsr/UI/avatarshopicon/${id}.webp`,
					replace
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

const _ = new SR()
export default _
