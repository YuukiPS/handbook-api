import Logger from "@UT/logger"
import { ClassAvatarExcelBA, ClassItemExcelBA, ItemAvatar, ItemNormal } from "@UT/response"
import { createEnum, isEmpty, sleep } from "@UT/library"
import { domainPublic } from "@UT/config"
// thrid party
import { isMainThread } from "worker_threads"
// datebase
import General from "@DB/general/api"
import ExcelManagerBa from "@UT/excelBa"

const nameGame = "blue-archive"
const typeGame = 3

const assetBackup = `https://schaledb.com` // TODO: use original asset

const log = new Logger(nameGame.replace("-", " ").toLocaleUpperCase())

//export const REPO_BA = ""
//export const REPO_BRANCH_BA = ""
//export const PATHBIN_SR = `ExcelOutput`
export const FOLDER_BA = `./src/server/web/public/resources/${nameGame}`
export const LANG_BA = ["en", "jp", "kr", "tw", "cn", "zh", "th"]
export const EXCEL_BA = {
	"students.min.json": ClassAvatarExcelBA,
	"items.min.json": ClassItemExcelBA,
	"currency.min.json": ClassItemExcelBA
} as const
// file only in PC not in server (TODO: auto move file local to server)
export const DUMP_BA = "../../../../Docker/BA/ba/ba_Resources/Tool/dump"

// BA Func
// Item type auto generated
enum ItemRarity {
	N = 0,
	R = 1,
	SR = 2,
	SSR = 3
}
function getItemRarity(name: string): number {
	return (ItemRarity as any)[name] ?? -1
}
function getItemRarityNumber(id: number): string {
	return ItemRarity[id] ?? "Unknown"
}
enum ItemType {
	Material = 0,
	Coin = 1,
	CharacterExpGrowth = 2,
	Favor = 3,
	SecretStone = 4,
	Collectible = 5,
	Consumable = 6,
	Currency = 7
}
export function getItemTypeBA(name: string): number {
	return (ItemType as any)[name] ?? -1
}
export function getItemTypeNumberBA(id: number): string {
	return ItemType[id] ?? "Unknown"
}
// item type or attachment mail type?
enum ItemMailType {
	None = 0,
	Currency = 1,
	Items = 2,
	Character = 3,
	Equipment = 4,
	Experience = 5,
	Material = 6,
	Consumables = 7,
	Gifts = 8,
	Others = 9
}
function getItemMailType(name: string): number {
	return (ItemMailType as any)[name] ?? -1
}
function getItemMailTypeNumber(id: number): string {
	return ItemMailType[id] ?? "Unknown"
}

class BA {
	private excel!: ExcelManagerBa<typeof EXCEL_BA>
	constructor() {
		if (isMainThread) {
			log.info(`This is BR main thread`)
		} else {
			log.info(`This is BR another thread`)
		}
	}

	public async Update(
		skip_update: boolean = false,
		foce_save: boolean = false,
		dont_build: boolean = false,
		replace: boolean = false
	): Promise<void> {
		log.info(`Try update ${nameGame} data`)

		this.excel = new ExcelManagerBa(assetBackup, FOLDER_BA, EXCEL_BA, LANG_BA, skip_update)
		await this.excel.loadFiles()

		/*
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

		if (dont_build) {
			log.info(`Skip build item data`)
			return
		}
*/
		var demoFastcheck = false
		//foce_save = true
		//replace = true

		log.info(`Building item data`)
		await this.runAvatar(foce_save, replace, demoFastcheck)
		await this.runItem(foce_save, replace, demoFastcheck)
	}

	async runItem(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
		var typeClass = 2 // 2=item
		//var enumTes1: string[] = []
		//var enumTes2: string[] = []

		for (const [fileName, clazz] of Object.entries(EXCEL_BA)) {
			if (clazz !== ClassItemExcelBA) {
				log.info(`Skip file ${fileName} not match ClassItemExcelBA`)
				continue
			}

			const getItem = this.excel.getConfig(fileName as keyof typeof EXCEL_BA, "en") as ClassItemExcelBA
			if (!getItem) {
				log.errorNoStack(`Error get ${fileName}`)
				return
			}
			var filteredItem = Object.values(getItem)

			// TODO: some id is same so need filter by type item too
			/*
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		if (fastcheck) {
			if (!rebuild) {
				filteredItem = Object.values(getItem).filter((data) => !getItemDB.includes(data.Id))
			}
		}
        */
			log.warn(`Try update Item ${filteredItem.length}x`)

			for (const data of filteredItem) {
				if (data) {
					//log.info(`Item DEBUG: ${JSON.stringify(data, null, 2)}`)

					const id = data.Id
					const iconName = data.Icon

					// category is not always defined, so need check
					var ct = data.Category
					if (ct == undefined) {
						if (fileName == "currency.min.json") {
							ct = "Currency"
						} else {
							log.errorNoStack(`Category is undefined for ${fileName} id ${id}`)
							ct = "Unknown"
						}
					}
					var ctNum = getItemTypeBA(ct)

					const obj: ItemNormal = {
						type: typeClass,
						game: typeGame,
						id,
						name: {},
						desc: {},
						desc2: {},
						icon: "",
						// other
						starType: getItemRarity(data.Rarity),
						itemType: ctNum
					}

					/*
					if (!enumTes1.includes(ct)) {
						enumTes1.push(ct)
					}
					if (!enumTes2.includes(data.Rarity)) {
						enumTes2.push(data.Rarity)
					}
                    */

					// name and desc
					for (const lang of LANG_BA) {
						var dataOtherLanguages = this.excel.getConfig(
							fileName as keyof typeof EXCEL_BA,
							lang
						) as ClassItemExcelBA
						if (!dataOtherLanguages) {
							log.errorNoStack(`Error get ${fileName} for lang ${lang}`)
							continue
						}
						const entry = Object.values(dataOtherLanguages).find((e: any) => {
							// check if category is defined (TODO: remove this after all data is fixed)
							var ctx = e.Category
							if (ctx == undefined) {
								if (fileName == "currency.min.json") {
									ctx = "Currency"
								} else {
									log.errorNoStack(`Category is undefined for ${fileName} id ${id}`)
									ctx = "Unknown"
								}
							}

							return e.Id === id && ctx === ct
						})
						if (!entry) {
							log.errorNoStack(`No entry at index ${id - 1} (Id=${id}) in ${fileName} for lang=${lang}`)
							continue
						}
						var bName = lang.toUpperCase()
						try {
							obj.name[bName] = entry.Name
							obj.desc[bName] = entry.Desc
						} catch (error) {
							log.errorNoStack(`Error get name/desc for ${fileName} id ${id} lang ${lang}: ${error}`)
							//log.info(`Item DEBUG: ${JSON.stringify(dataOtherLanguages, null, 2)}`)
						}
					}

					// download icon
					if (!isEmpty(iconName)) {
						obj.icon = await General.downloadImageOrCopyLocal(
							`${DUMP_BA}/${iconName}.png`, // local file dump (private)
							`${FOLDER_BA}/icon/item/${iconName}.png`, // local file (public)
							`${domainPublic}/resources/${nameGame}/icon/item/${iconName}.png`, // url public
							`${assetBackup}/images/item/icon/${iconName}.webp`,
							replace
						)
					} else {
						log.errorNoStack(`Icon name is empty for ${fileName} id ${id}, skip download icon`)
					}

					// add to datebase
					var isAdd = await General.itemAdd(obj, rebuild, replace, { itemType: ctNum })
					log.info(
						`Item add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
					)

					//log.info("Item data:", obj)

					//await sleep(5)
				} else {
					log.info("skip", data)
				}
			}
		}

		//log.info(`Item type:`, createEnum(enumTes1, "getItemType"))
		//log.info(`Item rarity:`, createEnum(enumTes2, "getItemRarity"))
	}

	async runAvatar(rebuild: boolean, replace: boolean, fastcheck: boolean): Promise<void> {
		const getAvatar = this.excel.getConfig("students.min.json", "en")
		if (!getAvatar) {
			log.errorNoStack(`Error get students.min.json`)
			return
		}
		var filteredAvatars = Object.values(getAvatar)
		var typeClass = 1 // 1=avatar
		var getItemDB = await General.getItemIds(typeClass, typeGame)
		if (fastcheck) {
			if (!rebuild) {
				filteredAvatars = Object.values(getAvatar).filter((data) => !getItemDB.includes(data.Id))
			}
		}
		log.warn(`Try update Avatar ${filteredAvatars.length}x`)
		for (const data of filteredAvatars) {
			if (data) {
				const id = data.Id
				const iconPath = data.Icon
				const obj: ItemAvatar = {
					type: typeClass,
					game: typeGame,
					id,
					name: {},
					desc: {},
					desc2: {},
					icon: "",
					// other
					starType: data.StarGrade,
					weaponType: -1, // Weapon Type
					elementType: -1, // Attack?
					bodyType: -1 // Role
				}

				// name and desc
				for (const lang of LANG_BA) {
					var datax = this.excel.getConfig("students.min.json", lang)
					if (!datax) {
						log.errorNoStack(`Error get students.min.json for lang ${lang}`)
						continue
					}
					var bName = lang.toUpperCase()
					obj.name[bName] = datax[id].Name
					obj.desc[bName] = datax[id].ProfileIntroduction
				}

				// download icon
				obj.icon = await General.downloadImageOrCopyLocal(
					`${DUMP_BA}/${iconPath}`, // local file dump (private)
					`${FOLDER_BA}/icon/avatar/${id}.png`, // local file (public)
					`${domainPublic}/resources/${nameGame}/icon/avatar/${id}.png`, // url public
					`${assetBackup}/images/student/collection/${id}.webp`,
					replace
				)

				// add to datebase
				var isAdd = await General.itemAdd(obj, rebuild, replace)
				log.info(
					`Avatar add > ${obj.id} (T${obj.type}/G${obj.game}) is RB${rebuild}/RE${replace}/F${fastcheck} > D${isAdd}`
				)

				//log.info("Avatar data:", obj)
				//await sleep(5)
			} else {
				log.info("skip", data)
			}
		}
	}
}

const _ = new BA()
export default _
