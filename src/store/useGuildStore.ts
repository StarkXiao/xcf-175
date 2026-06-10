import { create } from 'zustand';
import type {
  GuildBossInstance,
  GuildMember,
  ExpeditionTeam,
  BossPhase,
  GuildExpeditionState,
  GuildExpeditionSaveData,
  GuildContributionRecord,
  GuildSettlementReward,
  Animal,
  BattleUnit,
  BattleLogEntry,
} from '@/types';
import { GUILD_BOSS_TEMPLATES, GUILD_SHOP_ITEMS, createGuildMembers, getBossTemplate } from '@/data/guildExpedition';
import { GUILD_EXPEDITION_CONFIG, GUILD_LEVEL_NAMES } from '@/engine/constants';
import { generateId } from '@/utils/id';
import { pickRandom } from '@/utils/random';
import { getAnimalTemplate } from '@/data/animals';
import { computePlayerStrengthScore } from '@/data/opponents';

const GUILD_SAVE_KEY = 'neon_colosseum_guild_v1';

interface GuildState extends GuildExpeditionState {
  initGuild: () => void;
  saveGuild: () => void;
  loadGuild: () => boolean;

  spawnBoss: (templateId: string) => void;
  attackBoss: (playerAnimals: Animal[], lineupAnimalIds: string[]) => {
    success: boolean;
    damage: number;
    phaseCleared: BossPhase[];
    bossDefeated: boolean;
    rewards: GuildSettlementReward[];
    log: BattleLogEntry[];
    playerUnits: BattleUnit[];
    bossUnit: BattleUnit;
  };
  setExpeditionTeam: (memberId: string, animalIds: string[], positions: import('@/types').FormationPosition[]) => void;
  removeExpeditionTeam: (memberId: string) => void;
  purchaseShopItem: (itemId: string) => boolean;
  resetWeeklyShop: () => void;
  processWeeklySettlement: () => GuildSettlementReward[];
  getCurrentWeekId: () => string;
  getGuildLevelName: () => string;
  addGuildExp: (amount: number) => void;
  addGuildTokens: (amount: number) => void;
  getAvailableBosses: () => typeof GUILD_BOSS_TEMPLATES;
}

const createDefaultGuildState = (): GuildExpeditionState => ({
  guildName: '霓虹远征团',
  guildLevel: 1,
  guildExp: 0,
  guildExpToNext: 500,
  guildTokens: 0,
  members: createGuildMembers(GUILD_EXPEDITION_CONFIG.MEMBER_COUNT),
  activeBoss: null,
  expeditionTeams: [],
  shopPurchases: {},
  weeklyContribution: 0,
  totalContribution: 0,
  weeklyBossDamage: 0,
  weeklyBossKills: 0,
  currentWeekId: getCurrentWeekIdStatic(),
  contributionHistory: [],
  lastSettlementTime: 0,
  isInitialized: true,
});

function getCurrentWeekIdStatic(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

function computeBossStats(templateId: string, guildLevel: number) {
  const template = getBossTemplate(templateId);
  if (!template) return null;

  const levelMult = 1 + (guildLevel - 1) * 0.15;
  return {
    maxHp: Math.floor(template.baseHp * levelMult),
    atk: Math.floor(template.baseAtk * levelMult),
    def: Math.floor(template.baseDef * levelMult),
    spd: Math.floor(template.baseSpd * levelMult),
  };
}

function simulateBossBattle(
  playerAnimals: Animal[],
  bossTemplate: typeof GUILD_BOSS_TEMPLATES[number],
  bossInstance: GuildBossInstance,
  guildLevel: number,
): {
  totalDamage: number;
  phaseCleared: BossPhase[];
  bossDefeated: boolean;
  playerAlive: boolean;
  playerUnits: BattleUnit[];
  bossUnit: BattleUnit;
  log: BattleLogEntry[];
} {
  const levelMult = 1 + (guildLevel - 1) * 0.15;
  const bossStats = computeBossStats(bossTemplate.id, guildLevel)!;

  const phaseConfig = bossTemplate.phases.find(p => p.phase === bossInstance.currentPhase);
  const phaseAtkMult = phaseConfig?.atkMultiplier ?? 1;
  const phaseDefMult = phaseConfig?.defMultiplier ?? 1;

  const bossUnit: BattleUnit = {
    id: 'boss',
    animalId: bossTemplate.id,
    name: bossTemplate.name,
    emoji: bossTemplate.emoji,
    element: bossTemplate.element,
    maxHp: bossInstance.currentHp,
    currentHp: bossInstance.currentHp,
    atk: Math.floor(bossStats.atk * phaseAtkMult),
    def: Math.floor(bossStats.def * phaseDefMult),
    spd: bossStats.spd,
    skills: [],
    isAlive: true,
    side: 'enemy',
    position: 3,
    formationPosition: 'front',
    targetStrategy: 'lowestHp',
    buffs: [],
    statusEffects: [],
    comboCount: 0,
    isSkipTurn: false,
    passives: [],
    activatedCombos: [],
    triggeredPassives: [],
    activeSetBonuses: [],
  };

  const playerUnits: BattleUnit[] = playerAnimals.map((animal, idx) => {
    const template = getAnimalTemplate(animal.templateId);
    const levelMultP = 1 + (animal.level - 1) * 0.1;
    const starMult = 1 + (animal.starLevel - 1) * 0.2;
    const btMult = 1 + animal.breakthroughTier * 0.15;

    let bonusHp = 0, bonusAtk = 0, bonusDef = 0, bonusSpd = 0;
    for (const ep of animal.parts) {
      const pt = ep.partId;
      bonusHp += template?.baseHp ? 0 : 0;
    }

    return {
      id: animal.id,
      animalId: animal.id,
      name: animal.name,
      emoji: template?.emoji ?? '🐾',
      element: template?.element ?? 'fire',
      maxHp: Math.floor((template?.baseHp ?? 80) * levelMultP * starMult) + bonusHp,
      currentHp: Math.floor((template?.baseHp ?? 80) * levelMultP * starMult) + bonusHp,
      atk: Math.floor((template?.baseAtk ?? 15) * levelMultP * starMult * btMult) + bonusAtk,
      def: Math.floor((template?.baseDef ?? 8) * levelMultP * starMult * btMult) + bonusDef,
      spd: Math.floor((template?.baseSpd ?? 14) * levelMultP) + bonusSpd,
      skills: animal.skills.map(s => ({
        skillId: s.skillId,
        name: s.skillId,
        type: 'attack' as const,
        damage: 20 + s.level * 10,
        cooldown: 3,
        currentCooldown: 0,
        emoji: '⚔️',
        branchId: s.branchId,
      })),
      isAlive: true,
      side: 'player' as const,
      position: idx,
      formationPosition: (idx === 0 ? 'front' : idx === 1 ? 'mid' : 'back') as import('@/types').FormationPosition,
      targetStrategy: 'lowestHp' as const,
      buffs: [],
      statusEffects: [],
      comboCount: 0,
      isSkipTurn: false,
      passives: [],
      activatedCombos: [],
      triggeredPassives: [],
      activeSetBonuses: [],
    };
  });

  const phaseCleared: BossPhase[] = [];
  const log: BattleLogEntry[] = [];
  let totalDamage = 0;
  let currentBossHp = bossInstance.currentHp;
  const bossMaxHpForPhase = bossInstance.maxHp;

  const phaseThresholds = bossTemplate.phases.map(p => ({
    phase: p.phase,
    threshold: Math.floor(bossInstance.maxHp * (p.hpPercent === 100 ? 1 : p === bossTemplate.phases[bossTemplate.phases.length - 1] ? 0 : p.hpPercent / 100)),
  }));

  for (let turn = 0; turn < 30; turn++) {
    const alivePlayers = playerUnits.filter(u => u.isAlive);
    if (alivePlayers.length === 0) break;
    if (currentBossHp <= 0) break;

    for (const unit of alivePlayers.sort((a, b) => b.spd - a.spd)) {
      if (!unit.isAlive || currentBossHp <= 0) continue;

      const critRoll = Math.random() * 100 < 15;
      const baseDmg = Math.max(1, unit.atk * 2 - bossUnit.def * 0.5);
      const dmg = Math.floor(baseDmg * (critRoll ? 1.8 : 1) * (0.9 + Math.random() * 0.2));

      currentBossHp -= dmg;
      totalDamage += dmg;

      log.push({
        timestamp: Date.now(),
        type: critRoll ? 'crit' : 'damage',
        turn: turn + 1,
        message: `${unit.emoji}${unit.name} 对 ${bossTemplate.emoji}${bossTemplate.name} 造成 ${dmg} 伤害${critRoll ? ' 💥暴击!' : ''}`,
        sourceId: unit.id,
        sourceName: unit.name,
        targetId: 'boss',
        targetName: bossTemplate.name,
        value: dmg,
        isCrit: critRoll,
      });

      for (const pt of phaseThresholds) {
        if (pt.phase > bossInstance.currentPhase && currentBossHp <= pt.threshold && !phaseCleared.includes(pt.phase)) {
          phaseCleared.push(pt.phase);
          log.push({
            timestamp: Date.now(),
            type: 'info',
            turn: turn + 1,
            message: `⚠️ ${bossTemplate.name} 进入第${pt.phase}阶段!`,
          });
        }
      }
    }

    if (currentBossHp <= 0) break;

    const bossDmg = Math.floor(bossUnit.atk * (1.5 + Math.random() * 0.5));
    const targets = alivePlayers.sort((a, b) => a.currentHp - b.currentHp);
    const target = targets[0];
    if (target) {
      const actualDmg = Math.max(1, bossDmg - target.def * 0.3);
      target.currentHp -= actualDmg;
      if (target.currentHp <= 0) {
        target.currentHp = 0;
        target.isAlive = false;
      }

      log.push({
        timestamp: Date.now(),
        type: 'attack',
        turn: turn + 1,
        message: `${bossTemplate.emoji}${bossTemplate.name} 攻击 ${target.emoji}${target.name} 造成 ${Math.floor(actualDmg)} 伤害`,
        sourceId: 'boss',
        sourceName: bossTemplate.name,
        targetId: target.id,
        targetName: target.name,
        value: Math.floor(actualDmg),
      });
    }

    if (phaseConfig && phaseConfig.specialSkill && Math.random() * 100 < phaseConfig.specialSkillChance) {
      const skillDmg = Math.floor(bossUnit.atk * 2);
      for (const t of targets) {
        if (!t.isAlive) continue;
        const aoeDmg = Math.max(1, Math.floor(skillDmg * (0.6 + Math.random() * 0.4) - t.def * 0.2));
        t.currentHp -= aoeDmg;
        if (t.currentHp <= 0) {
          t.currentHp = 0;
          t.isAlive = false;
        }
        log.push({
          timestamp: Date.now(),
          type: 'skill',
          turn: turn + 1,
          message: `${bossTemplate.emoji}${phaseConfig.specialSkillEmoji}${phaseConfig.specialSkillName}! 对 ${t.emoji}${t.name} 造成 ${aoeDmg} 伤害`,
          skillName: phaseConfig.specialSkillName,
        });
      }
    }
  }

  const bossDefeated = currentBossHp <= 0;
  const playerAlive = playerUnits.some(u => u.isAlive);

  bossUnit.currentHp = Math.max(0, currentBossHp);

  return {
    totalDamage,
    phaseCleared,
    bossDefeated,
    playerAlive,
    playerUnits,
    bossUnit,
    log,
  };
}

export const useGuildStore = create<GuildState>((set, get) => ({
  ...createDefaultGuildState(),

  initGuild: () => {
    const loaded = get().loadGuild();
    if (!loaded) {
      set(createDefaultGuildState());
      get().saveGuild();
    }
  },

  saveGuild: () => {
    const state = get();
    const saveData: GuildExpeditionSaveData = {
      guildName: state.guildName,
      guildLevel: state.guildLevel,
      guildExp: state.guildExp,
      guildTokens: state.guildTokens,
      members: state.members,
      activeBoss: state.activeBoss,
      expeditionTeams: state.expeditionTeams,
      shopPurchases: state.shopPurchases,
      weeklyContribution: state.weeklyContribution,
      totalContribution: state.totalContribution,
      weeklyBossDamage: state.weeklyBossDamage,
      weeklyBossKills: state.weeklyBossKills,
      currentWeekId: state.currentWeekId,
      contributionHistory: state.contributionHistory,
      lastSettlementTime: state.lastSettlementTime,
    };
    localStorage.setItem(GUILD_SAVE_KEY, JSON.stringify(saveData));
  },

  loadGuild: (): boolean => {
    try {
      const raw = localStorage.getItem(GUILD_SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as GuildExpeditionSaveData;
      set({
        ...data,
        guildExpToNext: GUILD_EXPEDITION_CONFIG.GUILD_LEVEL_EXP_BASE * Math.pow(GUILD_EXPEDITION_CONFIG.GUILD_LEVEL_EXP_MULTIPLIER, (data.guildLevel || 1) - 1),
        isInitialized: true,
      });
      return true;
    } catch {
      return false;
    }
  },

  spawnBoss: (templateId: string) => {
    const state = get();
    const template = getBossTemplate(templateId);
    if (!template) return;

    const stats = computeBossStats(templateId, state.guildLevel);
    if (!stats) return;

    const bossInstance: GuildBossInstance = {
      templateId,
      currentHp: stats.maxHp,
      maxHp: stats.maxHp,
      currentPhase: 1,
      totalDamageDealt: 0,
      isDefeated: false,
      defeatedPhases: [],
      attemptsUsed: 0,
    };

    set({ activeBoss: bossInstance });
    get().saveGuild();
  },

  attackBoss: (playerAnimals: Animal[], lineupAnimalIds: string[]) => {
    const state = get();
    if (!state.activeBoss || state.activeBoss.isDefeated) {
      return {
        success: false,
        damage: 0,
        phaseCleared: [],
        bossDefeated: false,
        rewards: [],
        log: [],
        playerUnits: [],
        bossUnit: {} as BattleUnit,
      };
    }

    if (state.activeBoss.attemptsUsed >= GUILD_EXPEDITION_CONFIG.MAX_ATTEMPTS_PER_BOSS) {
      return {
        success: false,
        damage: 0,
        phaseCleared: [],
        bossDefeated: false,
        rewards: [],
        log: [],
        playerUnits: [],
        bossUnit: {} as BattleUnit,
      };
    }

    const template = getBossTemplate(state.activeBoss.templateId);
    if (!template) {
      return {
        success: false,
        damage: 0,
        phaseCleared: [],
        bossDefeated: false,
        rewards: [],
        log: [],
        playerUnits: [],
        bossUnit: {} as BattleUnit,
      };
    }

    const result = simulateBossBattle(playerAnimals, template, state.activeBoss, state.guildLevel);

    const rewards: GuildSettlementReward[] = [];
    for (const phase of result.phaseCleared) {
      const phaseRewards = template.rewards.filter(r => r.phase === phase);
      for (const r of phaseRewards) {
        rewards.push({ type: r.type, amount: r.amount, materialTemplateId: r.materialTemplateId });
      }
    }

    if (result.bossDefeated) {
      const killRewards = template.rewards.filter(r => !result.phaseCleared.includes(r.phase));
      for (const r of killRewards) {
        rewards.push({ type: r.type, amount: r.amount, materialTemplateId: r.materialTemplateId });
      }
    }

    const tokenGain = Math.floor(result.totalDamage * GUILD_EXPEDITION_CONFIG.GUILD_TOKEN_PER_DAMAGE)
      + (result.bossDefeated ? GUILD_EXPEDITION_CONFIG.GUILD_TOKEN_PER_KILL : 0);

    const contributionGain = GUILD_EXPEDITION_CONFIG.CONTRIBUTION_PER_BATTLE
      + result.phaseCleared.length * GUILD_EXPEDITION_CONFIG.CONTRIBUTION_PER_PHASE_CLEAR
      + (result.bossDefeated ? GUILD_EXPEDITION_CONFIG.CONTRIBUTION_PER_BOSS_KILL : 0);

    set(state => {
      const boss = state.activeBoss!;
      const newBoss: GuildBossInstance = {
        ...boss,
        currentHp: Math.max(0, boss.currentHp - result.totalDamage),
        currentPhase: result.phaseCleared.length > 0 ? (Math.max(...result.phaseCleared) as BossPhase) : boss.currentPhase,
        totalDamageDealt: boss.totalDamageDealt + result.totalDamage,
        isDefeated: result.bossDefeated,
        defeatedPhases: [...boss.defeatedPhases, ...result.phaseCleared],
        attemptsUsed: boss.attemptsUsed + 1,
      };

      return {
        activeBoss: newBoss,
        guildTokens: state.guildTokens + tokenGain,
        weeklyContribution: state.weeklyContribution + contributionGain,
        totalContribution: state.totalContribution + contributionGain,
        weeklyBossDamage: state.weeklyBossDamage + result.totalDamage,
        weeklyBossKills: state.weeklyBossKills + (result.bossDefeated ? 1 : 0),
      };
    });

    if (result.bossDefeated) {
      get().addGuildExp(GUILD_EXPEDITION_CONFIG.GUILD_EXP_PER_BOSS_KILL);
    }

    get().saveGuild();

    return {
      success: true,
      damage: result.totalDamage,
      phaseCleared: result.phaseCleared,
      bossDefeated: result.bossDefeated,
      rewards,
      log: result.log,
      playerUnits: result.playerUnits,
      bossUnit: result.bossUnit,
    };
  },

  setExpeditionTeam: (memberId: string, animalIds: string[], positions: import('@/types').FormationPosition[]) => {
    set(state => {
      const existing = state.expeditionTeams.findIndex(t => t.memberId === memberId);
      const newTeam: ExpeditionTeam = { memberId, animalIds, formationPosition: positions };

      if (existing >= 0) {
        const teams = [...state.expeditionTeams];
        teams[existing] = newTeam;
        return { expeditionTeams: teams };
      }
      return { expeditionTeams: [...state.expeditionTeams, newTeam] };
    });
    get().saveGuild();
  },

  removeExpeditionTeam: (memberId: string) => {
    set(state => ({
      expeditionTeams: state.expeditionTeams.filter(t => t.memberId !== memberId),
    }));
    get().saveGuild();
  },

  purchaseShopItem: (itemId: string): boolean => {
    const state = get();
    const item = GUILD_SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    const purchased = state.shopPurchases[itemId] || 0;
    if (purchased >= item.weeklyStock) return false;
    if (state.guildTokens < item.cost) return false;

    set(state => ({
      guildTokens: state.guildTokens - item.cost,
      shopPurchases: { ...state.shopPurchases, [itemId]: (state.shopPurchases[itemId] || 0) + 1 },
    }));
    get().saveGuild();
    return true;
  },

  resetWeeklyShop: () => {
    set({ shopPurchases: {} });
    get().saveGuild();
  },

  processWeeklySettlement: (): GuildSettlementReward[] => {
    const state = get();
    const weekId = get().getCurrentWeekId();

    if (weekId === state.currentWeekId) return [];

    const rewards: GuildSettlementReward[] = [];

    rewards.push({ type: 'coins', amount: state.weeklyContribution * 5 });
    rewards.push({ type: 'guildToken', amount: Math.floor(state.weeklyBossDamage * GUILD_EXPEDITION_CONFIG.GUILD_TOKEN_PER_DAMAGE * 0.5) });

    if (state.weeklyBossKills >= 3) {
      rewards.push({ type: 'gems', amount: 10 });
    }
    if (state.weeklyBossKills >= 5) {
      rewards.push({ type: 'gems', amount: 15 });
    }

    const record: GuildContributionRecord = {
      weekId: state.currentWeekId,
      memberId: 'player',
      contribution: state.weeklyContribution,
      bossDamage: state.weeklyBossDamage,
      bossKills: state.weeklyBossKills,
      rewards,
      timestamp: Date.now(),
    };

    set(state => ({
      currentWeekId: weekId,
      weeklyContribution: 0,
      weeklyBossDamage: 0,
      weeklyBossKills: 0,
      contributionHistory: [...state.contributionHistory, record].slice(-20),
      lastSettlementTime: Date.now(),
    }));

    get().resetWeeklyShop();
    get().saveGuild();

    return rewards;
  },

  getCurrentWeekId: (): string => {
    return getCurrentWeekIdStatic();
  },

  getGuildLevelName: (): string => {
    return GUILD_LEVEL_NAMES[get().guildLevel] || '初创公会';
  },

  addGuildExp: (amount: number) => {
    set(state => {
      let exp = state.guildExp + amount;
      let level = state.guildLevel;
      let expToNext = state.guildExpToNext;

      while (exp >= expToNext && level < 5) {
        exp -= expToNext;
        level++;
        expToNext = Math.floor(GUILD_EXPEDITION_CONFIG.GUILD_LEVEL_EXP_BASE * Math.pow(GUILD_EXPEDITION_CONFIG.GUILD_LEVEL_EXP_MULTIPLIER, level - 1));
      }

      if (level >= 5) {
        exp = 0;
        expToNext = Infinity;
      }

      return { guildExp: exp, guildLevel: level, guildExpToNext: expToNext };
    });
    get().saveGuild();
  },

  addGuildTokens: (amount: number) => {
    set(state => ({ guildTokens: state.guildTokens + amount }));
    get().saveGuild();
  },

  getAvailableBosses: () => {
    const level = get().guildLevel;
    return GUILD_BOSS_TEMPLATES.filter(b => {
      if (b.rarity <= 3) return true;
      if (b.rarity === 4) return level >= 2;
      return level >= 3;
    });
  },
}));
