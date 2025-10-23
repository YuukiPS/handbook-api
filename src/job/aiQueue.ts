import "module-alias/register"
import { isMainThread } from "worker_threads"
import Logger from "@UT/logger"
import DBRedis from "@DB/client/redis"
import { Worker, Job, Queue, JobProgress } from "bullmq"
import { ChatServerReq } from "@SV/ai"

const log = new Logger("AI Queue")
const namaQueue = "aiQueue"

class aiQueue {
	public queue: Queue | undefined
	private worker: Worker | undefined

	constructor() {
		if (isMainThread) {
			log.info(`This is main thread for ai queue`)
			this.runTask()
		} else {
			log.info(`This is another thread from ai queue that is used to perform ai`)
		}
	}

	private runTask() {
		log.info(`Starting ${namaQueue} worker...`)
		this.queue = new Queue(namaQueue, { connection: DBRedis.getClient() })
		this.worker = new Worker(
			namaQueue,
			async (job: Job) => {
				log.info(`Job ai ${job.id} has start: `, job.data)
				return {
					data: "TES"
				}
			},
			{
				connection: DBRedis.getClient(),
				concurrency: 4,
				removeOnComplete: {
					age: 600
				},
				removeOnFail: {
					age: 600
				}
			}
		)
		this.queue.on("waiting", (job: Job) => {
			log.warn(`Job ai ${job.id} has start`)
		})
		this.worker.on("completed", (job, data: any) => {
			log.info(`Job ai ${job.id} has completed: `, data)
		})
		this.worker.on("failed", (job, err) => {
			if (!job) {
				log.warn(`no data job ai?`, err)
				return
			}
			log.errorNoStack(`Job ai ${job.id} has failed with error: `, err)
		})
		this.worker.on("progress", (job: Job, progress: JobProgress) => {
			log.warn(`Job ai ${job.id} progress: `, progress)
		})
		this.worker.on("error", (err) => {
			log.errorNoStack(`job ai error: `, err)
		})
	}

	async addTask(task: ChatServerReq): Promise<number> {
		if (!this.queue) {
			log.errorNoStack(`${namaQueue} queue not found`)
			return 0
		}
		let respon = await this.queue.add(namaQueue, task, {
			//attempts: 2,
			//backoff: 1000,
			removeOnComplete: {
				age: 600
			},
			removeOnFail: {
				age: 600
			}
		})
		log.warn(`Add task to ai queue`, task)
		// id,timestamp
		return respon.id ? parseInt(respon.id) : 0
	}

	restartWorker() {
		if (this.worker) {
			log.warn("Restarting hard job ai worker...")
			this.worker.close().then(() => {
				this.runTask()
			})
		} else {
			log.warn("Restarting normal job ai worker...")
			this.runTask()
		}
	}

	public Run() {
		log.info(`Pong AI Queue`)
	}
}

const _ = new aiQueue()
export default _
