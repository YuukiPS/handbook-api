// Git
export interface GitLabCommit {
	id: string
	short_id: string
	title: string
	author_name: string
	authored_date: string
	committed_date: string
	message: string
}

// Prop
export interface Prop {
	_id: string
	value: string
	time: number
	reason: string
}
export interface PropRsp {
	message: string
	retcode: number
	data: Prop | null
}

// In Excel (Game Resource)
export interface SceneData {
	id: number
	scriptData: string
	levelEntityConfig: string
}
export interface AvatarData {
	id: number
	nameTextMapHash: number
	descTextMapHash: number
	iconName: string
	weaponType: string
	qualityType: string
	bodyType: string
}
export interface WeaponData {
	id: number
	nameTextMapHash: number
	icon: string
	weaponType: string
	rankLevel: string
}
export interface MonsterData {
	id: number
	nameTextMapHash: number
	monsterName: string
	type: string
	describeId: string
	LODPatternName: string
	iconName: string
}
export interface MonsterNameData {
	icon: string
	nameTextMapHash: number
	id: number
	specialNameLabID: number
	titleID: number
}
export interface NormalItemData {
	id: number
	nameTextMapHash: number
	icon: string
	//itemType: string;
	//rankLevel: string;
}

// In Datebase
export interface BookRsp {
	message: string
	retcode: number
	data: any[] | null
}
export interface ItemData {
	id: number // id item
	type: number // 1=avatar,
	game: number // 1=genshin, 2=starrail
	name: Record<string, string> // name item
	desc: Record<string, string> // desc item
	icon: string // icon item
}
//default data based on language fallback (json only)
export interface ItemDefault extends ItemData {
	nameDefault?: string
	descDefault?: string
}
export interface ItemAvatarGI extends ItemData {
	// away from type 1 for avatar
	type: 1
	// detail
	weaponType?: string
	qualityType?: string
	bodyType?: string
}
