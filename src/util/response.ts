import { isEmpty } from "./library"

// Git
export interface GitLabCommit {
	id: string
	short_id: string
	created_at: string
	parent_ids: string[]
	title: string
	message: string
	author_name: string
	author_email: string
	authored_date: string
	committer_name: string
	committer_email: string
	committed_date: string
	trailers: Record<string, string>
	extended_trailers: Record<string, string>
	web_url: string
}

// SRTools
export interface SRToolsReq {
	avatars: Record<string, Avatar>
	relics: Relic[]
	lightcones: Lightcone[]
	battle_config: BattleConfig
}
interface Avatar {
	avatar_id: number
	data: AvatarData
	level: number
	promotion: number
	sp_max: number
	sp_value: number
	techniques: number[]
	owner_uid: number
}
interface AvatarData {
	rank: number
	skills: Record<number, number>
}
interface Relic {
	equip_avatar: number
	internal_uid: number
	level: number
	main_affix_id: number
	relic_id: number
	relic_set_id: number
	sub_affixes: SubAffix[]
}
interface SubAffix {
	count: number
	step: number
	sub_affix_id: number
}
interface Lightcone {
	equip_avatar: number
	internal_uid: number
	item_id: number
	level: number
	promotion: number
	rank: number
}
interface BattleConfig {
	battle_type: string
	blessings: any[]
	custom_stats: any[]
	cycle_count: number
	stage_id: number
	path_resonance_id: number
	monsters: Monster[][]
}
interface Monster {
	amount: number
	level: number
	monster_id: number
}

// Yuuki Manager Account
export interface PrivateServerInfo {
	name: string
	id: string
	api: {
		url: string
		type: number // 0=off (api version command) normal we do not use this
		password: string // password for public commands
		passwrod_private: string // password for private commands aka super admin
	}
	game: number
	engine: number
}
export interface CommonRsp {
	message: string
	retcode: number
}
export interface CommonDataRsp<T> {
	message: string
	retcode: number
	data?: T | null | undefined
}
export interface AccountDB extends Document {
	_id: string
	tokenAPI: string // code cmd,
}
export interface PlayerBasic {
	uid: number // player uid
	id_server?: string
	accountId: string // accoun uid
	nickname: string // name or nickname
	signature: string // Commenters or can be used for status
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

// Obj
interface HashObject {
	Hash: string
}
interface StageConfigData {
	HEIKKHLKMOA: string // field name
	MBMDOCJIMEJ: string // value
}
interface KeyStringNumber {
	[key: string]: number
}
interface KeyNumber {
	[key: number]: number
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
export class ClassAvatarExcelBA {
	// testing reduced memory usage
	static fields = [
		"Id",
		"Name",
		"PersonalName",
		"Icon",
		"ProfileIntroduction",
		"WeaponType",
		"SquadType",
		"BulletType",
		"StarGrade"
	] as const;

	[key: string]: AvatarExcelBA
	constructor(data: Record<string, AvatarExcelBA>) {
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
export class ClassItemExcelBA {
	[key: string]: ItemExcelBA
	constructor(data: Record<string, ItemExcelBA>) {
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
	appendPropNum: number
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
	MonsterList: KeyStringNumber
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
	AvatarVOTag: string
}
export interface AvatarExcelBA {
	Id: number
	Name: string
	PersonalName: string
	Icon: string
	ProfileIntroduction: string
	WeaponType: string
	SquadType: string
	BulletType: string
	StarGrade: number
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
export interface ItemExcelBA {
	Id: number
	Name: string
	Icon: string
	Desc: string
	Category: string
	Rarity: string
	Quality: number
}

// In Datebase
export interface BookRsp {
	message: string
	retcode: number
	data: any[] | null
}
export enum TypeItem {
	None = 0,
	Avatar = 1,
	Normal = 2,
	Monster = 3,
	Weapon = 4,
	Scene = 5,
	Gadget = 6,
	ArtifactMain = 7,
	ArtifactSub = 8,
	ArtifactConfig = 9,
	Quest = 10,
	Plane = 11,
	Stage = 12
}
export function getAllTypeItem(): string[] {
	return Object.keys(TypeItem)
		.map((key) => TypeItem[key as keyof typeof TypeItem])
		.filter((value) => typeof value === "string") as string[]
}
export function getTypeItem(value: string): number {
	if (isEmpty(value)) return 0

	// 1) Normalize input: trim, lowercase, then capitalize first letter
	const normalize = (str: string) =>
		str
			.trim()
			.toLocaleLowerCase()
			.replace(/^\w/, (c) => c.toLocaleUpperCase())

	let key = normalize(value)
	let item = TypeItem[key as keyof typeof TypeItem]

	// 2) If that didn’t match, try a basic singularization:
	if (item === undefined) {
		let singular = key
		if (key.endsWith("s")) {
			// e.g. “Avatars” → “Avatar”
			singular = normalize(key.slice(0, -1))
		}
		// re-lookup
		if (singular !== key) {
			key = singular
			item = TypeItem[singular as keyof typeof TypeItem]
		}
	}

	const result = item ?? 0
	//console.log(`getTypeItem ${key} (from “${value}”) → ${result}`)
	return result
}

export interface ItemData {
	id: number // id item
	type: number // 1=avatar,
	game: number // 1=genshin, 2=starrail
	name: Record<string, string> // name item
	desc: Record<string, string> // desc item
	desc2: Record<string, string> // desc item (TODO: use embedding in name,desc?)
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
	// basic stats
	stats?: {
		Property: string
		BaseValue: number
		LevelAdd: number
	}
}
export interface ItemArtifactSub extends ItemData {
	// always from type 8 for artifact sub
	//type: 8
	// detail
	grup?: number
	// basic stats
	stats?: {
		Property: string
		BaseValue: number
		StepValue: number
		StepNum: number
	}
}
export interface ItemArtifactConfig extends ItemData {
	// always from type 9 for artifact config
	//type: 9
	// detail
	main?: number
	sub?: number
	starType?: number
	equipType?: number
	appendPropNum?: number // Gear: 0-4 idk
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

// Gen Relic
export interface GenRelicResult {
	id: number
	count: number
	level: number
	main: string
	sub: string[]
	raw: BuildRelicData
}

// Build
export interface BuildData {
	/** Use this as the MongoDB _id */
	_id: number
	owner: number // account id (Yuuki account)
	title: string
	avatar?: BuildAvatarData
	equipment?: BuildEquipmentData // light cone
	relic?: BuildRelicData[]
	vote: number
	time: number
	update: number
}
export interface BuildAvatarData {
	id: number
	level: number
	rank: number // Eidolon
	promotion: number // This changes based on level
	skills?: KeyNumber // Trace
	buff?: number[] // or Techniques
}
export interface BuildEquipmentData {
	id: number
	level: number
	rank: number
	promotion: number // This changes based on level
}
export interface BuildRelicData {
	id: number
	main: number
	sub: BuildRelicSubData[]
	level: number
	count: number // count item add
	sort: boolean
}
export interface BuildRelicSubData {
	id: number
	count: number
	step: number // Custom Stats, (Perfect lock 2)
}
export interface BuildRsp {
	message: string
	retcode: number
	data: BuildData[] | null
}

// Article
export enum TypeArticle {
	None = 0,
	Question = 1,
	Command = 2,
	Guide = 3,
	Blog = 4
}
export function getAllTypeArticle(): string[] {
	return Object.keys(TypeArticle)
		.map((key) => TypeArticle[key as keyof typeof TypeArticle])
		.filter((value) => typeof value === "string") as string[]
}
// Note: CP/LC now its same, GIO/VIA now its same
export enum GameEngine {
	None = 0,
	GC = 1,
	GIO = 2,
	CP = 3, // outdate ts ps
	VIA = 4, // emulator gio
	LC = 5,
	BP = 6 // blue archive aka BaPs
}
export function getAllGameEngine(): string[] {
	return Object.keys(GameEngine)
		.map((key) => GameEngine[key as keyof typeof GameEngine])
		.filter((value) => typeof value === "string") as string[]
}
export function getTypeGameEngine(name: string): number {
	return (GameEngine as any)[name] ?? -1
}
export function getStringTypeGameEngine(value: number): string {
	return (GameEngine as any)[value] ?? "None"
}
export interface OwnerData {
	uid: number // uid account (Yuuki account)
	username: string // username account (Yuuki account)
	avatar?: string // todo: support avatar image
}
export interface ArticleData {
	id: number // id article (must be unique)
	owner: number | OwnerData // server side use number and client side use OwnerData
	time: number // article create use timestemp
	update: number // article update use timestemp
	vote: number // vote number (like reddit)
	view: number // view count for how many times this article has been viewed
	tag: string[] // like keywords, or tags
	type: TypeArticle
	language: string // language article use, like en, id, th, etc
	embedding?: number[] // https://platform.openai.com/docs/models/embeddings (not use in meta blog)
}
export interface AnswerData {
	id: number // id alternative answer (should be unique)
	answer: string // use markdown only
	embedding?: number[] // ai embedding for alternative answer (not use in meta blog)
	vote: number // vote for alternative answer
	owner: number | OwnerData // server side use number and client side use OwnerData
	time: number // alternative answer create use timestemp
	update: number // alternative answer update use timestemp
}
export interface QuestionData extends ArticleData {
	question: string
	//answer: old
	answerId: number // best answer id (if accepted)
	closed: boolean // if true this question is closed, no more answer can be added
	closedReason?: string // reason why this question is closed, if empty then no reason
	resolved: boolean // if true this question is resolved, no more answer can be added
	answer?: AnswerData[] // list answer for this question, if empty then no answer
}
export interface CommandData extends ArticleData {
	command: string
	description: string
	usage: string
	typeEngine: GameEngine // use use GameEngine enum?
}
export interface BlogData extends ArticleData {
	title: string
	slug?: string // slug for url, if not set use title or id
	content: string // markdown content or html content (in meta dont add it)
	shortContent?: string // short content for blog, if not set use first 100 char from content
	thumbnail?: string // thumbnail image for blog
	description?: string // description for blog, if not set use first 100 char from content
	comment: boolean // if true allow comment on blog
	index: boolean // if true index this blog in search engine
}
