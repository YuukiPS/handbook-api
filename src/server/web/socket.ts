import { Server as HttpServer } from "http"
import { Server, Socket } from "socket.io"
import Logger from "@UT/logger"
import { DefaultEventsMap } from "socket.io/dist/typed-events"
import { RateLimiterMemory } from "rate-limiter-flexible"
import { GetDomain } from "@UT/config"

const log = new Logger("io")

const possibleIPHeaders = [
	"cf-connecting-ip",
	"x-forwarded-for",
	"proxy-client-ip",
	"wl-proxy-client-ip",
	"http_x_forwarded_for",
	"http_x_forwarded",
	"http_x_cluster_client_ip",
	"http_client_ip",
	"http_forwarded_for",
	"http_forwarded",
	"http_via",
	"remote_addr"
]
function getUserIP(user: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>): string {
	let userIP = ""
	for (const header of possibleIPHeaders) {
		if (user.handshake.headers[header]) {
			userIP = user.handshake.headers[header] as string
			break
		}
	}
	return userIP
}

class IoServer {
	private io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> | undefined
	private connectedIPs = new Set()

	constructor() {
		log.info(`IoServer init`)
	}

	public Instance() {
		return this.io
	}

	public Start(w: HttpServer | undefined) {
		log.info(`Server io start....`)

		this.io = new Server(w, {
			cors: {
				origin: GetDomain().origin,
				methods: ["GET", "POST"],
				credentials: true
			},
			allowEIO3: true
		})

		// Note: don't use await from here
		this.io.on("connection", (user) => {
			const userIP = getUserIP(user)
			const userURL = user.handshake.query.url as unknown as string

			const userAgent = user.handshake.headers["user-agent"]
			if (!userAgent) {
				// Reject connection if no User-Agent is provided
				log.error(`Connection ${userIP} rejected: No User-Agent provided > ${userURL}`)
				user.disconnect()
				return
			}

			log.warn(`User connected: IP=${userIP}, URL=${userURL}, User-Agent=${userAgent}`)

			// add IP to connectedIPs set
			if (!this.connectedIPs.has(userIP)) {
				this.connectedIPs.add(userIP)
			}

			// disconnect
			user.on("disconnect", () => {
				if (this.connectedIPs.has(userIP)) {
					this.connectedIPs.delete(userIP)
					log.warn(`User disconnected: IP=${userIP}, URL=${userURL}`)
				} else {
					log.warn(`User disconnected but not found: IP=${userIP}, URL=${userURL}`)
				}
			})
		})

		// Error
		this.io.on("connection_error", (e) => {
			log.errorNoStack(e)
		})
	}
}

const _ = new IoServer()
export default _
