export type FormationPosition = 'front' | 'mid' | 'back';

export type TargetStrategy = 'lowestHp' | 'highestAtk' | 'weakest' | 'random' | 'highestThreat';

export type ActionPriority = 'speedFirst' | 'strategic' | 'aggressive';

export interface AnimalFormationConfig {
  animalId: string;
  position: FormationPosition;
  targetStrategy: TargetStrategy;
}

export interface LineupConfig {
  animals: AnimalFormationConfig[];
  actionPriority: ActionPriority;
}

export type Rarity = 1 | 2 | 3 | 4 | 5;

export type StarLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type BreakthroughTier = 0 | 1 | 2 | 3 | 4;

export type MaterialRarity = 1 | 2 | 3 | 4 | 5;

export type MaterialType = 'star' | 'breakthrough';

export interface MaterialTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: MaterialRarity;
  type: MaterialType;
  element?: Element;
}

export interface Material {
  id: string;
  templateId: string;
  name: string;
  description: string;
  emoji: string;
  rarity: MaterialRarity;
  type: MaterialType;
  element?: Element;
}

export type PartSlot = 'head' | 'body' | 'limbs' | 'weapon' | 'core' | 'special';

export type SkillType = 'attack' | 'heal' | 'buff' | 'debuff' | 'special' | 'passive';

export type PassiveTrigger = 'onAttack' | 'onHit' | 'onKill' | 'onTurnStart' | 'onTurnEnd' | 'onHpBelow' | 'onAllyHit' | 'onCrit' | 'onStatusApply';

export type ComboCondition = 'sameElement' | 'sameType' | 'specificSkill' | 'consecutiveUse';

export interface SkillBranch {
  id: string;
  name: string;
  description: string;
  emoji: string;
  requiredLevel: number;
  damageModifier?: number;
  cooldownModifier?: number;
  effectOverride?: {
    stat?: 'atk' | 'def' | 'spd';
    value?: number;
    duration?: number;
    healPercent?: number;
    aoe?: boolean;
  };
  statusEffectOverride?: {
    type: StatusEffectType;
    chance: number;
    duration: number;
    damage?: number;
  };
  passive?: PassiveEffect;
}

export interface PassiveEffect {
  id: string;
  name: string;
  description: string;
  emoji: string;
  trigger: PassiveTrigger;
  triggerChance?: number;
  hpThreshold?: number;
  statBonus?: { stat: 'atk' | 'def' | 'spd'; value: number };
  damageBonus?: number;
  healPercent?: number;
  statusEffectApply?: {
    type: StatusEffectType;
    chance: number;
    duration: number;
    damage?: number;
  };
  extraTurnChance?: number;
  critBonus?: number;
}

export interface ComboTrigger {
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: ComboCondition;
  requiredSkillIds?: string[];
  bonusDamage: number;
  bonusDamagePerHit?: number;
  triggerStatusEffect?: {
    type: StatusEffectType;
    chance: number;
    duration: number;
    damage?: number;
  };
}

export type BattleSide = 'player' | 'enemy';

export type Element = 'fire' | 'ice' | 'thunder' | 'nature' | 'dark';

export type StatusEffectType = 'poison' | 'burn' | 'freeze' | 'paralysis' | 'bleed';

export type BattleLogType = 'damage' | 'crit' | 'heal' | 'skill' | 'buff' | 'debuff' | 'death' | 'turnStart' | 'battleEnd' | 'info' | 'attack' | 'victory' | 'elementAdvantage' | 'statusTick' | 'statusApply' | 'combo' | 'passive' | 'comboTrigger' | 'branchActivate';

export interface AnimalTemplate {
  id: string;
  name: string;
  species: string;
  description: string;
  emoji: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  rarity: Rarity;
  element: Element;
}

export interface PartTemplate {
  id: string;
  name: string;
  description?: string;
  slot: PartSlot;
  rarity: Rarity;
  stats: {
    hp?: number;
    atk?: number;
    def?: number;
    spd?: number;
  };
  emoji: string;
  price: number;
}

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  damage: number;
  cooldown: number;
  cost: number;
  emoji: string;
  rarity: Rarity;
  element?: Element;
  effect?: {
    stat?: 'atk' | 'def' | 'spd';
    value?: number;
    duration?: number;
    healPercent?: number;
    aoe?: boolean;
  };
  statusEffect?: {
    type: StatusEffectType;
    chance: number;
    duration: number;
    damage?: number;
  };
  target?: 'single' | 'all' | 'self' | 'random';
  chance?: number;
  branches?: SkillBranch[];
  passive?: PassiveEffect;
  comboTriggers?: ComboTrigger[];
}

export interface OpponentTemplate {
  id: string;
  name: string;
  avatar: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard';
  levelRange: [number, number];
  animalTemplates: string[];
  betMultiplier: number;
}

export interface EquippedPart {
  partId: string;
  slot: PartSlot;
}

export interface EquippedSkill {
  skillId: string;
  level: number;
  currentCooldown?: number;
  branchId?: string;
}

export interface Animal {
  id: string;
  templateId: string;
  name: string;
  rarity: Rarity;
  level: number;
  starLevel: StarLevel;
  breakthroughTier: BreakthroughTier;
  parts: EquippedPart[];
  skills: EquippedSkill[];
  exp: number;
  expToNext: number;
}

export interface Part {
  id: string;
  templateId: string;
  name: string;
  description?: string;
  slot: PartSlot;
  rarity: Rarity;
  stats: {
    hp?: number;
    atk?: number;
    def?: number;
    spd?: number;
  };
  emoji: string;
  price: number;
}

export interface Skill {
  id: string;
  templateId: string;
  name: string;
  description: string;
  type: SkillType;
  damage: number;
  cooldown: number;
  cost: number;
  emoji: string;
  rarity: Rarity;
  element?: Element;
  effect?: {
    stat?: 'atk' | 'def' | 'spd';
    value?: number;
    duration?: number;
    healPercent?: number;
    aoe?: boolean;
  };
  statusEffect?: {
    type: StatusEffectType;
    chance: number;
    duration: number;
    damage?: number;
  };
  target?: 'single' | 'all' | 'self' | 'random';
  chance?: number;
  branches?: SkillBranch[];
  passive?: PassiveEffect;
  comboTriggers?: ComboTrigger[];
}

export interface BattleSkill {
  skillId: string;
  name: string;
  type: SkillType;
  damage: number;
  cooldown: number;
  currentCooldown: number;
  emoji: string;
  element?: Element;
  effect?: {
    stat?: 'atk' | 'def' | 'spd';
    value?: number;
    duration?: number;
    healPercent?: number;
    aoe?: boolean;
  };
  statusEffect?: {
    type: StatusEffectType;
    chance: number;
    duration: number;
    damage?: number;
  };
  branchId?: string;
  passive?: PassiveEffect;
  comboTriggers?: ComboTrigger[];
}

export interface BattleBuff {
  stat: 'atk' | 'def' | 'spd' | 'crit';
  value: number;
  remainingTurns: number;
}

export interface StatusEffect {
  type: StatusEffectType;
  remainingTurns: number;
  damage: number;
  sourceId: string;
}

export interface BattleUnit {
  id: string;
  animalId: string;
  name: string;
  emoji: string;
  element: Element;
  maxHp: number;
  currentHp: number;
  atk: number;
  def: number;
  spd: number;
  skills: BattleSkill[];
  isAlive: boolean;
  side: BattleSide;
  position: number;
  formationPosition: FormationPosition;
  targetStrategy: TargetStrategy;
  buffs: BattleBuff[];
  statusEffects: StatusEffect[];
  comboCount: number;
  isSkipTurn: boolean;
  passives: PassiveEffect[];
  activatedCombos: string[];
  triggeredPassives: string[];
}

export interface StatusEffectPayload {
  type: StatusEffectType;
  remainingTurns: number;
  damage: number;
  sourceId: string;
  skipTurnChance: number;
  statModifier?: { stat: 'atk' | 'def' | 'spd'; value: number };
}

export interface BuffPayload {
  stat: 'atk' | 'def' | 'spd';
  value: number;
  remainingTurns: number;
}

export interface BattleLogEntry {
  id?: string;
  timestamp: number;
  type: BattleLogType;
  turn?: number;
  message: string;
  targetId?: string;
  value?: number;
  skillId?: string;
  sourceId?: string;
  sourceName?: string;
  targetName?: string;
  skillName?: string;
  isCrit?: boolean;
  element?: Element;
  isElementAdvantage?: boolean;
  isElementDisadvantage?: boolean;
  statusType?: StatusEffectType;
  comboCount?: number;
  statusEffectData?: StatusEffectPayload;
  statusRemainingTurns?: number;
  buffData?: BuffPayload;
  attackerElement?: Element;
  defenderElement?: Element;
  comboMultiplier?: number;
  skillCooldown?: number;
  isSkipTurn?: boolean;
  passiveId?: string;
  passiveName?: string;
  comboTriggerId?: string;
  comboTriggerName?: string;
  branchId?: string;
  branchName?: string;
}

export interface BattleRecord {
  id: string;
  timestamp: number;
  opponentName: string;
  opponentAvatar: string;
  isWin: boolean;
  betAmount: number;
  reward: number;
  playerLineup: string[];
  enemyLineup: string[];
  battleLog: BattleLogEntry[];
  playerUnits: BattleUnit[];
  enemyUnits: BattleUnit[];
  initialPlayerUnits: BattleUnit[];
  initialEnemyUnits: BattleUnit[];
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'spark' | 'explosion' | 'heal';
}

export interface DamageNumber {
  id: number;
  x: number;
  y: number;
  value: number;
  type: 'normal' | 'crit' | 'heal' | 'combo' | 'elementAdvantage' | 'statusTick';
  opacity: number;
}

export interface PlayerData {
  id: string;
  coins: number;
  gems: number;
  totalWins: number;
  totalLosses: number;
  highestWinStreak: number;
  currentWinStreak: number;
  totalBetAmount: number;
  totalRewardAmount: number;
}

export interface CodexEntry {
  templateId: string;
  highestStarLevel: StarLevel;
  highestBreakthroughTier: BreakthroughTier;
  isUnlocked: boolean;
}

export interface SaveData {
  version: number;
  timestamp: number;
  player: PlayerData;
  ownedAnimals: Animal[];
  ownedParts: Part[];
  ownedSkills: Skill[];
  ownedMaterials: Material[];
  codex: CodexEntry[];
  lineup: string[];
  lineupConfig: LineupConfig;
  battleHistory: BattleRecord[];
  pityState?: PityState;
  gachaRecords?: GachaRecord[];
  limitedPool?: LimitedPoolConfig;
}

export type GachaPoolType = 'animal' | 'part' | 'skill' | 'limited';

export interface GachaRecord {
  id: string;
  poolType: GachaPoolType;
  itemType: 'animal' | 'part' | 'skill';
  itemTemplateId: string;
  itemName: string;
  itemEmoji: string;
  rarity: Rarity;
  isNew: boolean;
  timestamp: number;
}

export interface PityState {
  animal: { pullsSinceR4: number; pullsSinceR5: number };
  part: { pullsSinceR4: number; pullsSinceR5: number };
  skill: { pullsSinceR4: number; pullsSinceR5: number };
  limited: { pullsSinceR4: number; pullsSinceR5: number; guaranteedFeatured: boolean };
}

export interface LimitedPoolConfig {
  featuredAnimalTemplateIds: string[];
  featuredPartTemplateIds: string[];
  featuredSkillTemplateIds: string[];
  endsAt: number;
}

export interface GachaRates {
  [key: string]: {
    [key in Rarity]: number;
  };
}

export interface GachaCost {
  animal: number;
  part: number;
  skill: number;
  limited: number;
}

export interface GachaMultiResult {
  item: Animal | Part | Skill;
  itemType: 'animal' | 'part' | 'skill';
  isNew: boolean;
  isPity: boolean;
  isFeatured: boolean;
}

export interface TargetSelectionStrategy {
  id: string;
  name: string;
  description: string;
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  isBlocked?: boolean;
  isElementAdvantage?: boolean;
  isElementDisadvantage?: boolean;
  elementAdvantageMultiplier?: number;
}
