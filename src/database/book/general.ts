import Logger from "@UT/logger"
import { statusCodes } from "@UT/constants"
import {
	DownloadFile,
	ensureDirectoryExists,
	fileExists,
	getTimeV2,
	isEmpty,
	isValidUrl,
	readJsonFileCached
} from "@UT/library"
import { BookRsp, GitLabCommit, ItemData, Prop, PropRsp } from "@UT/response"
// thrid party
import axios from "axios"
import fs from "fs/promises"
// datebase
import DBMongo from "@DB/client/mongo"
import { Filter, OptionalUnlessRequiredId } from "mongodb"

const log = new Logger("General")

export const _ = {
	getItem: async function (options?: {
		search?: string
		type?: number
		game?: number
		lang?: string
		limit?: number
		page?: number
	}): Promise<BookRsp> {
		try {
			const cItem = DBMongo.getCollection<ItemData>("book")
			if (!cItem) {
				log.errorNoStack("api_db_nofound_collection")
				return { message: "api_db_nofound_collection", retcode: statusCodes.error.CANCEL, data: null }
			}

			const { search, type, game, lang = "EN", limit = 10, page = 1 } = options || {}

			// build filter
			const query: any = {}
			if (search) query[`name.${lang}`] = { $regex: search, $options: "i" }
			if (!isEmpty(type)) query.type = type
			if (!isEmpty(game)) query.game = game

			log.info(`query: ${limit} limit > `, query)

			// compute skip
			const skip = (page - 1) * limit

			// start pipeline
			const pipeline: any[] = [{ $match: query }]

			// only paginate if limit > 0
			if (limit > 0) {
				pipeline.push({ $skip: skip }, { $limit: limit })
			}

			// then your addFields & project stages
			pipeline.push(
				{
					$addFields: {
						name: {
							$cond: {
								if: { $ifNull: [`$name.${lang}`, false] },
								then: `$name.${lang}`,
								else: {
									$cond: {
										if: { $ifNull: ["$name.EN", false] },
										then: "$name.EN",
										else: {
											$let: {
												vars: {
													firstKeyValue: { $arrayElemAt: [{ $objectToArray: "$name" }, 0] }
												},
												in: "$$firstKeyValue.v"
											}
										}
									}
								}
							}
						},
						desc: {
							$cond: {
								if: { $ifNull: [`$desc.${lang}`, false] },
								then: `$desc.${lang}`,
								else: {
									$cond: {
										if: { $ifNull: ["$desc.EN", false] },
										then: "$desc.EN",
										else: {
											$let: {
												vars: {
													firstKeyValue: { $arrayElemAt: [{ $objectToArray: "$desc" }, 0] }
												},
												in: "$$firstKeyValue.v"
											}
										}
									}
								}
							}
						},
						desc2: {
							$cond: {
								if: { $ifNull: [`$desc2.${lang}`, false] },
								then: `$desc2.${lang}`,
								else: {
									$cond: {
										if: { $ifNull: ["$desc2.EN", false] },
										then: "$desc2.EN",
										else: {
											$let: {
												vars: {
													firstKeyValue: { $arrayElemAt: [{ $objectToArray: "$desc2" }, 0] }
												},
												in: "$$firstKeyValue.v"
											}
										}
									}
								}
							}
						}
					}
				},

				// Exclude the original undesired fields. With a projection that only excludes, every other field passes through.
				{
					$project: {
						_id: 0 // remove MongoDB’s default _id field
						//name: 0, // change the original multilingual name object
						//desc: 0 // change the original multilingual description object
						// Notice we don't list dynamic fields like "weaponType" etc.
					}
				}
			)

			const processedResult = await cItem.aggregate(pipeline).toArray()

			if (processedResult.length > 0) {
				return {
					message: "api_db_book_get_success",
					retcode: 0,
					data: processedResult
				}
			} else {
				return {
					message: "api_db_book_notfound",
					retcode: -1,
					data: null
				}
			}
		} catch (error) {
			log.error(error)
			return {
				message: "api_db_book_error",
				retcode: -1,
				data: null
			}
		}
	},
	/**
	 * Check for existence of a document matching {id, type, …extraFilters}.
	 *
	 * @param id     — the required `id` field
	 * @param type   — the required `type` field
	 * @param filter — any additional fields to match (default: {})
	 */
	itemExists: async function (id: number, type: number, filter: Partial<ItemData> = {}): Promise<boolean> {
		await DBMongo.isConnected()

		const collection = DBMongo.getCollection<ItemData>("book")
		if (!collection) {
			log.errorNoStack("api_db_nofound_collection_book")
			return false
		}

		// merge required + extra filters
		const query = { id, type, ...filter }

		const existingDoc = await collection.findOne(query)
		return existingDoc !== null
	},
	/**
	 * Add or update a document in `book`, matching on {id, type, …extraFilter}.
	 * obj must include at least id/type, and any other fields are stored in the doc.
	 */
	itemAdd: async function <T extends ItemData>(
		obj: T,
		rebuild: boolean = false,
		replace: boolean = false,
		extraFilter: Omit<Partial<T>, "id" | "type"> = {} as Omit<Partial<T>, "id" | "type">
	): Promise<boolean> {
		await DBMongo.isConnected()
		const collection = DBMongo.getCollection<T>("book")
		if (!collection) {
			log.errorNoStack("api_db_nofound_collection_book")
			return false
		}

		const { id, type } = obj
		const query = { id, type, ...extraFilter } as Partial<T>

		if (rebuild) {
			if (replace) {
				// full-replace upsert
				await collection.replaceOne(query as Filter<T>, obj, { upsert: true })
			} else {
				// partial $set upsert
				await collection.updateOne(query as Filter<T>, { $set: obj }, { upsert: true })
			}
			return true
		}

		// if not rebuild, only insert when no matching doc found
		const existing = await collection.findOne(query as Filter<T>)
		if (!existing) {
			await collection.insertOne(obj as OptionalUnlessRequiredId<T>)
			return true
		} else {
			log.warn("itemAdd: already exists", { query })
			return false
		}
	},
	addMultiLangNamesAsObject: function (
		hash: string,
		langList: string[],
		folderPath: string = "",
		type: number = 0, // 1=genshin, 2=starrail
		nameIfNotFound: string = "",
		addNameCustom: string = "",
		nameSR: string = ""
	): Record<string, string> {
		const names: Record<string, string> = {}
		// || `UNK-${hash}`
		for (const lang of langList) {
			const fullPath = `${folderPath}/TextMap/TextMap${lang}.json`
			const getHashLANG = readJsonFileCached(fullPath)
			var isValid = getHashLANG[hash]
			if (isEmpty(isValid)) {
				//log.errorNoStack("not found", hash, lang)
				continue
			}
			isValid = isValid.replace("{NICKNAME}", `Trailblazer ${nameSR}`) // Mod SR
			names[lang] = isValid + addNameCustom
		}
		if (!isEmpty(nameIfNotFound) && Object.keys(names).length == 0) {
			names["EN"] = nameIfNotFound //|| `UNK-${hash}`
		}
		return names
	},
	downloadImageOrCopyLocal: async function (
		sourceUrlorLocal: string, // local file/url dump (private)
		localFile: string, // local file (public)
		urlPublic: string, // url public
		fallbackUrl: string = "" // fallback url
	): Promise<string> {
		if (!sourceUrlorLocal) return ""

		if (await fileExists(localFile)) {
			log.info(`File ${localFile} already exists`)
			// TODO: check if real valid file
			return urlPublic
		}

		const isRemote = isValidUrl(sourceUrlorLocal)
		log.info(`isRemote: ${isRemote} for ${sourceUrlorLocal} > ${localFile} > ${urlPublic}`)

		if (isRemote) {
			log.info(`Downloading ${sourceUrlorLocal} to ${localFile}`)
			const isDone = await DownloadFile(sourceUrlorLocal, localFile)
			if (isDone == 0) {
				log.info(`Download ${sourceUrlorLocal} to ${localFile} success`)
				return urlPublic
			} else {
				log.errorNoStack(`Download ${sourceUrlorLocal} to ${localFile} failed with code ${isDone}`)
				return this.downloadImageOrCopyLocal(fallbackUrl, localFile, urlPublic, "")
			}
		} else {
			if (await fileExists(sourceUrlorLocal)) {
				log.info(`Copying local file from ${sourceUrlorLocal} to ${localFile}`)
				await ensureDirectoryExists(localFile)
				await fs.copyFile(sourceUrlorLocal, localFile)
				return urlPublic
			} else {
				log.errorNoStack(`File ${sourceUrlorLocal} does not exist`)
				if (fallbackUrl) {
					log.info(`Using fallback URL: ${fallbackUrl}`)
					return this.downloadImageOrCopyLocal(fallbackUrl, localFile, urlPublic, "")
				} else {
					log.errorNoStack(`No fallback URL provided`)
					return ""
				}
			}
		}
	},
	downloadGit: async function (
		repoName: string,
		repoFolder: string,
		file: string = "TextMap/TextMapEN.json",
		skip: boolean = false,
		branch: string = "master"
	): Promise<string> {
		const urlDL = `https://gitlab.com/${repoName}/-/raw/${branch}/${file}`
		const savePath = `${repoFolder}/${file}`
		if (skip) {
			const fileExists = await fs
				.access(savePath)
				.then(() => true)
				.catch(() => false)
			if (fileExists) {
				log.info(`File ${savePath} already exists`)
				return savePath
			} else {
				log.info(`File ${savePath} does not exist but skip is true so we will download it`)
			}
		}
		log.info(`Downloading ${urlDL} to ${savePath}`)
		var isDone = await DownloadFile(urlDL, savePath)
		if (isDone == 0) {
			log.info(`Download ${urlDL} to ${savePath} success`)
		} else {
			log.errorNoStack(`Download ${urlDL} to ${savePath} failed with code ${isDone}`)
			return ""
		}
		return savePath
	},
	checkGit: async function (name: string, saveDB: string, skip: boolean = false): Promise<boolean> {
		if (skip) {
			log.info(`Skip checking Git: ${name} > ${saveDB}`)
			return false
		}
		const urlCheck = `https://gitlab.com/api/v4/projects/${encodeURIComponent(name)}/repository/commits?per_page=1`
		try {
			const response = await axios.get<GitLabCommit[]>(urlCheck)
			const latestCommit = response.data[0]

			log.info(`Latest commit for ${saveDB} > ${latestCommit.id} (${latestCommit.committed_date})`)

			var getLast = await this.getProp(saveDB)
			if (getLast.data != null) {
				if (latestCommit.id !== getLast.data.value) {
					log.info("New update is available!")
					// TODO: send notification to user
					this.updateProp(saveDB, latestCommit.id, "update")
					return true
				} else {
					log.errorNoStack("No updates.")
				}
			} else {
				log.warn(`No data ${saveDB} found in database.`)
				this.updateProp(saveDB, latestCommit.id, "update") // try save it
				return true
			}
		} catch (error: any) {
			log.errorNoStack("Error fetching GitLab data:", error)
		}

		return false
	},
	updateProp: async function (field: string, value: string, reason: string = "none"): Promise<PropRsp> {
		if (isEmpty(field)) {
			return {
				message: "api_db_prop_notoken",
				retcode: -2,
				data: null
			}
		}

		try {
			await DBMongo.isConnected()

			const cProp = DBMongo.getCollection<Prop>("prop")
			if (!cProp) {
				return {
					message: `api_db_nofound_collection`,
					retcode: statusCodes.error.CANCEL,
					data: null
				}
			}

			// Update the account based on the token and retrieve the updated document
			const updateResult = await cProp.findOneAndUpdate(
				{ _id: field },
				{
					$set: {
						value,
						time: getTimeV2(true),
						reason
					}
				},
				{
					upsert: true, // Insert a new document if not found
					returnDocument: "after" // Return the updated document
				}
			)
			if (updateResult) {
				return {
					message: "api_db_prop_update_success",
					retcode: 0,
					data: updateResult
				}
			} else {
				log.error({ name: "api_db_prop_update_failed", error: updateResult })
				return {
					message: "api_db_prop_update_failed",
					retcode: -1,
					data: null
				}
			}
		} catch (error) {
			log.error(error)
			return {
				message: "api_db_prop_failed1",
				retcode: -2,
				data: null
			}
		}
	},
	getProp: async function (field: string): Promise<PropRsp> {
		try {
			await DBMongo.isConnected()

			let cProp = DBMongo.getCollection<Prop>("prop")

			// After the loop, check if the collection was successfully retrieved
			if (!cProp) {
				return {
					message: `api_db_nofound_collection`,
					retcode: statusCodes.error.CANCEL,
					data: null
				}
			}

			let d = await cProp.findOne({ _id: field })
			if (d) {
				return {
					message: `api_db_prop_${field}_ok`,
					retcode: 0,
					data: d
				}
			} else {
				return {
					message: `api_db_prop_${field}_failed`,
					retcode: -1,
					data: null
				}
			}
		} catch (error) {
			log.error(error)
			return {
				message: "api_db_prop_failed1",
				retcode: -2,
				data: null
			}
		}
	}
}

export default _
