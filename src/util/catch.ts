export function setupCatchHandlers() {
	// 1) catch any rejected promise you forgot to `.catch()`
	process.on("unhandledRejection", (reason, promise) => {
		console.error("[FATAL] unhandledRejection at", promise, "reason:", reason)
		// you can decide to exit or let your retry-loop handle restarts:
		// process.exit(1);
	})

	// 2) catch any synchronous throw that bubbles out
	process.on("uncaughtException", (error) => {
		console.error("[FATAL] uncaughtException:", error)
		// process.exit(1);
	})
	// 3) catch any synchronous throw that bubbles out
	process.on("SIGINT", () => {
		console.info("exit app")
		process.exit(0)
	})
}
// Call setupCatchHandlers immediately when this module is imported
setupCatchHandlers()
