import { MongoClient, Db, Collection, Document } from "mongodb"
import Logger from "@UT/logger"
import Config from "@UT/config"

const log = new Logger("MongoDB")

export class MongoDBClient {
	private mongoClient: MongoClient | null = null
	private db: Db | null = null

	public dbUrl: string = ""
	public dbName: string = ""

	constructor(urlDB: string, dbName: string) {
		this.dbUrl = urlDB
		this.dbName = dbName

		this.connect()
	}

	private async connect() {
		if (this.mongoClient == null) {
			try {
				// TODO: we need auto reconnect if error or down
				this.mongoClient = new MongoClient(this.dbUrl, {
					connectTimeoutMS: 1000 * 60
				})

				var mySV = `${this.dbUrl} : `

				// Command
				this.mongoClient.on("commandStarted", (event) =>
					log.info(mySV + `Command started ${event.commandName}`)
				)
				this.mongoClient.on("commandSucceeded", (event) =>
					log.info(mySV + `Command succeeded ${event.commandName}`)
				)
				this.mongoClient.on("commandFailed", (event) =>
					log.errorNoStack(mySV + `Command failed ${event.commandName}`)
				)

				// Heartbeat
				this.mongoClient.on("serverHeartbeatStarted", (event) => {
					log.debug(mySV + "MongoDB server heartbeat started")
				})
				this.mongoClient.on("serverHeartbeatSucceeded", (event) => {
					log.debug(mySV + "MongoDB server heartbeat succeeded")
				})
				this.mongoClient.on("serverHeartbeatFailed", (event) =>
					log.debug(mySV + `MongoDB server heartbeat failed`, event)
				)

				// Pool
				this.mongoClient.on("connectionPoolCreated", (event) => log.info(mySV + "Connection pool created"))
				this.mongoClient.on("connectionPoolClosed", (event) => log.warn(mySV + "Connection pool closed", event))
				this.mongoClient.on("connectionPoolCleared", (event) => log.info(mySV + "Connection pool cleared"))

				// Connect
				this.mongoClient.on("connectionCreated", (event) => log.info(mySV + "Connection created"))
				this.mongoClient.on("connectionReady", (event) => log.info(mySV + "Connection ready"))
				this.mongoClient.on("connectionClosed", (event) => {
					// TODO COUNT
				})
				this.mongoClient.on("connectionCheckOutStarted", (event) => {
					// TODO COUNT
				})
				this.mongoClient.on("connectionCheckOutFailed", (event) => {
					// TODO COUNT
				})
				this.mongoClient.on("connectionCheckedOut", (event) => {
					// TODO COUNT
				})
				this.mongoClient.on("connectionCheckedIn", (event) => {
					// TODO COUNT
				})

				// Server Status
				this.mongoClient.on("serverOpening", (event) => log.info(mySV + "MongoDB server opening", event))
				this.mongoClient.on("serverClosed", (event) => log.warn(mySV + "MongoDB server closed"))
				this.mongoClient.on("serverDescriptionChanged", (event) =>
					log.info(mySV + "Server description changed")
				)

				// Topology ?
				this.mongoClient.on("topologyOpening", (event) => log.info(mySV + "Topology opening"))
				this.mongoClient.on("topologyClosed", (event) => log.warn(mySV + "Topology closed", event))
				this.mongoClient.on("topologyDescriptionChanged", (event) =>
					log.info(mySV + "Topology description changed")
				)

				// ???
				this.mongoClient.on("timeout", () => log.warn(mySV + "MongoDB operation timeout"))
				this.mongoClient.on("open", (event) => log.info(mySV + "Connection to MongoDB server opened"))
				this.mongoClient.on("close", () => log.warn(mySV + "Connection to MongoDB server closed"))
				this.mongoClient.on("error", (err) => log.errorNoStack(mySV + `MongoDB error`, err))

				await this.mongoClient.connect()
				this.db = this.mongoClient.db(this.dbName)
				log.info(`Connected to MongoDB server: ${this.dbName} > ${this.dbUrl}`)
			} catch (err) {
				log.errorNoStack(`Error connecting to MongoDB: ${err}`)
			}
		} else {
			log.warn("MongoDB is already connected")
		}
	}

	public async isConnected(timeout: number = 10000): Promise<boolean> {
        const startTime = Date.now();
        while (!this.db && Date.now() - startTime < timeout) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
        }
		// TODO: maybe need send echo
        return this.db != null;
    }

	/**
	 * Get the MongoDB database instance.
	 * @returns The MongoDB database instance or null if not yet initialized.
	 */
	public getDb(): Db | null {
		return this.db
	}

	/**
	 * Get a collection from the MongoDB database.
	 * @param name The name of the collection.
	 * @returns The collection instance or null if the database is not yet initialized.
	 */
	public getCollection<T extends Document>(name: string): Collection<T> | null {
		if (!this.db) {
			throw new Error(`MongoDB client is not yet ready (${this.dbName}).`)
		}
		return this.db.collection<T>(name)
	}
}

const instance = new MongoDBClient(Config.database.account.url, Config.database.account.db)
export default instance
