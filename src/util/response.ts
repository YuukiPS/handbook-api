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

// Obj
interface HashObject {
	Hash: string
}
interface StageConfigData {
	HEIKKHLKMOA: string // field name
	MBMDOCJIMEJ: string // value
}
interface MonsterData {
	[key: string]: number
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
export class ClassAvatarPropertyExcelSR {
	[key: string]: AvatarPropertyExcelSR
	constructor(data: Record<string, AvatarPropertyExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassAvatarSkillExcelGI {
	[key: string]: AvatarSkillExcelConfigDataGI
	constructor(data: Record<string, AvatarSkillExcelConfigDataGI>) {
		Object.assign(this, data)
	}
}
export class ClassAvatarSkillDepotExcelGI {
	[key: string]: AvatarSkillDepotExcelConfigDataGI
	constructor(data: Record<string, AvatarSkillDepotExcelConfigDataGI>) {
		Object.assign(this, data)
	}
}
export class ClassEquipmentExcelSR {
	[key: string]: EquipmentExcelSR
	constructor(data: Record<string, EquipmentExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassItemExcelGI {
	[key: string]: ItemExcelGI
	constructor(data: Record<string, ItemExcelGI>) {
		Object.assign(this, data)
	}
}
export class ClassItemExcelSR {
	[key: string]: ItemExcelSR
	constructor(data: Record<string, ItemExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassMonsterExcelGI {
	[key: string]: MonsterExcelGI
	constructor(data: Record<string, MonsterExcelGI>) {
		Object.assign(this, data)
	}
}
export class ClassMonsterNameExcelGI {
	[key: string]: MonsterNameExcelGI
	constructor(data: Record<string, MonsterNameExcelGI>) {
		Object.assign(this, data)
	}
}
export class ClassMonsterNameSpecialExcelGI {
	[key: string]: MonsterNameSpecialExcelGI
	constructor(data: Record<string, MonsterNameSpecialExcelGI>) {
		Object.assign(this, data)
	}
}
export class ClassMonsterExcelSR {
	[key: string]: MonsterExcelSR
	constructor(data: Record<string, MonsterExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassMonsterTemplateExcelSR {
	[key: string]: MonsterTemplateExcelSR
	constructor(data: Record<string, MonsterTemplateExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassWeaponExcel {
	[key: string]: WeaponExcel
	constructor(data: Record<string, WeaponExcel>) {
		Object.assign(this, data)
	}
}
export class ClassSceneExcelGI {
	[key: string]: SceneExcelGI
	constructor(data: Record<string, SceneExcelGI>) {
		Object.assign(this, data)
	}
}
export class ClassMazePlaneExcelSR {
	[key: string]: MazePlaneExcelSR
	constructor(data: Record<string, MazePlaneExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassStageConfigExcelSR {
	[key: string]: StageConfigExcelSR
	constructor(data: Record<string, StageConfigExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassGadgetExcel {
	[key: string]: GadgetExcel
	constructor(data: Record<string, GadgetExcel>) {
		Object.assign(this, data)
	}
}
export class ClassMazePropExcelSR {
	[key: string]: MazePropExcelSR
	constructor(data: Record<string, MazePropExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassRelicMainAffixExcelSR {
	[key: string]: RelicMainAffixExcelSR
	constructor(data: Record<string, RelicMainAffixExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassRelicSubAffixExcelSR {
	[key: string]: RelicSubAffixExcelSR
	constructor(data: Record<string, RelicSubAffixExcelSR>) {
		Object.assign(this, data)
	}
}
export class ClassReliquaryExcelGI {
	[key: string]: ReliquaryExcelGI
	constructor(data: Record<string, ReliquaryExcelGI>) {
		Object.assign(this, data)
	}
}
export class ClassRelicExcelSR {
	[key: string]: RelicExcelSR
	constructor(data: Record<string, RelicExcelSR>) {
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
export interface ReliquaryExcelGI {
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
export interface RelicMainAffixExcelSR {
	GroupID: number
	AffixID: number
	Property: string
	BaseValue: {
		Value: number
	}
	LevelAdd: {
		Value: number
	}
}
export interface RelicSubAffixExcelSR {
	GroupID: number
	AffixID: number
	Property: string
	BaseValue: {
		Value: number
	}
	StepValue: {
		Value: number
	}
	StepNum: number
}
export interface RelicExcelSR {
	ID: number
	SetID: number
	Type: string
	Rarity: string
	Mode: string
	MainAffixGroup: number
	SubAffixGroup: number
	MaxLevel: number
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
export interface MazePropExcelSR {
	ID: number
	PropName: HashObject
	PropIconPath: string
	PropType: string
	PropStateList: string[]
	JsonPath: string
	ConfigEntityPath: string
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
export interface SceneExcelGI {
	id: number
	scriptData: string
	levelEntityConfig: string
	type: string
}
export interface MazePlaneExcelSR {
	PlaneID: number
	WorldID: number
	PlaneName: HashObject
	PlaneType: string
	StartFloorID: number
	FloorIDList: number[]
}
export interface StageConfigExcelSR {
	StageID: number
	StageName: HashObject
	StageType: string
	Level: number
	//EliteGroup: number
	// maybe useful for auto LC
	StageAbilityConfig: string[]
	StageConfigData: StageConfigData
	MonsterList: MonsterData
}
export interface AvatarExcelGI {
	id: number
	nameTextMapHash: number
	descTextMapHash: number
	skillDepotId: number // > AvatarSkillDepotExcelConfigData (301) > AvatarSkillExcelConfigData (10034)
	iconName: string
	weaponType: string
	qualityType: string
	bodyType: string
}
export interface AvatarSkillDepotExcelConfigDataGI {
	id: number
	energySkill: number
}
export interface AvatarSkillExcelConfigDataGI {
	id: number
	costElemType: string
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
export interface AvatarPropertyExcelSR {
	PropertyType: string
	PropertyName: HashObject
	PropertyNameRelic: HashObject
	PropertyNameFilter: HashObject
	IconPath: string
}
export interface EquipmentExcelSR {
	EquipmentID: number
	EquipmentName: HashObject
	ImagePath: string // ?
	ThumbnailPath: string // thumb ?
	AvatarBaseType: string
	Rarity: string
	MaxRank: number
}
export interface WeaponExcel {
	id: number
	nameTextMapHash: number
	descTextMapHash: number
	icon: string
	weaponType: string
	rankLevel: number
}
export interface MonsterExcelGI {
	id: number
	nameTextMapHash: number
	monsterName: string
	type: string
	describeId: string
	LODPatternName: string
	iconName: string
}
export interface MonsterNameExcelGI {
	icon: string
	nameTextMapHash: number
	id: number
	specialNameLabID: number
	titleID: number
}
export interface MonsterNameSpecialExcelGI {
	specialNameLabID: number
	specialNameID: number
	specialNameTextMapHash: number
}
export interface MonsterExcelSR {
	MonsterID: number
	MonsterTemplateID: number
	MonsterName: HashObject
	MonsterIntroduction: HashObject
	StanceWeakList: string[] // monster weakness to elements ?
	// idk if useful for fiter
	HardLevelGroup: number
	EliteGroup: number
}
export interface MonsterTemplateExcelSR {
	MonsterTemplateID: number
	TemplateGroupID: number
	Rank: string
	RoundIconPath: string // small icon
	IconPath: string // big icon ?
}
export interface ItemExcelGI {
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
export interface ItemExcelSR {
	ID: number
	ItemMainType: string
	ItemSubType: string
	Rarity: string
	ItemIconPath: string
	ItemName: HashObject
	ItemBGDesc: HashObject
	ItemDesc: HashObject // show in ItemConfigEquipment
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
	desc2: Record<string, string> // desc item
	icon: string // icon item
}
export interface ItemAvatar extends ItemData {
	// always from type 1 for avatar
	//type: 1
	// detail
	weaponType?: number
	elementType?: number
	starType?: number
	bodyType?: number
}
export interface ItemNormal extends ItemData {
	// always from type 2 for normal item
	//type: 2
	// detail
	starType?: number
	itemType?: number // TODO: use enum with number
	materialType?: number // TODO: use enum with number
	foodQuality?: number // TODO: use enum with number
	specialFurnitureType?: number // TODO: use enum with number
	surfaceType?: number // TODO: use enum with number
}
export interface ItemMonster extends ItemData {
	// always from type 3 for monster
	//type: 3
	// detail
	typeMonster?: number
}
export interface ItemWeapon extends ItemData {
	// always from type 4 for weapon
	//type: 4
	// detail
	weaponType?: number
	starType?: number
}
export interface ItemScene extends ItemData {
	// always from type 5 for scene
	//type: 5
	// detail
	typeScene?: number
}
export interface ItemGadget extends ItemData {
	// always from type 6 for gadget
	//type: 6
	// detail
	typeGadget?: number
}
export interface ItemArtifactMain extends ItemData {
	// always from type 7 for artifact main
	//type: 7
	// detail
	grup?: number
}
export interface ItemArtifactSub extends ItemData {
	// always from type 8 for artifact sub
	//type: 8
	// detail
	grup?: number
}
export interface ItemArtifactConfig extends ItemData {
	// always from type 9 for artifact config
	//type: 9
	// detail
	main?: number
	sub?: number
	starType?: number
	equipType?: number
}
export interface ItemQuest extends ItemData {
	// always from type 10 for quest
	//type: 10
	// detail
	//mainId?: number
	subId?: number
	stepDesc?: Record<string, string>
	guideTips?: Record<string, string>
	showType?: number
	order?: number
}
export interface ItemPlane extends ItemData {
	// always from type 11 for plane
	//type: 11
	// detail
	worldId?: number
	planeType?: number // TODO: use enum with number
	startFloorId?: number
	floorIdList?: number[]
}
export interface ItemStage extends ItemData {
	// always from type 12 for stage
	//type: 12
	// detail
	stageType?: number // TODO: use enum with number
	stageLevel?: number
}

// API SR only
export interface GenRelicResult {
	id: number
	count: number
	level: number
	main: string
	sub: string[]
}
export interface BuildRelicData {
	owner: number
	title: string
	avatar: number
	lightcone: number
	vote: number
	time: number
	cmd?: string[]
	preview?: GenRelicResult[]
}
export interface BuildRelicRsp {
	message: string
	retcode: number
	data: BuildRelicData[] | null
}