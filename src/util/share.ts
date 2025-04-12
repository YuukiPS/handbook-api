import { GetProfile } from "./config"

export const domainPublic = GetProfile("prod").url.public
export const domain = GetProfile().url.public