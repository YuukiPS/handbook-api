import Logger from "@UT/logger"
import { readJsonFileAsync } from "./library"
import axios from "axios"
import fs from "fs/promises"

const log = new Logger("ExcelBa")

/**
 * Generic manager to download JSON files, instantiate classes per-language,
 * and prune extraneous fields based on each class's static `fields` list.
 */
export default class ExcelManagerBa<T extends { [key: string]: new (data: Record<string, any>) => any }> {
	private configs: Partial<{
		[K in keyof T]: Partial<{ [lang: string]: InstanceType<T[K]> }>
	}> = {}

	constructor(
		private url: string,
		private folder: string,
		private fileMap: T,
		private languages: string[] = ["en"],
		private skip: boolean = false
	) {}

	async loadFiles(): Promise<void> {
		for (const filePath of Object.keys(this.fileMap) as (keyof T)[]) {
			for (const lang of this.languages) {
				const fullPath = `${lang}/${filePath as string}`
				const saveDir = `${this.folder}/data/${lang}`
				const savePath = `${saveDir}/${filePath as string}`

				let needsDownload = true
				try {
					await fs.access(savePath)
					if (this.skip) {
						needsDownload = false
						log.info(`Skipping download (exists & skip=true): ${fullPath}`)
					} else {
						log.info(`File exists but skip=false, will re-download: ${fullPath}`)
					}
				} catch {
					log.info(`File does not exist, will download: ${fullPath}`)
				}

				try {
					if (needsDownload) {
						const response = await axios.get(`${this.url}/data/${fullPath}`)
						if (response.status !== 200) {
							log.errorNoStack(`Error downloading file: ${fullPath} - Status: ${response.status}`)
							continue
						}
						await fs.mkdir(saveDir, { recursive: true })
						await fs.writeFile(savePath, JSON.stringify(response.data, null, 2), "utf-8")
					}

					const rawData = await readJsonFileAsync<Record<string, any>>(savePath)
					const ConfigClass = this.fileMap[filePath]

					// Determine fields to keep: static `fields` on class, if provided
					const staticFields: string[] = Array.isArray((ConfigClass as any).fields)
						? (ConfigClass as any).fields
						: []

					// Prune entries based on staticFields (if any)
					const prunedData =
						staticFields.length > 0
							? Object.fromEntries(
									Object.entries(rawData).map(([key, val]) => [
										key,
										staticFields.reduce((obj, f) => {
											if (val && Object.prototype.hasOwnProperty.call(val, f)) {
												obj[f] = val[f]
											}
											return obj
										}, {} as Record<string, any>)
									])
							  )
							: rawData

					const instance = new ConfigClass(prunedData)

					if (!this.configs[filePath]) this.configs[filePath] = {}
					;(this.configs[filePath] as { [lang: string]: InstanceType<T[typeof filePath]> })[lang] = instance

					log.info(`Loaded and instantiated: ${fullPath}`)
				} catch (err: any) {
					log.errorNoStack(`Error processing file: ${fullPath} - ${err.message || err}`)
				}
			}
		}
	}

	getConfig<K extends keyof T>(filePath: K, lang?: string): InstanceType<T[K]> | undefined {
		const language = lang ?? this.languages[0]
		return this.configs[filePath]?.[language] as InstanceType<T[K]> | undefined
	}
}
