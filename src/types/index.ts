export type Rarity = 1 | 2 | 3 | 4 | 5;

export type PartSlot = 'head' | 'body' | 'limbs' | 'weapon' | 'core' | 'special';

export type SkillType = 'attack' | 'heal' | 'buff' | 'debuff' | 'special';

export type BattleSide = 'player' | 'enemy';

export type Element = 'fire' | 'ice' | 'thunder' | 'nature' | 'dark';

export type StatusEffectType = 'poison' | 'burn' | 'freeze' | 'paralysis' | 'bleed';

export type BattleLogType = 'damage' | 'crit' | 'heal' | 'skill' | 'buff' | 'debuff' | 'death' | 'turnStart' | 'battleEnd' | 'info' | 'attack' | 'victory' | 'elementAdvantage' | 'statusTick' | 'statusApply' | 'combo';

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
}

export interface Animal {
  id: string;
  templateId: string;
  name: string;
  rarity: Rarity;
  level: number;
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
}

export interface BattleBuff {
  stat: 'atk' | 'def' | 'spd';
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
  buffs: BattleBuff[];
  statusEffects: StatusEffect[];
  comboCount: number;
  isSkipTurn: boolean;
}

export interface BattleLogEntry {
  id?: string;
  timestamp: number;
  type: BattleLogType;
  turn?: number;
  message: string;
  actorId?: string;
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

export interface SaveData {
  version: number;
  timestamp: number;
  player: PlayerData;
  ownedAnimals: Animal[];
  ownedParts: Part[];
  ownedSkills: Skill[];
  lineup: string[];
  battleHistory: BattleRecord[];
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
