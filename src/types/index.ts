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

export type MaterialType = 'star' | 'breakthrough' | 'synthesis' | 'modification' | 'experiment' | 'rare';

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

export type PartQuality = 1 | 2 | 3 | 4 | 5;

export type SetBonusStat = 'hp' | 'atk' | 'def' | 'spd' | 'crit';

export interface SetBonus {
  pieces: number;
  stats: { hp?: number; atk?: number; def?: number; spd?: number; crit?: number };
  description: string;
}

export interface PartSetConfig {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bonuses: SetBonus[];
}

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
  teamBuff?: { stat: 'atk' | 'def' | 'spd'; value: number; duration: number };
}

export type BattleSide = 'player' | 'enemy';

export type Element = 'fire' | 'ice' | 'thunder' | 'nature' | 'dark';

export type StatusEffectType = 'poison' | 'burn' | 'freeze' | 'paralysis' | 'bleed';

export type BattleLogType = 'damage' | 'crit' | 'heal' | 'skill' | 'buff' | 'debuff' | 'death' | 'turnStart' | 'battleEnd' | 'info' | 'attack' | 'victory' | 'elementAdvantage' | 'statusTick' | 'statusApply' | 'combo' | 'passive' | 'comboTrigger' | 'branchActivate' | 'setBonus' | 'bond';

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
  setId?: string;
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

export type DynamicDifficultyTier = 'trivial' | 'easy' | 'normal' | 'hard' | 'extreme' | 'nightmare';

export interface DynamicOpponentContext {
  playerStrengthScore: number;
  playerAvgLevel: number;
  currentWinStreak: number;
  recentLineupSignatures: string[];
  difficultyMultiplier: number;
  rewardMultiplier: number;
  difficultyTier: DynamicDifficultyTier;
}

export interface DynamicEnemyTeamResult {
  opponent: OpponentTemplate;
  animals: Animal[];
  effectiveDifficulty: DynamicDifficultyTier;
  difficultyMultiplier: number;
  rewardMultiplier: number;
}

export interface EquippedPart {
  partId: string;
  instanceId: string;
  slot: PartSlot;
  quality?: PartQuality;
  setId?: string;
}

export interface EquippedSkill {
  skillId: string;
  level: number;
  currentCooldown?: number;
  branchId?: string;
  modifications?: {
    damageBonus?: number;
    cooldownReduction?: number;
    statusEffectChanceBonus?: number;
    addStatusEffect?: {
      type: StatusEffectType;
      chance: number;
      duration: number;
      damage?: number;
    };
  };
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
  quality: PartQuality;
  setId?: string;
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
  stat: 'atk' | 'def' | 'spd' | 'crit' | 'healEff';
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
  activeSetBonuses: { setId: string; bonus: SetBonus }[];
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
  matchmaking?: MatchmakingResult;
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
  totalCoinsEarned: number;
  totalGemsEarned: number;
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
  seasonData?: SeasonSaveData;
  guildData?: GuildExpeditionSaveData;
  storyData?: StorySaveData;
  labData?: LabSaveData;
  codexData?: CodexSaveData;
}

export interface SeasonSaveData {
  currentRank: RankInfo;
  currentSeasonId: string;
  seasonHistory: SeasonRecord[];
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

export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster';

export type RankSubTier = 1 | 2 | 3;

export interface RankInfo {
  tier: RankTier;
  subTier: RankSubTier;
  points: number;
  seasonWins: number;
  seasonLosses: number;
  highestTier: RankTier;
  highestSubTier: RankSubTier;
}

export interface RankTierConfig {
  tier: RankTier;
  name: string;
  emoji: string;
  color: string;
  pointThreshold: number;
  subTiers: 3 | 1;
  rewards: SeasonReward[];
}

export type AuctionItemType = 'part' | 'skill';
export type AuctionStatus = 'active' | 'ended' | 'won' | 'lost';

export interface BidRecord {
  id: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: number;
}

export interface AuctionItem {
  id: string;
  itemType: AuctionItemType;
  itemData: Part | Skill;
  sellerId: string;
  sellerName: string;
  startingPrice: number;
  currentPrice: number;
  minBidIncrement: number;
  bids: BidRecord[];
  highestBidderId: string | null;
  highestBidderName: string | null;
  createdAt: number;
  endsAt: number;
  status: AuctionStatus;
  priceFluctuationHistory: { time: number; price: number }[];
  isPlayer: boolean;
}

export type TransactionType = 'bid' | 'buyout' | 'sell' | 'refund' | 'fee' | 'reward';

export interface TransactionRecord {
  id: string;
  timestamp: number;
  type: TransactionType;
  amount: number;
  description: string;
  auctionId?: string;
  itemName?: string;
  balanceAfter: number;
}

export interface AuctionFilter {
  type: AuctionItemType | 'all';
  rarity: Rarity | 0;
  sortBy: 'time' | 'price_asc' | 'price_desc' | 'bids';
  search?: string;
}

export interface SeasonReward {
  type: 'coins' | 'gems' | 'material';
  amount: number;
  materialTemplateId?: string;
  description: string;
}

export interface SeasonInfo {
  id: string;
  name: string;
  subtitle: string;
  startTime: number;
  endTime: number;
  status: 'active' | 'ended';
}

export interface SeasonRecord {
  seasonId: string;
  seasonName: string;
  finalTier: RankTier;
  finalSubTier: RankSubTier;
  highestTier: RankTier;
  highestSubTier: RankSubTier;
  totalWins: number;
  totalLosses: number;
  finalPoints: number;
  rewards: SeasonReward[];
  timestamp: number;
  battleSummaries: SeasonBattleSummary[];
  stats: SeasonStats;
  rewardsClaimed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  avatar: string;
  tier: RankTier;
  subTier: RankSubTier;
  points: number;
  wins: number;
  losses: number;
  isPlayer: boolean;
  winRate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface RankChangeResult {
  pointsChange: number;
  newTier: RankTier;
  newSubTier: RankSubTier;
  newPoints: number;
  isPromotion: boolean;
  isDemotion: boolean;
  protectionUsed?: boolean;
  prevProtectionCount?: number;
}

export interface RankProtectionState {
  remainingCount: number;
  maxCount: number;
  isActive: boolean;
}

export interface MatchmakingResult {
  opponentTier: RankTier;
  opponentSubTier: RankSubTier;
  opponentPoints: number;
  matchQuality: 'fair' | 'advantage' | 'challenge';
  pointBonus: number;
}

export interface SeasonBattleSummary {
  isWin: boolean;
  rankChange: RankChangeResult;
  matchmaking: MatchmakingResult;
  timestamp: number;
  opponentName: string;
  opponentAvatar: string;
  difficultyTier: DynamicDifficultyTier;
}

export interface SeasonSettlementResult {
  seasonId: string;
  seasonName: string;
  finalRank: RankInfo;
  rewards: SeasonReward[];
  archivedAt: number;
  nextSeasonId: string;
  placementRank: RankInfo;
}

export interface SeasonStats {
  totalBattles: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  avgPointsPerWin: number;
  avgPointsPerLoss: number;
  longestWinStreak: number;
  promotionsCount: number;
  demotionsCount: number;
  timePlayed: number;
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  isBlocked?: boolean;
  isElementAdvantage?: boolean;
  isElementDisadvantage?: boolean;
  elementAdvantageMultiplier?: number;
}

export type BossPhase = 1 | 2 | 3;

export interface BossPhaseConfig {
  phase: BossPhase;
  hpPercent: number;
  atkMultiplier: number;
  defMultiplier: number;
  specialSkill: string;
  specialSkillName: string;
  specialSkillEmoji: string;
  specialSkillChance: number;
  enrageTurns?: number;
  enrageAtkBonus?: number;
}

export interface GuildBossTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  element: Element;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  rarity: Rarity;
  phases: BossPhaseConfig[];
  rewards: BossReward[];
  weeklyScore: number;
}

export interface BossReward {
  type: 'coins' | 'gems' | 'guildToken' | 'material';
  amount: number;
  materialTemplateId?: string;
  phase: BossPhase;
}

export interface GuildBossInstance {
  templateId: string;
  currentHp: number;
  maxHp: number;
  currentPhase: BossPhase;
  totalDamageDealt: number;
  isDefeated: boolean;
  defeatedPhases: BossPhase[];
  attemptsUsed: number;
}

export interface GuildMember {
  id: string;
  name: string;
  avatar: string;
  level: number;
  contribution: number;
  weeklyContribution: number;
  teamAnimalIds: string[];
  isOnline: boolean;
}

export interface ExpeditionTeam {
  memberId: string;
  animalIds: string[];
  formationPosition: FormationPosition[];
}

export interface GuildShopItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  itemType: 'animal' | 'part' | 'skill' | 'material';
  rarity: Rarity;
  templateId: string;
  weeklyStock: number;
  currentStock: number;
}

export interface GuildContributionRecord {
  weekId: string;
  memberId: string;
  contribution: number;
  bossDamage: number;
  bossKills: number;
  rewards: GuildSettlementReward[];
  timestamp: number;
}

export interface GuildSettlementReward {
  type: 'coins' | 'gems' | 'guildToken' | 'material';
  amount: number;
  materialTemplateId?: string;
}

export interface GuildExpeditionState {
  guildName: string;
  guildLevel: number;
  guildExp: number;
  guildExpToNext: number;
  guildTokens: number;
  members: GuildMember[];
  activeBoss: GuildBossInstance | null;
  expeditionTeams: ExpeditionTeam[];
  shopPurchases: Record<string, number>;
  weeklyContribution: number;
  totalContribution: number;
  weeklyBossDamage: number;
  weeklyBossKills: number;
  currentWeekId: string;
  contributionHistory: GuildContributionRecord[];
  lastSettlementTime: number;
  isInitialized: boolean;
}

export interface GuildExpeditionSaveData {
  guildName: string;
  guildLevel: number;
  guildExp: number;
  guildTokens: number;
  members: GuildMember[];
  activeBoss: GuildBossInstance | null;
  expeditionTeams: ExpeditionTeam[];
  shopPurchases: Record<string, number>;
  weeklyContribution: number;
  totalContribution: number;
  weeklyBossDamage: number;
  weeklyBossKills: number;
  currentWeekId: string;
  contributionHistory: GuildContributionRecord[];
  lastSettlementTime: number;
}

export interface StageDrop {
  type: 'coins' | 'gems' | 'material' | 'animal' | 'part' | 'skill';
  templateId?: string;
  amount: number;
  dropRate: number;
}

export interface StageFirstClearReward {
  type: 'coins' | 'gems' | 'material' | 'animal' | 'part' | 'skill';
  templateId?: string;
  amount: number;
}

export interface StageEnemy {
  animalTemplateId: string;
  level: number;
  starLevel: StarLevel;
  breakthroughTier: BreakthroughTier;
  skills: string[];
  parts?: string[];
}

export interface StageTemplate {
  id: string;
  chapterId: string;
  stageNumber: number;
  name: string;
  description: string;
  emoji: string;
  difficulty: 'easy' | 'normal' | 'hard' | 'boss';
  requiredStageId?: string;
  enemies: StageEnemy[];
  formationPosition: FormationPosition[];
  drops: StageDrop[];
  firstClearRewards: StageFirstClearReward[];
  staminaCost: number;
  backgroundTheme?: string;
  narrative?: string;
}

export interface ChapterTemplate {
  id: string;
  chapterNumber: number;
  name: string;
  subtitle: string;
  description: string;
  emoji: string;
  backgroundImage?: string;
  requiredCompletedStages?: number;
  stages: StageTemplate[];
}

export interface StageProgress {
  stageId: string;
  completed: boolean;
  firstCleared: boolean;
  clearedAt?: number;
  bestTime?: number;
  attempts: number;
  totalClears: number;
}

export interface ChapterProgress {
  chapterId: string;
  unlocked: boolean;
  unlockedAt?: number;
  stages: Record<string, StageProgress>;
  totalStars: number;
}

export interface StorySaveData {
  currentChapterId: string;
  chapters: Record<string, ChapterProgress>;
  totalStamina: number;
  maxStamina: number;
  lastStaminaRegenTime: number;
  storyNarrativeProgress: Record<string, number>;
}

export interface StageBattleResult {
  isWin: boolean;
  rewards: {
    type: string;
    templateId?: string;
    amount: number;
    isFirstClear: boolean;
  }[];
  battleRecordId?: string;
}

export type LabMaterialType = 'synthesis' | 'modification' | 'experiment' | 'rare';

export interface LabMaterialTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: MaterialRarity;
  type: LabMaterialType;
}

export interface LabMaterial {
  id: string;
  templateId: string;
  name: string;
  description: string;
  emoji: string;
  rarity: MaterialRarity;
  type: LabMaterialType;
}

export interface PartSynthesisRecipe {
  id: string;
  name: string;
  description: string;
  targetPartTemplateId: string;
  targetRarity: Rarity;
  materials: { templateId: string; count: number }[];
  coinCost: number;
  successRate: number;
  failureReturnRate: number;
}

export interface SkillModificationRecipe {
  id: string;
  name: string;
  description: string;
  targetSkillTemplateId: string;
  materials: { templateId: string; count: number }[];
  coinCost: number;
  successRate: number;
  effects: {
    damageBonus?: number;
    cooldownReduction?: number;
    statusEffectChanceBonus?: number;
    addStatusEffect?: {
      type: StatusEffectType;
      chance: number;
      duration: number;
      damage?: number;
    };
    addPassive?: PassiveEffect;
  };
}

export interface ProbabilityExperiment {
  id: string;
  name: string;
  description: string;
  emoji: string;
  materials: { templateId: string; count: number }[];
  coinCost: number;
  rewards: {
    type: 'part' | 'skill' | 'material' | 'coins' | 'gems';
    templateId?: string;
    amount?: number;
    rarity?: Rarity;
    weight: number;
  }[];
  guaranteedRarity?: Rarity;
}

export interface LabLogEntry {
  id: string;
  timestamp: number;
  type: 'synthesis' | 'modification' | 'experiment';
  success: boolean;
  description: string;
  rewards?: { type: string; name: string; emoji: string; rarity?: Rarity; amount?: number }[];
}

export interface LabSaveData {
  synthesisCount: number;
  modificationCount: number;
  experimentCount: number;
  successCount: number;
  failureCount: number;
  recentLogs: LabLogEntry[];
  unlockedRecipes: string[];
  unlockedExperiments: string[];
}

export type BondCategory = 'species' | 'element' | 'special';

export interface BondLevelConfig {
  requiredCount: number;
  stats: { hp?: number; atk?: number; def?: number; spd?: number; crit?: number };
  description: string;
}

export interface BondTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: BondCategory;
  color: string;
  animalTemplateIds: string[];
  levels: BondLevelConfig[];
}

export interface BondEntry {
  bondId: string;
  currentLevel: number;
  isActivated: boolean;
}

export type CodexMilestoneType = 'collection' | 'bond' | 'rarity';

export interface CodexMilestone {
  id: string;
  type: CodexMilestoneType;
  name: string;
  description: string;
  emoji: string;
  targetValue: number;
  reward: { type: 'coins' | 'gems'; amount: number };
  isClaimed: boolean;
}

export interface CodexSaveData {
  bonds: BondEntry[];
  milestones: CodexMilestone[];
  totalCollected: number;
  totalBondsActivated: number;
}

export interface ArenaDefenseConfig {
  animalIds: string[];
  lineupConfig: LineupConfig;
  updatedAt: number;
}

export interface ArenaChallengeRecord {
  id: string;
  timestamp: number;
  challengerName: string;
  challengerAvatar: string;
  defenderName: string;
  defenderAvatar: string;
  isPlayerAttacker: boolean;
  isWin: boolean;
  arenaPointsChange: number;
  battleRecordId: string;
  battleLog: BattleLogEntry[];
  playerUnits: BattleUnit[];
  enemyUnits: BattleUnit[];
  initialPlayerUnits: BattleUnit[];
  initialEnemyUnits: BattleUnit[];
}

export interface ArenaRankInfo {
  rank: number;
  arenaPoints: number;
  tier: ArenaTier;
  wins: number;
  losses: number;
  winStreak: number;
  highestRank: number;
  highestPoints: number;
  totalAttacks: number;
  totalDefenses: number;
  defenseWins: number;
}

export type ArenaTier = 'rookie' | 'amateur' | 'professional' | 'elite' | 'legendary' | 'champion';

export interface ArenaTierConfig {
  tier: ArenaTier;
  name: string;
  emoji: string;
  color: string;
  pointThreshold: number;
  rewards: {
    coins: number;
    gems: number;
    materials?: { templateId: string; count: number }[];
  };
}

export interface ArenaOpponent {
  id: string;
  name: string;
  avatar: string;
  tier: ArenaTier;
  arenaPoints: number;
  animalIds: string[];
  animalTemplateIds: string[];
  lineupConfig: LineupConfig;
  difficulty: 'easy' | 'normal' | 'hard';
  pointReward: number;
  pointRisk: number;
  expectedPointsGain: number;
}

export interface ArenaDailyReward {
  date: string;
  claimed: boolean;
  tier: ArenaTier;
  rank: number;
  coins: number;
  gems: number;
  materials?: { templateId: string; count: number }[];
}

export interface ArenaSaveData {
  defenseConfig: ArenaDefenseConfig | null;
  rankInfo: ArenaRankInfo;
  challengeHistory: ArenaChallengeRecord[];
  dailyRewards: ArenaDailyReward[];
  lastDailyRewardDate: string;
  lastAttackTime: number;
  lastDefenseTime: number;
  attackCountToday: number;
  defenseCountToday: number;
  maxDailyAttacks: number;
  maxDailyDefenses: number;
  opponents: ArenaOpponent[];
  opponentsRefreshTime: number;
}

export interface ArenaAttackResult {
  success: boolean;
  isWin: boolean;
  arenaPointsChange: number;
  newRank: number;
  newPoints: number;
  battleRecord?: BattleRecord;
  reward?: { coins: number; gems: number };
}

export interface ArenaMatchmakingResult {
  opponents: ArenaOpponent[];
  refreshCooldown: number;
}

export type TaskCategory = 'battle' | 'gacha' | 'ascend' | 'lineup' | 'daily' | 'achievement';

export type TaskRewardType = 'coins' | 'gems' | 'material' | 'animal' | 'part' | 'skill';

export interface TaskReward {
  type: TaskRewardType;
  amount: number;
  templateId?: string;
}

export interface TaskProgress {
  taskId: string;
  currentValue: number;
  targetValue: number;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt?: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: TaskCategory;
  targetValue: number;
  rewards: TaskReward[];
  isDaily?: boolean;
  isAchievement?: boolean;
  prerequisiteTaskIds?: string[];
}

export type WorldEventRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type WorldEventStatus = 'upcoming' | 'active' | 'ended';

export type WorldEventBattleRule = 'doubleDamage' | 'halfHeal' | 'noBuff' | 'speedBoost' | 'critFrenzy' | 'elementSurge' | 'bossRush';

export interface WorldEventBattleRuleConfig {
  rule: WorldEventBattleRule;
  name: string;
  description: string;
  emoji: string;
  color: string;
  atkMultiplier?: number;
  defMultiplier?: number;
  hpMultiplier?: number;
  spdMultiplier?: number;
  critBonus?: number;
  healMultiplier?: number;
  buffDisabled?: boolean;
  elementBonus?: Element;
  elementBonusMultiplier?: number;
}

export interface WorldEventSpecialEnemy {
  id: string;
  name: string;
  emoji: string;
  description: string;
  element: Element;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  rarity: WorldEventRarity;
  skills: string[];
  rewardCoins: number;
  rewardGems: number;
  rewardMaterials: { templateId: string; count: number }[];
  rewardMultiplier: number;
}

export interface WorldEventShopItem {
  id: string;
  name: string;
  emoji: string;
  itemType: 'animal' | 'part' | 'skill' | 'material';
  rarity: Rarity;
  templateId: string;
  cost: number;
  currency: 'coins' | 'gems' | 'eventTokens';
  stock: number;
  description: string;
}

export interface WorldEventTemplate {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  emoji: string;
  color: string;
  rarity: WorldEventRarity;
  durationHours: number;
  cooldownHours: number;
  specialEnemies: WorldEventSpecialEnemy[];
  battleRules: WorldEventBattleRule[];
  shopItems: WorldEventShopItem[];
  bonusRewardMultiplier: number;
  announcement: string;
}

export interface WorldEventInstance {
  templateId: string;
  startTime: number;
  endTime: number;
  status: WorldEventStatus;
  enemiesDefeated: Record<string, number>;
  shopPurchased: Record<string, number>;
  totalEventTokensEarned: number;
  battlesFought: number;
  battlesWon: number;
  claimedRewards: string[];
}

export interface WorldEventAnnouncement {
  id: string;
  eventId: string;
  eventName: string;
  eventEmoji: string;
  eventColor: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  type: 'eventStart' | 'eventEnding' | 'eventEnd' | 'specialEnemy' | 'newShopItem';
}

export interface WorldEventSaveData {
  activeEvents: WorldEventInstance[];
  pastEvents: WorldEventInstance[];
  announcements: WorldEventAnnouncement[];
  eventTokens: number;
  totalEventsParticipated: number;
  lastCycleCheck: number;
  nextCycleTime: number;
}

export interface TaskSaveData {
  progress: Record<string, TaskProgress>;
  lastDailyReset: number;
  completedAchievements: string[];
}

export interface InventoryItem {
  id: string;
  itemType: 'part' | 'skill' | 'material';
  itemId: string;
  isLocked: boolean;
  isFavorite: boolean;
  acquiredAt: number;
}

export type InventorySortBy = 'rarity' | 'name' | 'acquiredAt' | 'quality';
export type InventorySortOrder = 'asc' | 'desc';

export interface InventoryFilter {
  itemType: 'all' | 'part' | 'skill' | 'material';
  rarity: Rarity | 0;
  slot?: PartSlot | 'all';
  skillType?: SkillType | 'all';
  onlyFavorites: boolean;
  onlyLocked: boolean;
  sortBy: InventorySortBy;
  sortOrder: InventorySortOrder;
  search?: string;
}

export interface InventorySaveData {
  items: InventoryItem[];
  filters: InventoryFilter;
  selectedItemId: string | null;
  bulkMode: boolean;
  selectedIds: string[];
}

export type RecycleRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'myth';

export interface RecycleConfig {
  rarity: Rarity;
  coinReward: number;
  materialReward?: { templateId: string; count: number };
}

export interface ExchangeItem {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  itemType: 'part' | 'skill' | 'material' | 'gems';
  cost: { type: 'coins' | 'gems' | 'material'; amount: number; materialTemplateId?: string };
  description: string;
  stock?: number;
  dailyLimit?: number;
}

export interface TradeRecord {
  id: string;
  type: 'recycle' | 'exchange';
  itemName: string;
  itemEmoji: string;
  rarity: Rarity;
  cost: number;
  reward: string;
  timestamp: number;
}

export interface TradeSaveData {
  recycleHistory: TradeRecord[];
  exchangeHistory: TradeRecord[];
  dailyExchanges: Record<string, number>;
  lastDailyReset: number;
}

declare module './index' {
  interface SaveData {
    arenaData?: ArenaSaveData;
    taskData?: TaskSaveData;
    worldEventData?: WorldEventSaveData;
    inventoryData?: InventorySaveData;
    tradeData?: TradeSaveData;
  }
}
