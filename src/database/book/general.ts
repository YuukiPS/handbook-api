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
import { BookRsp, DocumentationData, GitLabCommit, ItemData, Prop, PropRsp, TypeDocumentation } from "@UT/response"
import axios from "axios"
import fs from "fs/promises"
import DBMongo from "@DB/client/mongo"
import { Filter, OptionalUnlessRequiredId } from "mongodb"
import config from "@UT/config"
import { LANG_SR } from "./star-rail"
import { LANG_GI } from "./genshin-impact"
import Discord from "@SV/discord"
import Yuuki from "@DB/book/yuuki"

const log = new Logger("General")

export const _ = {
	getItem: async function (
		id: number,
		type: number,
		game?: number,
		lang: string = "EN",
		filter: Partial<ItemData> = {}
	): Promise<any> {
		await DBMongo.isConnected()
		const collection = DBMongo.getCollection<ItemData>("book")
		if (!collection) {
			log.errorNoStack("api_db_nofound_collection_book")
			return false
		}

		var setlang = lang.toUpperCase()

		// 1) build your match stage
		const match: any = { id, type, ...filter }
		if (game !== undefined) {
			match.game = game
		}

		// 2) assemble pipeline
		const pipeline: any[] = [
			{ $match: match },
			{
				$addFields: {
					name: {
						$cond: {
							if: { $ifNull: [`$name.${setlang}`, false] },
							then: `$name.${setlang}`,
							else: {
								$cond: {
									if: { $ifNull: ["$name.EN", false] },
									then: "$name.EN",
									else: {
										$let: {
											vars: {
												firstKeyValue: {
													$arrayElemAt: [{ $objectToArray: "$name" }, 0]
												}
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
							if: { $ifNull: [`$desc.${setlang}`, false] },
							then: `$desc.${setlang}`,
							else: {
								$cond: {
									if: { $ifNull: ["$desc.EN", false] },
									then: "$desc.EN",
									else: {
										$let: {
											vars: {
												firstKeyValue: {
													$arrayElemAt: [{ $objectToArray: "$desc" }, 0]
												}
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
							if: { $ifNull: [`$desc2.${setlang}`, false] },
							then: `$desc2.${setlang}`,
							else: {
								$cond: {
									if: { $ifNull: ["$desc2.EN", false] },
									then: "$desc2.EN",
									else: {
										$let: {
											vars: {
												firstKeyValue: {
													$arrayElemAt: [{ $objectToArray: "$desc2" }, 0]
												}
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
			{ $project: { _id: 0 } },
			{ $limit: 1 }
		]

		// 3) run it and grab the first result
		const [item] = await collection.aggregate(pipeline).toArray()

		// 4) return a uniform “not found” or the item
		if (!item) {
			return {
				message: "api_db_book_notfound",
				retcode: -1,
				data: null
			}
		}

		return {
			message: "api_db_book_get_success",
			retcode: 0,
			data: item
		}
	},
	findItem: async function (options?: {
		search?: string
		type?: number
		game?: number
		lang?: string
		limit?: number
		page?: number
		split?: boolean
	}): Promise<BookRsp> {
		try {
			const cItem = DBMongo.getCollection<ItemData>("book")
			if (!cItem) {
				log.errorNoStack("api_db_nofound_collection")
				return { message: "api_db_nofound_collection", retcode: statusCodes.error.CANCEL, data: null }
			}

			const { search, type, game, lang = "EN", limit = 10, page = 1, split = false } = options || {}

			var setlang = lang.toUpperCase()

			// build filter
			const query: any = {}
			if (search) {
				const words = search.trim().split(/\s+/).filter(Boolean)
				// 1) list all of your language‐codes here (or pull them from config)
				const LANGS = [...new Set([...LANG_SR, ...LANG_GI])]

				// helper: build a regex‐clause for one word against all langs
				const orClausesForWord = (word: string) =>
					LANGS.map((lang) => ({
						[`name.${lang}`]: { $regex: word, $options: "i" }
					}))

				if (!split || words.length === 1) {
					// simple / single‐word search: OR over all languages
					query.$or = orClausesForWord(search)
				} else {
					// multi‐word split: every word must match at least one lang
					query.$and = words.map((word) => ({
						$or: orClausesForWord(word)
					}))
				}
			}
			if (!isEmpty(type)) query.type = type
			if (!isEmpty(game)) query.game = game

			log.debug(`query findItem: ${limit} limit > `, query)

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
								if: { $ifNull: [`$name.${setlang}`, false] },
								then: `$name.${setlang}`,
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
								if: { $ifNull: [`$desc.${setlang}`, false] },
								then: `$desc.${setlang}`,
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
								if: { $ifNull: [`$desc2.${setlang}`, false] },
								then: `$desc2.${setlang}`,
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
	getItemIds: async function (type: number, game: number, filter: Partial<ItemData> = {}): Promise<number[]> {
		await DBMongo.isConnected()
		const collection = DBMongo.getCollection<ItemData>("book")
		if (!collection) {
			log.errorNoStack("api_db_nofound_collection_book")
			return []
		}

		// build your query: must match both type AND game, plus any extra filters
		const query = { type, game, ...filter }

		// return distinct "id" values matching that query
		return (await collection.distinct("id", query)).map((id) => Number(id))
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
		extraFilter: Omit<Partial<T>, "id" | "type" | "game"> = {} as Omit<Partial<T>, "id" | "type" | "game">
	): Promise<boolean> {
		await DBMongo.isConnected()
		const collection = DBMongo.getCollection<T>("book")
		if (!collection) {
			log.errorNoStack("api_db_nofound_collection_book")
			return false
		}

		const { id, type, game } = obj
		// now matching on id, type AND game, plus any extraFilter fields
		const query = { id, type, game, ...extraFilter } as Partial<T>

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
			if (obj.id == 0) {
				// set id to 0 for auto increment
				obj.id = await Yuuki.getCount("book")
			}

			await collection.insertOne(obj as OptionalUnlessRequiredId<T>)
			return true
		} else {
			log.debug("itemAdd: already exists", { query })
			return false
		}
	},
	addDoc: async function <T extends DocumentationData>(
		obj: T,
		rebuild: boolean = false,
		replace: boolean = false,
		extraFilter: Omit<Partial<T>, "id"> = {} as Omit<Partial<T>, "id">
	): Promise<boolean> {
		await DBMongo.isConnected()
		const collection = DBMongo.getCollection<T>("documentation")
		if (!collection) {
			log.errorNoStack("api_db_nofound_collection_book")
			return false
		}

		const { id } = obj
		// now matching on id, type AND game, plus any extraFilter fields
		const query = { id, ...extraFilter } as Partial<T>

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
			if (obj.id == 0) {
				// set id to 0 for auto increment
				obj.id = await Yuuki.getCount("documentation")
			}

			await collection.insertOne(obj as OptionalUnlessRequiredId<T>)
			return true
		} else {
			log.warn("itemDoc: already exists", { query })
			return false
		}
	},
	findTopKSimilar: async function (
		queryEmbedding: number[],
		type: TypeDocumentation,
		filter: Partial<DocumentationData> = {},
		k = 5
	): Promise<Omit<DocumentationData, "embedding">[]> {
		const collection = DBMongo.getCollection<DocumentationData>("documentation")
		if (!collection) {
			throw new Error("Collection not found")
		}

		// Remove `embedding` from the filter if someone accidentally passed it
		const { embedding: _drop, ...safeFilter } = filter

		// Always match on `type`, plus any extra fields in `safeFilter`
		const matchCriteria: Record<string, any> = { type, ...safeFilter }

		const pipeline = [
			// 1) filter by type and any other user‑provided fields
			{ $match: matchCriteria },

			// 2) compute cosine‑similarity score
			{
				$addFields: {
					score: {
						$function: {
							lang: "js",
							body: `
					function(docEmb, qryEmb) {
					  let dot = 0, magA = 0, magB = 0;
					  for (let i = 0; i < docEmb.length; ++i) {
						dot  += docEmb[i] * qryEmb[i];
						magA += docEmb[i] * docEmb[i];
						magB += qryEmb[i] * qryEmb[i];
					  }
					  if (magA === 0 || magB === 0) return 0;
					  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
					}
				  `,
							args: ["$embedding", queryEmbedding]
						}
					}
				}
			},

			// 3) sort by highest similarity
			{ $sort: { score: -1 } },

			// 4) take the top K
			{ $limit: k },

			// 5) drop the embedding vector (and the temporary score)
			{ $project: { embedding: 0, score: 0 } }
		]

		return collection.aggregate<Omit<DocumentationData, "embedding">>(pipeline).toArray()
	},
	addMultiLangNamesAsObject: function (
		hash: string,
		langList: string[],
		folderPath: string = "",
		type: number = 0, // 1=genshin, 2=starrail
		nameIfNotFound: string = "",
		addNameCustom: string = "",
		nameSR: string = "",
		namaSR2: string = ""
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
			isValid = isValid.replace("{NICKNAME}", `Trailblazer`) // Mod SR
			if (!isEmpty(namaSR2)) {
				isValid = `${isValid} ${namaSR2}` // Mod SR
			}
			names[lang] = isValid + addNameCustom
		}
		if (!isEmpty(nameIfNotFound) && Object.keys(names).length == 0) {
			names["EN"] = nameIfNotFound //|| `UNK-${hash}`
		}
		return names
	},
	findNameHash: function (
		hash: string,
		lang: string,
		langList: string[],
		folderPath: string = "",
		type: number = 0, // 1=genshin, 2=starrail (unused here but kept for parity)
		nameIfNotFound: string = "",
		addNameCustom: string = "",
		nameSR: string = ""
	): string {
		// build the order of langs to try
		const tryLangs = [lang, ...langList.filter((l) => l !== lang)]
		for (const l of tryLangs) {
			const fullPath = `${folderPath}/TextMap/TextMap${l}.json`
			const textMap = readJsonFileCached(fullPath)
			const entry = textMap[hash]

			if (!isEmpty(entry)) {
				// replace placeholder and append any custom suffix
				const replaced = entry.replace("{NICKNAME}", `Trailblazer ${nameSR}`)
				return replaced + addNameCustom
			}
		}

		// nothing found in any language
		if (!isEmpty(nameIfNotFound)) {
			return nameIfNotFound
		}
		// last-resort “unknown” marker
		return `UNK-${hash}`
	},
	downloadImageOrCopyLocal: async function (
		sourceUrlorLocal: string, // local file/url dump (private)
		localFile: string, // local file (public)
		urlPublic: string, // url public
		fallbackUrl: string = "", // fallback url
		replace: boolean = false
	): Promise<string> {
		if (!sourceUrlorLocal) return ""

		if (await fileExists(localFile) && !replace) {
			log.debug(`File1 ${localFile} already exists`)
			// TODO: check if real valid file use md5 between local and remote
			return urlPublic
		}

		const isRemote = isValidUrl(sourceUrlorLocal)
		log.info(`isRemote: ${isRemote} for ${sourceUrlorLocal} > ${localFile} > ${urlPublic} | replace: ${replace} | fallback: ${fallbackUrl}`)

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
				//log.errorNoStack(`File ${sourceUrlorLocal} does not exist`)
				if (fallbackUrl) {
					log.info(`File local not found, using fallback URL: ${fallbackUrl}`)
					return this.downloadImageOrCopyLocal(fallbackUrl, localFile, urlPublic, "", replace)
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
				log.debug(`File2 ${savePath} already exists`)
				// TODO: check if real valid file use md5 between local and remote
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
	checkGit: async function (
		name: string,
		saveDB: string,
		skip: boolean = false,
		tesMode: boolean = false
	): Promise<boolean> {
		if (skip) {
			log.info(`Skip checking Git: ${name} > ${saveDB}`)
			return false
		}
		const urlCheck = `https://gitlab.com/api/v4/projects/${encodeURIComponent(name)}/repository/commits?per_page=1`
		try {
			const response = await axios.get<GitLabCommit[]>(urlCheck)
			const latestCommit = response.data[0]

			log.info(`Latest commit for ${saveDB} > ${latestCommit.id} (${latestCommit.committed_date})`)

			var getLast = await Yuuki.getProp(saveDB)
			if (getLast.data != null) {
				if (latestCommit.id !== getLast.data.value || tesMode) {
					log.info("New update is available!")
					if (!isEmpty(config.bot.discord.webhook.notification.token)) {
						const embedPayload = {
							type: "rich",
							title: latestCommit.title,
							description: "", // you can add a subtitle or leave empty
							color: 0x7289da, // Discord “blurple” or any hex color
							fields: [
								{ name: "Commit ID", value: latestCommit.id, inline: false },
								{ name: "Short ID", value: latestCommit.short_id, inline: true },
								{
									name: "Created At",
									value: new Date(latestCommit.created_at).toLocaleString(),
									inline: true
								},
								{
									name: "Parent Commit(s)",
									value: latestCommit.parent_ids.join(", ") || "None",
									inline: false
								},
								{
									name: "Author",
									value: `${latestCommit.author_name}`,
									inline: true
								},
								{
									name: "Authored Date",
									value: new Date(latestCommit.authored_date).toLocaleString(),
									inline: true
								},
								{
									name: "Committer",
									value: `${latestCommit.committer_name}`,
									inline: true
								},
								{
									name: "Committed Date",
									value: new Date(latestCommit.committed_date).toLocaleString(),
									inline: true
								},
								{
									name: "Message",
									value: latestCommit.message.trim() || "*no message*",
									inline: false
								},
								{
									name: "View Commit",
									value: `[Open in GitLab](${latestCommit.web_url})`,
									inline: false
								}
							],
							footer: {
								text: "GitLab Commit Notification"
							}
						}
						Discord.SendWebhook(
							{
								content: `Update resource!`,
								embeds: [embedPayload]
							} as any,
							config.bot.discord.webhook.notification
						)
					} else {
						log.warn(`skip notif update, no token is found`)
					}
					Yuuki.updateProp(saveDB, latestCommit.id, "update")
					return true
				} else {
					log.errorNoStack("No updates.")
				}
			} else {
				log.warn(`No data ${saveDB} found in database.`)
				Yuuki.updateProp(saveDB, latestCommit.id, "update") // try save it
				return true
			}
		} catch (error: any) {
			log.errorNoStack("Error fetching GitLab data:", error)
		}

		return false
	}	
}

export default _
