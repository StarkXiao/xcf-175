import { create } from 'zustand';
import type {
  GuildBossInstance,
  GuildMember,
  ExpeditionTeam,
  BossPhase,
  BossPhaseConfig,
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

const GUILD_SAVE_KEY = 'neon_colosseum_guild_v1';

export interface MemberBattleContribution {
  memberId: string;
  memberName: string;
  memberAvatar: string;
  damage: number;
  critCount: number;
}

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
    memberContributions: MemberBattleContribution[];
    cooperationBonusRate: number;
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

function createMemberUnit(
  member: GuildMember,
  team: ExpeditionTeam,
  idx: number,
): BattleUnit {
  const baseAtk = 12 + member.level * 3;
  const baseHp = 60 + member.level * 12;
  const baseDef = 5 + member.level * 2;
  const baseSpd = 10 + Math.floor(member.level * 0.5);

  return {
    id: `member_${member.id}`,
    animalId: member.id,
    name: member.name,
    emoji: member.avatar,
    element: 'fire' as const,
    maxHp: baseHp,
    currentHp: baseHp,
    atk: baseAtk,
    def: baseDef,
    spd: baseSpd,
    skills: [],
    isAlive: true,
    side: 'player' as const,
    position: idx + 10,
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
}

function computePhaseHpThreshold(bossTemplate: typeof GUILD_BOSS_TEMPLATES[number], bossMaxHp: number): { phase: BossPhase; hpThreshold: number }[] {
  const sorted = [...bossTemplate.phases].sort((a, b) => a.phase - b.phase);
  const thresholds: { phase: BossPhase; hpThreshold: number }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (i === 0) continue;
    const pct = p.hpPercent / 100;
    thresholds.push({ phase: p.phase, hpThreshold: Math.floor(bossMaxHp * pct) });
  }

  return thresholds;
}

function simulateBossBattle(
  playerAnimals: Animal[],
  bossTemplate: typeof GUILD_BOSS_TEMPLATES[number],
  bossInstance: GuildBossInstance,
  guildLevel: number,
  expeditionTeams: ExpeditionTeam[],
  members: GuildMember[],
): {
  totalDamage: number;
  playerDamage: number;
  memberDamage: number;
  phaseCleared: BossPhase[];
  bossDefeated: boolean;
  playerAlive: boolean;
  playerUnits: BattleUnit[];
  memberUnits: BattleUnit[];
  bossUnit: BattleUnit;
  log: BattleLogEntry[];
  memberContributions: MemberBattleContribution[];
  cooperationBonusRate: number;
} {
  const bossStats = computeBossStats(bossTemplate.id, guildLevel)!;

  let currentPhase: BossPhase = bossInstance.currentPhase;
  const getPhaseConfig = (phase: BossPhase): BossPhaseConfig => {
    return bossTemplate.phases.find(p => p.phase === phase) ?? bossTemplate.phases[0];
  };

  const phaseConfig = getPhaseConfig(currentPhase);

  const bossUnit: BattleUnit = {
    id: 'boss',
    animalId: bossTemplate.id,
    name: bossTemplate.name,
    emoji: bossTemplate.emoji,
    element: bossTemplate.element,
    maxHp: bossInstance.currentHp,
    currentHp: bossInstance.currentHp,
    atk: Math.floor(bossStats.atk * phaseConfig.atkMultiplier),
    def: Math.floor(bossStats.def * phaseConfig.defMultiplier),
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

    return {
      id: animal.id,
      animalId: animal.id,
      name: animal.name,
      emoji: template?.emoji ?? '🐾',
      element: template?.element ?? 'fire',
      maxHp: Math.floor((template?.baseHp ?? 80) * levelMultP * starMult),
      currentHp: Math.floor((template?.baseHp ?? 80) * levelMultP * starMult),
      atk: Math.floor((template?.baseAtk ?? 15) * levelMultP * starMult * btMult),
      def: Math.floor((template?.baseDef ?? 8) * levelMultP * starMult * btMult),
      spd: Math.floor((template?.baseSpd ?? 14) * levelMultP),
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

  const memberUnits: BattleUnit[] = [];
  const memberContribMap = new Map<string, { damage: number; critCount: number; name: string; avatar: string }>();

  for (const team of expeditionTeams) {
    const member = members.find(m => m.id === team.memberId);
    if (!member) continue;
    const unit = createMemberUnit(member, team, memberUnits.length);
    memberUnits.push(unit);
    memberContribMap.set(member.id, { damage: 0, critCount: 0, name: member.name, avatar: member.avatar });
  }

  const participatingTeams = expeditionTeams.length;
  const cooperationBonusRate = 1 + participatingTeams * 0.12;

  const phaseThresholds = computePhaseHpThreshold(bossTemplate, bossInstance.maxHp);

  const phaseCleared: BossPhase[] = [];
  const log: BattleLogEntry[] = [];
  let totalDamage = 0;
  let playerDamage = 0;
  let memberDamage = 0;
  let currentBossHp = bossInstance.currentHp;
  let turnsInPhase = 0;
  let enrageActive = false;

  if (participatingTeams > 0) {
    log.push({
      timestamp: Date.now(),
      type: 'info',
      turn: 0,
      message: `🤝 ${participatingTeams}名公会成员协战! 全队伤害 +${Math.round((cooperationBonusRate - 1) * 100)}%`,
    });
  }

  for (let turn = 0; turn < 30; turn++) {
    const alivePlayers = playerUnits.filter(u => u.isAlive);
    const aliveMembers = memberUnits.filter(u => u.isAlive);
    const allAlive = [...alivePlayers, ...aliveMembers].sort((a, b) => b.spd - a.spd);

    if (allAlive.length === 0) break;
    if (currentBossHp <= 0) break;

    turnsInPhase++;

    for (const unit of allAlive) {
      if (!unit.isAlive || currentBossHp <= 0) continue;

      const isMemberUnit = unit.id.startsWith('member_');
      const critRoll = Math.random() * 100 < (isMemberUnit ? 12 : 15);
      let baseDmg = Math.max(1, unit.atk * 2 - bossUnit.def * 0.5);
      baseDmg = Math.floor(baseDmg * cooperationBonusRate * (critRoll ? 1.8 : 1) * (0.9 + Math.random() * 0.2));

      currentBossHp -= baseDmg;
      totalDamage += baseDmg;

      if (isMemberUnit) {
        memberDamage += baseDmg;
        const memberId = unit.id.replace('member_', '');
        const contrib = memberContribMap.get(memberId);
        if (contrib) {
          contrib.damage += baseDmg;
          if (critRoll) contrib.critCount++;
        }
      } else {
        playerDamage += baseDmg;
      }

      const sourceLabel = isMemberUnit ? `${unit.emoji}[协]${unit.name}` : `${unit.emoji}${unit.name}`;
      log.push({
        timestamp: Date.now(),
        type: critRoll ? 'crit' : 'damage',
        turn: turn + 1,
        message: `${sourceLabel} 对 ${bossTemplate.emoji}${bossTemplate.name} 造成 ${baseDmg} 伤害${critRoll ? ' 💥暴击!' : ''}`,
        sourceId: unit.id,
        sourceName: unit.name,
        targetId: 'boss',
        targetName: bossTemplate.name,
        value: baseDmg,
        isCrit: critRoll,
      });

      for (const pt of phaseThresholds) {
        if (pt.phase > currentPhase && currentBossHp <= pt.hpThreshold && !phaseCleared.includes(pt.phase)) {
          phaseCleared.push(pt.phase);
          const oldPhase = currentPhase;
          currentPhase = pt.phase;
          turnsInPhase = 0;
          enrageActive = false;

          const newPhaseConfig = getPhaseConfig(pt.phase);
          bossUnit.atk = Math.floor(bossStats.atk * newPhaseConfig.atkMultiplier);
          bossUnit.def = Math.floor(bossStats.def * newPhaseConfig.defMultiplier);

          log.push({
            timestamp: Date.now(),
            type: 'info',
            turn: turn + 1,
            message: `⚠️ ${bossTemplate.name} 进入第${pt.phase}阶段! ATK×${newPhaseConfig.atkMultiplier} DEF×${newPhaseConfig.defMultiplier}`,
          });

          if (newPhaseConfig.specialSkill) {
            log.push({
              timestamp: Date.now(),
              type: 'info',
              turn: turn + 1,
              message: `${newPhaseConfig.specialSkillEmoji} 解锁技能: ${newPhaseConfig.specialSkillName} (${newPhaseConfig.specialSkillChance}%)`,
            });
          }

          if (newPhaseConfig.enrageTurns) {
            log.push({
              timestamp: Date.now(),
              type: 'info',
              turn: turn + 1,
              message: `⏰ 狂暴倒计时: ${newPhaseConfig.enrageTurns}回合 (+${newPhaseConfig.enrageAtkBonus}ATK)`,
            });
          }
        }
      }
    }

    if (currentBossHp <= 0) break;

    const activePhaseConfig = getPhaseConfig(currentPhase);

    if (activePhaseConfig.enrageTurns && !enrageActive && turnsInPhase >= activePhaseConfig.enrageTurns) {
      enrageActive = true;
      const enrageBonus = activePhaseConfig.enrageAtkBonus ?? 0;
      bossUnit.atk += enrageBonus;
      log.push({
        timestamp: Date.now(),
        type: 'info',
        turn: turn + 1,
        message: `🔥🔥🔥 ${bossTemplate.name} 狂暴化! ATK +${enrageBonus}`,
      });
    }

    const allTargets = [...playerUnits.filter(u => u.isAlive), ...memberUnits.filter(u => u.isAlive)];
    if (allTargets.length === 0) break;

    const bossBaseDmg = Math.floor(bossUnit.atk * (1.5 + Math.random() * 0.5));
    const sortedTargets = [...allTargets].sort((a, b) => a.currentHp - b.currentHp);
    const target = sortedTargets[0];
    if (target) {
      const actualDmg = Math.max(1, bossBaseDmg - target.def * 0.3);
      target.currentHp -= actualDmg;
      if (target.currentHp <= 0) {
        target.currentHp = 0;
        target.isAlive = false;
      }

      const targetLabel = target.id.startsWith('member_') ? `${target.emoji}[协]${target.name}` : `${target.emoji}${target.name}`;
      log.push({
        timestamp: Date.now(),
        type: 'attack',
        turn: turn + 1,
        message: `${bossTemplate.emoji}${bossTemplate.name} 攻击 ${targetLabel} 造成 ${Math.floor(actualDmg)} 伤害`,
        sourceId: 'boss',
        sourceName: bossTemplate.name,
        targetId: target.id,
        targetName: target.name,
        value: Math.floor(actualDmg),
      });
    }

    if (activePhaseConfig.specialSkill && Math.random() * 100 < activePhaseConfig.specialSkillChance) {
      const skillDmg = Math.floor(bossUnit.atk * 2);
      const aliveTargets = [...playerUnits.filter(u => u.isAlive), ...memberUnits.filter(u => u.isAlive)];
      for (const t of aliveTargets) {
        if (!t.isAlive) continue;
        const aoeDmg = Math.max(1, Math.floor(skillDmg * (0.6 + Math.random() * 0.4) - t.def * 0.2));
        t.currentHp -= aoeDmg;
        if (t.currentHp <= 0) {
          t.currentHp = 0;
          t.isAlive = false;
        }
        const tLabel = t.id.startsWith('member_') ? `${t.emoji}[协]${t.name}` : `${t.emoji}${t.name}`;
        log.push({
          timestamp: Date.now(),
          type: 'skill',
          turn: turn + 1,
          message: `${bossTemplate.emoji}${activePhaseConfig.specialSkillEmoji}${activePhaseConfig.specialSkillName}! 对 ${tLabel} 造成 ${aoeDmg} 伤害`,
          skillName: activePhaseConfig.specialSkillName,
        });
      }
    }
  }

  const bossDefeated = currentBossHp <= 0;
  const playerAlive = playerUnits.some(u => u.isAlive);

  bossUnit.currentHp = Math.max(0, currentBossHp);

  const memberContributions: MemberBattleContribution[] = [];
  for (const [memberId, data] of memberContribMap) {
    memberContributions.push({
      memberId,
      memberName: data.name,
      memberAvatar: data.avatar,
      damage: data.damage,
      critCount: data.critCount,
    });
  }

  return {
    totalDamage,
    playerDamage,
    memberDamage,
    phaseCleared,
    bossDefeated,
    playerAlive,
    playerUnits,
    memberUnits,
    bossUnit,
    log,
    memberContributions,
    cooperationBonusRate,
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
    const emptyResult = {
      success: false as const,
      damage: 0,
      phaseCleared: [] as BossPhase[],
      bossDefeated: false,
      rewards: [] as GuildSettlementReward[],
      log: [] as BattleLogEntry[],
      playerUnits: [] as BattleUnit[],
      bossUnit: {} as BattleUnit,
      memberContributions: [] as MemberBattleContribution[],
      cooperationBonusRate: 1,
    };

    if (!state.activeBoss || state.activeBoss.isDefeated) return emptyResult;
    if (state.activeBoss.attemptsUsed >= GUILD_EXPEDITION_CONFIG.MAX_ATTEMPTS_PER_BOSS) return emptyResult;

    const template = getBossTemplate(state.activeBoss.templateId);
    if (!template) return emptyResult;

    const result = simulateBossBattle(
      playerAnimals, template, state.activeBoss, state.guildLevel,
      state.expeditionTeams, state.members,
    );

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
        defeatedPhases: [...new Set([...boss.defeatedPhases, ...result.phaseCleared])],
        attemptsUsed: boss.attemptsUsed + 1,
      };

      const updatedMembers = state.members.map(m => {
        const contrib = result.memberContributions.find(c => c.memberId === m.id);
        if (!contrib) return m;
        return {
          ...m,
          weeklyContribution: m.weeklyContribution + Math.floor(contrib.damage * 0.05),
          contribution: m.contribution + Math.floor(contrib.damage * 0.05),
        };
      });

      return {
        activeBoss: newBoss,
        members: updatedMembers,
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
      memberContributions: result.memberContributions,
      cooperationBonusRate: result.cooperationBonusRate,
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
      members: state.members.map(m => ({ ...m, weeklyContribution: 0 })),
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
