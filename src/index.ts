import "module-alias/register"
import "@UT/catch"
import Logger from "@UT/logger"
import { getLocalIpAddress, sleep } from "@UT/library"
import { domainPublic, GetProfile } from "@UT/config"
// main
import Interface from "@CMD/server/Interface"

const log = new Logger("Main")

const profile = GetProfile()
log.info(`Hi ${profile.title} | Domain: ${domainPublic} | ${profile.name} | LOCAL IP: ${getLocalIpAddress()}`)

// Function to run a service with error handling and restart logic
// bug https://github.com/wclr/ts-node-dev/issues/209
async function runServiceWithRetry(importPath: string, runFuncName: string) {
	while (true) {
		try {
			log.info(`Running ${importPath}…`)
			const module = await import(importPath)
			const runFunc = module.default?.[runFuncName]
			if (typeof runFunc === "function") {
				await runFunc()
				//log.info(`${importPath} exited cleanly.`)
				break
			}
			throw new Error(`${runFuncName} is not a function in ${importPath}`)
		} catch (error: any) {
			log.error(`Error in ${importPath}: ${error.message}. Retrying in 5s…`)
			await sleep(5)
		}
	}
}

async function initializeServices() {
	await runServiceWithRetry("@SV/web/http", "Run")
	await runServiceWithRetry("@JO/update", "Run")
	await runServiceWithRetry("@JO/aiQueue", "Run")
	await runServiceWithRetry("@SV/discord", "Run")
}

initializeServices()
	.then(() => {
		log.info("All services started with delay and error handling.")
	})
	.catch((error) => {
		log.error("Error starting services:", error)
	})

Interface.start()
