import Logger from "@UT/logger"
// datebase
import General from "@DB/general/api"
import { readJsonFileAsync } from "./library"

const log = new Logger("Excel")

export default class ExcelManager<T extends { [key: string]: new (data: Record<string, any>) => any }> {
	// Create an internal storage object using a mapped type from T.
	private configs: Partial<{ [K in keyof T]: InstanceType<T[K]> }> = {}

	constructor(
		private repo: string,
		private folder: string,
		private fileMap: T,
		private skip: boolean = false,
		private branch: string = "master",
		private pathBin: string = "ExcelBinOutput"
	) {}

	// Loads all files defined in fileMap.
	async loadFiles(): Promise<void> {
		// Get an array of file names from fileMap's keys.
		const fileKeys = Object.keys(this.fileMap) as (keyof T)[]
		for (const filePath of fileKeys) {
			const fullPath = `${this.pathBin}/${filePath as string}`
			const savePath = await General.downloadGit(this.repo, this.folder, fullPath, this.skip, this.branch)
			if (savePath === "") {
				log.errorNoStack(`Error downloading file: ${fullPath}`)
				continue
			}
			try {
				// Read the raw JSON data.
				const rawData = await readJsonFileAsync<Record<string, any>>(savePath)
				// Retrieve the class constructor from the mapping.
				const ConfigClass = this.fileMap[filePath]
				// Instantiate the configuration class with raw data.
				const configInstance = new ConfigClass(rawData)
				this.configs[filePath] = configInstance
				log.info(`Loaded and instantiated: ${fullPath}`)
			} catch (err) {
				log.errorNoStack(`Error reading file: ${fullPath} - ${err}`)
			}
		}
	}

	// Retrieve a configuration instance for a specific file.
	getConfig<K extends keyof T>(filePath: K): InstanceType<T[K]> | undefined {
		return this.configs[filePath] as InstanceType<T[K]>
	}
}
