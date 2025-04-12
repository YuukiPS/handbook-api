export interface GitLabCommit {
	id: string
	short_id: string
	title: string
	author_name: string
	authored_date: string
	committed_date: string
	message: string
}

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

// in excel
export interface SceneData {
	id: number
	scriptData: string
	levelEntityConfig: string
}
export interface AvatarData {
	id: number
	nameTextMapHash: number
	iconName: string
	//qualityType: string;
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

// in datebase
export interface ItemData {
	id: number // id item
	type: number // 1=avatar,
	game: number // 1=genshin, 2=starrail
	name: Record<string, string> // name item
	icon: string // icon item
}
