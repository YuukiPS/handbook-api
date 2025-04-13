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
export interface SceneExcel {
	id: number
	scriptData: string
	levelEntityConfig: string
	type: string
}
export interface AvatarExcel {
	id: number
	nameTextMapHash: number
	descTextMapHash: number
	iconName: string
	weaponType: string
	qualityType: string
	bodyType: string
}
export interface WeaponExcel {
	id: number
	nameTextMapHash: number
	icon: string
	weaponType: string
	rankLevel: number
}
export interface MonsterExcel {
	id: number
	nameTextMapHash: number
	monsterName: string
	type: string
	describeId: string
	LODPatternName: string
	iconName: string
}
export interface MonsterNameExcel {
	icon: string
	nameTextMapHash: number
	id: number
	specialNameLabID: number
	titleID: number
}
export interface MonsterNameSpecialExcel {
	specialNameLabID: number
	specialNameID: number
	specialNameTextMapHash: number
}
export interface ItemExcel {
	id: number
	nameTextMapHash: number
	descTextMapHash: number
	icon: string
	rankLevel: number
	itemType: string
	// for material
	materialType: string
	// for food
	foodQuality: string
	// for furniture (house)
	specialFurnitureType: string
	surfaceType: string
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
export interface ItemAvatar extends ItemData {
	// always from type 1 for avatar
	type: 1
	// detail
	weaponType?: string
	qualityType?: string
	bodyType?: string
}
export interface ItemNormal extends ItemData {
	// always from type 2 for normal item
	type: 2
	// detail
	rankLevel?: number
	itemType?: string
	materialType?: string
	foodQuality?: string
	specialFurnitureType?: string
	surfaceType?: string
}
export interface ItemMonster extends ItemData {
	// always from type 3 for monster
	type: 3
	// detail
	typeMonster?: string
}
export interface ItemWeapon extends ItemData {
	// always from type 4 for weapon
	type: 4
	// detail
	weaponType?: string
	rankLevel?: number
}
export interface ItemScene extends ItemData {
	// always from type 5 for scene
	type: 5
	// detail
	typeScene?: string
}