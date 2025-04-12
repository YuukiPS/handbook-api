import Logger from "@UT/logger"
import Config from "@UT/config"
import { isMainThread } from "worker_threads"
import IORedis, { Redis } from "ioredis"

const log = new Logger("Redis")

export class RedisDB {
	private redisClient: Redis | null = null

	public dbUrl: string = ""

	constructor(urlDB: string) {
		this.dbUrl = urlDB
		if (isMainThread) {
			log.info("This is main thread for redis server")
			this.Start()
		} else {
			log.info("This is another thread for redis server")
			this.Start()
		}
	}

	public Start() {
		if (this.redisClient == null) {
			this.redisClient = new IORedis(this.dbUrl, {
				maxRetriesPerRequest: null
			})

			// Event listeners for Redis client
			this.redisClient.on("ready", () => {
				log.info("Connected to Redis server")
			})
			this.redisClient.on("error", (err) => {
				log.errorNoStack(`Error connecting to Redis: ${err}`)
			})
			this.redisClient.on("connect", () => {
				log.info("Connecting to Redis...")
			})
			this.redisClient.on("end", () => {
				log.warn("Connection to Redis ended")
			})
		} else {
			log.warn("Redis is already running")
		}
	}

	/**
	 * Get the Redis client instance.
	 * @returns The Redis client instance or null if not yet initialized.
	 */
	public getClient(): Redis {
		if (!this.redisClient) {
			throw new Error("Redis client is not yet ready.")
		}

		return this.redisClient
	}

	/**
	 * Get the value for the given key.
	 * @param key The key to retrieve the value for.
	 * @returns The value associated with the key, or null if not found.
	 * @throws Error if Redis client is not yet ready.
	 */
	public async get(key: string): Promise<any | null> {
		if (!this.redisClient) {
			throw new Error("Redis client is not yet ready.")
		}

		const reply = await this.redisClient.get(key)
		return reply !== null ? this.parseValue(reply) : null
	}

	/**
	 * Parse the value retrieved from Redis.
	 * @param value The value retrieved from Redis.
	 * @returns The parsed value.
	 */
	private parseValue(value: string): any {
		try {
			// Attempt to parse as JSON
			return JSON.parse(value)
		} catch (error) {
			// If parsing fails, return the raw string
			return value
		}
	}

	/**
	 * Get the expiration timestamp for the given key.
	 * @param key The key to retrieve the expiration timestamp for.
	 * @returns The expiration timestamp in seconds, or -1 if the key does not exist or has no expiration.
	 * @throws Error if Redis client is not yet ready.
	 */
	public async getExpiresTimestamp(key: string): Promise<number> {
		if (!this.redisClient) {
			throw new Error("Redis client is not yet ready.")
		}

		const ttl = await this.redisClient.ttl(key)
		if (ttl === -1) {
			return -1
		}

		const currentTimestamp = Math.floor(Date.now() / 1000)
		const expiresTimestamp = currentTimestamp + ttl
		return expiresTimestamp
	}

	/**
	 * Set the value for the given key with an optional expiration time.
	 * @param key The key to set the value for.
	 * @param value The value to set.
	 * @param expiresInMinutes The expiration time in minutes (default: 30 minutes).
	 * @throws Error if Redis client is not yet ready.
	 */
	public async set(key: string, value: any, expiresInMinutes: number = 30): Promise<void> {
		if (!this.redisClient) {
			throw new Error("Redis client is not yet ready.")
		}

		const expiresInSeconds = expiresInMinutes * 60
		await this.redisClient.setex(key, expiresInSeconds, this.stringifyValue(value))
	}

	/**
	 * Stringify the value to be stored in Redis.
	 * @param value The value to stringify.
	 * @returns The stringified value.
	 */
	private stringifyValue(value: any): string {
		// Stringify as JSON if it's an object, otherwise treat as a raw string
		return typeof value === "object" ? JSON.stringify(value) : String(value)
	}

	/**
	 * Delete the value for the given key.
	 * @param key The key to delete.
	 * @throws Error if Redis client is not yet ready.
	 */
	public async delete(key: string): Promise<void> {
		if (!this.redisClient) {
			throw new Error("Redis client is not yet ready.")
		}

		await this.redisClient.del(key)
	}

	/**
	 * Delete all keys matching the specified pattern.
	 * @param pattern The pattern to match keys for deletion.
	 * @throws Error if Redis client is not yet ready.
	 */
	public async deleteByPattern(pattern: string): Promise<void> {
		if (!this.redisClient) {
			throw new Error("Redis client is not yet ready.")
		}

		// Fetch all keys matching the pattern
		const keys = await this.redisClient.keys(pattern)

		// Delete each key
		for (const key of keys) {
			await this.redisClient.del(key)
		}
	}

	public Run() {
		log.info(`Pong`)
	}
}

const instance = new RedisDB(Config.database.cache.url)
export default instance
