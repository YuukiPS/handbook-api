import Logger from "@UT/logger"
import os from "os"

import fs from "fs/promises"
import axios, { AxiosError } from "axios"
import https from "https"
import path from "path"
import { createWriteStream, readFileSync } from "fs"
import { pipeline } from "stream/promises"
import { loadModule } from "cld3-asm"

const log = new Logger("Library")

export function getLocalIpAddress(): string {
	const networkInterfaces = os.networkInterfaces()
	for (const ifaceName in networkInterfaces) {
		const iface = networkInterfaces[ifaceName]
		if (iface == undefined) {
			return "?"
		}
		for (const entry of iface) {
			if (!entry.internal && entry.family === "IPv4") {
				return entry.address
			}
		}
	}
	return "Unknown"
}

export function sleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, 1000 * ms)
	})
}

export function isEmpty(value: string | number | any[] | object | undefined): boolean {
	// Check for undefined or null first.
	if (value === undefined || value === null) return true

	// Process strings: trim whitespace and check for empty string or special values.
	if (typeof value === "string") {
		const trimmed = value.trim()
		return trimmed === "" || trimmed.toLowerCase() === "undefined" || trimmed.toLowerCase() === "nan"
	}

	// Process numbers: check if the number is NaN or equals 0.
	if (typeof value === "number") {
		return Number.isNaN(value) || value === 0
	}

	// Process arrays: empty if the length is 0.
	if (Array.isArray(value)) {
		return value.length === 0
	}

	// Process plain objects: check if it has no own properties.
	// Note: This check will classify objects such as dates, functions, or custom class instances
	// as non-empty, because they have their own prototype structure.
	if (typeof value === "object") {
		// Exclude arrays (already handled) and perhaps other special objects if needed.
		return Object.keys(value).length === 0
	}

	// Return false if none of the conditions above are met.
	return false
}

export function getTimeV2(use_utc = false, minutesToAdd = 0, zone_time = 8): number {
	const now = new Date()
	// Adjust the time based on use_utc parameter
	let adjustedTime
	if (use_utc) {
		// Use UTC time by directly adding minutes to the current time
		adjustedTime = new Date(now.getTime() + minutesToAdd * 60000)
	} else {
		// Use local time (specified zone_time) by adding the time zone offset and additional minutes to the current time
		const localTimeOffsetMs = zone_time * 3600000 // Time zone offset in milliseconds
		adjustedTime = new Date(now.getTime() + localTimeOffsetMs + minutesToAdd * 60000)
	}
	// Return the Unix timestamp in seconds
	return Math.floor(adjustedTime.getTime() / 1000)
}

export function removeControlChars(str: string): string {
	return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
}

function trimAny(str: string, chars: string = " "): string {
	let start = 0,
		end = str.length

	while (start < end && chars.indexOf(str[start]) >= 0) ++start
	while (end > start && chars.indexOf(str[end - 1]) >= 0) --end

	return start > 0 || end < str.length ? str.substring(start, end) : str
}

export async function DownloadFile(link: string, fileFullPath: string, maxRetries: number = 3): Promise<number> {
	link = trimAny(removeControlChars(link))
	fileFullPath = trimAny(removeControlChars(fileFullPath))

	const fileName = path.basename(fileFullPath)
	const dir = path.dirname(fileFullPath)
	await fs.mkdir(dir, { recursive: true }).catch((err) => log.errorNoStack(`Failed to create directory: ${dir}`, err))

	const fileExists = await fs
		.access(fileFullPath)
		.then(() => true)
		.catch(() => false)

	if (fileExists) {
		const isRemove = await fs
			.unlink(fileFullPath)
			.then(() => true)
			.catch(() => false)
		log.warn(`Found file ${fileFullPath}, removed: ${isRemove}`)
	}

	log.debug(`Start downloading file: ${fileName} from ${link}`)

	let attempt = 0
	while (attempt < maxRetries) {
		try {
			const startTime = Date.now()

			const response = await axios.get(link, {
				responseType: "stream",
				timeout: 1000 * 30,
				httpsAgent: new https.Agent({
					rejectUnauthorized: false
				})
			})

			if (response.status === 404) {
				log.errorNoStack(`File ${link} not found`)
				return -1
			}
			if (response.status !== 200) {
				log.errorNoStack(`File failed to download ${link}:`, response.statusText)
				attempt++
				continue
			}

			const totalLength = Number(response.headers["content-length"]) || 0
			let downloadedLength = 0
			let lastUpdate = Date.now()
			let lastCheckSpeedTime = Date.now()
			let lastDownloadedLength = 0
			let slowDownloadCount = 0

			const fileStream = createWriteStream(fileFullPath)

			response.data.on("data", async (chunk: Buffer) => {
				downloadedLength += chunk.length
				const elapsed = (Date.now() - startTime) / 1000 // seconds
				const speed = downloadedLength / elapsed / 1024 / 1024 // MB/s

				// Check if speed drops below 1MB/s for 10 seconds
				if (Date.now() - lastCheckSpeedTime >= 10000) {
					const recentSpeed = (downloadedLength - lastDownloadedLength) / 10 / 1024 / 1024 // MB/s
					lastDownloadedLength = downloadedLength
					lastCheckSpeedTime = Date.now()

					if (recentSpeed < 1) {
						slowDownloadCount++
						if (slowDownloadCount >= 2) {
							process.stdout.write(`\n⚠️ Slow speed detected (<1MB/s). Restarting download...\n`)
							fileStream.close()
							await fs.unlink(fileFullPath).catch(() => {})
							return false // Restart download
						}
					} else {
						slowDownloadCount = 0 // Reset if speed recovers
					}
				}

				// Update progress every 500ms
				if (Date.now() - lastUpdate > 500) {
					lastUpdate = Date.now()

					let progressText = ""
					let etaText = ""

					if (totalLength) {
						const percent = ((downloadedLength / totalLength) * 100).toFixed(2)
						const barWidth = 30
						const completed = Math.round((downloadedLength / totalLength) * barWidth)
						const progressBar = "[" + "=".repeat(completed) + " ".repeat(barWidth - completed) + "]"
						progressText = `${progressBar} ${percent}%`

						// Estimate remaining time
						if (speed > 0) {
							const remainingTime = ((totalLength - downloadedLength) / (speed * 1024 * 1024)).toFixed(0)
							etaText = `ETA: ${remainingTime}s`
						}
					} else {
						progressText = `${downloadedLength} bytes`
					}

					process.stdout.write(
						`\r🔄 Downloading ${fileName} ${progressText} | ${speed.toFixed(2)} MB/s ${etaText}`
					)
				}
			})

			await pipeline(response.data, fileStream)

			const elapsedTime = (Date.now() - startTime) / 1000
			const finalSpeed = downloadedLength / elapsedTime / 1024 / 1024 // MB/s

			process.stdout.write(
				`\r✅ Download complete: ${fileName} | ${elapsedTime.toFixed(2)}s | Speed: ${finalSpeed.toFixed(
					2
				)} MB/s\n`
			)
			return 0
		} catch (error) {
			const c = error as AxiosError

			if (c.response?.status === 404) {
				log.errorNoStack(`File ${link} not found`)
				return -1
			}

			log.errorNoStack(`Error downloading file: ${link}, attempt ${attempt + 1}`, c.message)
			attempt++

			const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
			log.warn(`Retrying in ${delay / 1000}s...`)
			await sleep(delay / 1000)
		}
	}

	log.errorNoStack(`Failed to download file after ${maxRetries} attempts: ${link}`)
	return -2
}

/**
 * Asynchronously reads and parses a JSON file.
 * @param filePath - The path to the JSON file.
 * @returns A promise that resolves with the parsed JSON content.
 */
export async function readJsonFileAsync<T = unknown>(filePath: string): Promise<T> {
	try {
		const fileContent: string = await fs.readFile(filePath, "utf-8")
		const modifiedContent = fileContent.replace(/("Hash":\s*)(\d+)/g, '$1"$2"') // MOD SR: fix hash long number 64
		return JSON.parse(modifiedContent)
	} catch (error) {
		console.error(`Error reading JSON file at ${filePath}:`, error)
		throw error
	}
}

/**
 * Asynchronously writes content to a file.
 * @param filePath - The path to the file.
 * @param content - The content to write.
 * @param encoding - The file encoding (default is 'utf-8').
 * @returns A Promise that resolves when writing is complete.
 */
export async function writeFileAsync(
	filePath: string,
	content: string | Buffer,
	encoding: BufferEncoding = "utf-8"
): Promise<void> {
	return new Promise<void>(async (resolve, reject) => {
		await fs.writeFile(filePath, content, { encoding })
		resolve()
	})
}

/**
 * Check if a given string is a valid URL.
 */
export function isValidUrl(urlString: string): boolean {
	try {
		new URL(urlString)
		return true
	} catch {
		return false
	}
}

/**
 * Check if a file exists asynchronously.
 */
export async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath, fs.constants.F_OK)
		return true
	} catch (err: any) {
		if (err.code === "ENOENT") return false
		throw err
	}
}

/**
 * Ensure the directory for the given file path exists.
 */
export async function ensureDirectoryExists(filePath: string): Promise<void> {
	const directory = path.dirname(filePath)
	await fs.mkdir(directory, { recursive: true })
}

// In-memory cache for parsed JSON files
const textMapCache: Record<string, Record<string, string>> = {}
export function readJsonFileCached(filePath: string): Record<string, string> {
	if (!textMapCache[filePath]) {
		const content = readFileSync(filePath, "utf-8")
		textMapCache[filePath] = JSON.parse(content)
	}
	return textMapCache[filePath]
}

export function createEnum(keys: string[], nameFunc: string): string {
	// derive PascalCase enum name from your getter name
	const enumName = nameFunc.replace(/^get/, "").replace(/^[a-z]/, (c) => c.toUpperCase())

	// build the enum entries
	const entries = keys.map((k, i) => `  ${k} = ${i}`).join(",\n")

	// pick a sensible default fallback (first key)
	const defaultKey = keys[0]

	// name of the reverse lookup fn
	const numberFuncName = `${nameFunc}Number`

	return `
  enum ${enumName} {
  ${entries}
  }
  
  function ${nameFunc}(name: string): number {
	return (${enumName} as any)[name] ?? -1;
  }
  
  function ${numberFuncName}(id: number): string {
	return ${enumName}[id] ?? "${defaultKey}";
  }
  `.trim()
}

export function LanguageGame(i: string): string {

	// Normalize the input for matching (lowercase for locale mapping)
	const normalizedInput = i.trim().toLowerCase()

	// Fallback to default if no valid language code is detected.
	var defaultS = i
	if (i === "zh") {
		defaultS = "CHS"
	}

	log.warn(`Language ${i} = ${defaultS}`)
	return defaultS
}

export async function detectLang(text: string): Promise<string> {
	const cldFactory = await loadModule()
	const identifier = cldFactory.create(0, 1000)
	const findResult = identifier.findLanguage(text)
	return findResult?.language || "en_US"
}