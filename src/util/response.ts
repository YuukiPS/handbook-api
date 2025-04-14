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

// Class (for mapping)
export class ClassAvatarExcelGI {
	[key: string]: AvatarExcelGI
	constructor(data: Record<string, AvatarExcelGI>) {
		Object.assign(this, data)
	}
}
export class ClassAvatarExcelSR {
	[key: string]: AvatarExcelSR
	constructor(data: Record<string, AvatarExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassAvatarItemExcelSR {
	[key: string]: AvatarItemExcelSR
	constructor(data: Record<string, AvatarItemExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassItemExcel {
	[key: string]: ItemExcel
	constructor(data: Record<string, ItemExcel>) {
		Object.assign(this, data)
	}
}
export class ClassMonsterExcel {
	[key: string]: MonsterExcel
	constructor(data: Record<string, MonsterExcel>) {
		Object.assign(this, data)
	}
}
export class ClassMonsterNameExcel {
	[key: string]: MonsterNameExcel
	constructor(data: Record<string, MonsterNameExcel>) {
		Object.assign(this, data)
	}
}
export class ClassMonsterNameSpecialExcel {
	[key: string]: MonsterNameSpecialExcel
	constructor(data: Record<string, MonsterNameSpecialExcel>) {
		Object.assign(this, data)
	}
}
export class ClassWeaponExcel {
	[key: string]: WeaponExcel
	constructor(data: Record<string, WeaponExcel>) {
		Object.assign(this, data)
	}
}
export class ClassSceneExcel {
	[key: string]: SceneExcel
	constructor(data: Record<string, SceneExcel>) {
		Object.assign(this, data)
	}
}
export class ClassGadgetExcel {
	[key: string]: GadgetExcel
	constructor(data: Record<string, GadgetExcel>) {
		Object.assign(this, data)
	}
}
export class ClassReliquaryExcel {
	[key: string]: ReliquaryExcel
	constructor(data: Record<string, ReliquaryExcel>) {
		Object.assign(this, data)
	}
}
export class ClassReliquaryMainPropExcel {
	[key: string]: ReliquaryMainPropExcel
	constructor(data: Record<string, ReliquaryMainPropExcel>) {
		Object.assign(this, data)
	}
}
export class ClassReliquaryAffixExcel {
	[key: string]: ReliquaryAffixExcel
	constructor(data: Record<string, ReliquaryAffixExcel>) {
		Object.assign(this, data)
	}
}
export class ClassManualTextMapExcel {
	[key: string]: ManualTextMapExcel
	constructor(data: Record<string, ManualTextMapExcel>) {
		Object.assign(this, data)
	}
}
export class ClassReliquaryLevelExcel {
	[key: string]: ReliquaryLevelExcel
	constructor(data: Record<string, ReliquaryLevelExcel>) {
		Object.assign(this, data)
	}
}
export class ClassQuestExcel {
	[key: string]: QuestExcel
	constructor(data: Record<string, QuestExcel>) {
		Object.assign(this, data)
	}
}

// In Excel (Game Resource)
export interface ReliquaryExcel {
	id: number
	nameTextMapHash: number
	descTextMapHash: number
	icon: string
	equipType: string
	destroyRule: string
	mainPropDepotId: number
	appendPropDepotId: number
	rankLevel: number
}
export interface ReliquaryMainPropExcel {
	id: number
	propType: string
	propDepotId: number
}
export interface ReliquaryAffixExcel {
	id: number
	propType: string
	depotId: number
	propValue: number
}
export interface ReliquaryLevelExcel {
	level: number
	rank: number
	addProps: {
		propType: string
		value: number
	}[]
}
export interface ManualTextMapExcel {
	textMapId: string
	textMapContentTextMapHash: string
}
export interface GadgetExcel {
	id: number
	nameTextMapHash: number
	interactNameTextMapHash: number
	type: string
	jsonName: string
}
export interface QuestExcel {
	mainId: number
	subId: number
	descTextMapHash: number
	stepDescTextMapHash: number
	guideTipsTextMapHash: number
	showType: string
	order: number
	// dim wrong
	failCondComb: string // > showType
	failParent: string // > descTextMapHash
}
export interface SceneExcel {
	id: number
	scriptData: string
	levelEntityConfig: string
	type: string
}
export interface AvatarExcelGI {
	id: number
	nameTextMapHash: number
	descTextMapHash: number
	iconName: string
	weaponType: string
	qualityType: string
	bodyType: string
}
interface HashObject {
	Hash: string
}
export interface AvatarExcelSR {
	AvatarID: number
	AvatarName: HashObject
	//AvatarFullName: HashObject
	//AvatarCutinIntroText: HashObject
	DefaultAvatarHeadIconPath: string // normal icon
	AvatarSideIconPath: string // side ? (most use enka)
	SideAvatarHeadIconPath: string // team (mini icon) ?
	UIAvatarModelPath: string // model boy or girl
	AvatarBaseType: string
	Rarity: string
	DamageType: string
}
export interface AvatarItemExcelSR {
	ID: number
	ItemName: HashObject
	ItemBGDesc: HashObject
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
export interface ItemGadget extends ItemData {
	// always from type 6 for gadget
	type: 6
	// detail
	typeGadget?: string
}
export interface ItemArtifactMain extends ItemData {
	// always from type 7 for artifact main
	type: 7
	// detail
	grup?: number
}
export interface ItemArtifactSub extends ItemData {
	// always from type 8 for artifact sub
	type: 8
	// detail
	grup?: number
}
export interface ItemArtifactConfig extends ItemData {
	// always from type 9 for artifact config
	type: 9
	// detail
	equipType?: string
	mainPropDepotId?: number
	appendPropDepotId?: number
	rankLevel?: number
}
export interface ItemQuest extends ItemData {
	// always from type 10 for quest
	type: 10
	// detail
	//mainId?: number
	subId?: number
	stepDesc?: Record<string, string>
	guideTips?: Record<string, string>
	showType?: string
	order?: number
}
