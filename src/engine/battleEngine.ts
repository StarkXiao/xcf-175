import type {
  Animal,
  BattleUnit,
  BattleLogEntry,
  BattleSkill,
  BattleSide,
  StatusEffectPayload,
  BuffPayload,
  LineupConfig,
  FormationPosition,
  TargetStrategy,
  ActionPriority,
  StarLevel,
  BreakthroughTier,
  PassiveEffect,
  ComboTrigger,
  SkillBranch,
  StatusEffectType,
} from '@/types';
import { getAnimalTemplate } from '@/data/animals';
import { getSkillTemplate } from '@/data/skills';
import { getPartTemplate, QUALITY_MULTIPLIER, computeSetBonusStats, getActiveSetBonuses } from '@/data/parts';
import { getRandomOpponent, generateDynamicEnemyTeam } from '@/data/opponents';
import type { DynamicOpponentContext, DynamicDifficultyTier } from '@/types';
import { generateId } from '@/utils/id';
import { randomInt, pickRandom, chance } from '@/utils/random';
import { BATTLE_CONSTANTS, RARITY_MULTIPLIER, STATUS_EFFECT_CONFIG, ELEMENT_NAMES, ELEMENT_EMOJIS } from './constants';
import { getStarBonus, getBreakthroughBonus } from '@/data/ascendConfig';
import {
  calculateDamage,
  calculateHeal,
  getRandomTarget,
  getLowestHpTarget,
  getHighestAtkTarget,
  getWeakestDefTarget,
  getHighestThreatTarget,
  getAliveUnits,
  isTeamAlive,
} from './damageCalc';

interface PassiveContext {
  attacker?: BattleUnit;
  target?: BattleUnit;
  damage?: number;
  isCrit?: boolean;
  statusApplied?: { type: StatusEffectType; chance: number; duration: number; damage?: number };
  buffPhase?: boolean;
}

interface TargetResult {
  targetId: string;
  damage: number;
  isCrit: boolean;
  killed: boolean;
  statusApplied?: { type: StatusEffectType; chance: number; duration: number; damage?: number };
}

interface ActionResult {
  logs: BattleLogEntry[];
  targets: TargetResult[];
  skillUsed: BattleSkill | null;
  extraTurn?: boolean;
}

export const calculateAnimalStats = (animal: Animal): {
  hp: number;
  atk: number;
  def: number;
  spd: number;
} => {
  const template = getAnimalTemplate(animal.templateId);
  if (!template) {
    return { hp: 0, atk: 0, def: 0, spd: 0 };
  }

  const levelMultiplier = 1 + (animal.level - 1) * 0.1;
  const rarityMultiplier = RARITY_MULTIPLIER[animal.rarity];
  const starBonus = getStarBonus(animal.starLevel);
  const btBonus = getBreakthroughBonus(animal.breakthroughTier);

  let hp = Math.floor(template.baseHp * levelMultiplier * rarityMultiplier * starBonus.hpMul) + btBonus.hpFlat;
  let atk = Math.floor(template.baseAtk * levelMultiplier * rarityMultiplier * starBonus.atkMul) + btBonus.atkFlat;
  let def = Math.floor(template.baseDef * levelMultiplier * rarityMultiplier * starBonus.defMul) + btBonus.defFlat;
  let spd = Math.floor(template.baseSpd * levelMultiplier * rarityMultiplier) + starBonus.spdBonus + btBonus.spdFlat;

  animal.parts.forEach(ep => {
    const part = getPartTemplate(ep.partId);
    if (part) {
      const quality = ep.quality || 1;
      const qMul = QUALITY_MULTIPLIER[quality];
      hp += Math.floor((part.stats.hp || 0) * qMul);
      atk += Math.floor((part.stats.atk || 0) * qMul);
      def += Math.floor((part.stats.def || 0) * qMul);
      spd += Math.floor((part.stats.spd || 0) * qMul);
    }
  });

  const setStats = computeSetBonusStats(animal.parts);
  hp += setStats.hp;
  atk += setStats.atk;
  def += setStats.def;
  spd += setStats.spd;

  return { hp, atk, def, spd };
};

export const createBattleUnit = (
  animal: Animal,
  side: BattleSide,
  position: number,
  formationPosition: FormationPosition = 'mid',
  targetStrategy: TargetStrategy = 'lowestHp'
): BattleUnit => {
  const template = getAnimalTemplate(animal.templateId);
  const stats = calculateAnimalStats(animal);

  const allPassives: PassiveEffect[] = [];
  const allComboTriggers: ComboTrigger[] = [];

  const skills: BattleSkill[] = animal.skills
    .map(es => {
      const skill = getSkillTemplate(es.skillId);
      if (!skill) return null;
      const skillMultiplier = 1 + (es.level - 1) * 0.15;

      let finalDamage = Math.floor(skill.damage * skillMultiplier);
      let finalCooldown = skill.cooldown;
      let finalEffect = skill.effect ? { ...skill.effect } : undefined;
      let finalStatusEffect = skill.statusEffect ? { ...skill.statusEffect } : undefined;
      let branchName: string | undefined;
      let branchPassive: PassiveEffect | undefined;

      if (es.modifications) {
        if (es.modifications.damageBonus) {
          finalDamage = Math.floor(finalDamage * (1 + es.modifications.damageBonus / 100));
        }
        if (es.modifications.cooldownReduction) {
          finalCooldown = Math.max(1, finalCooldown - es.modifications.cooldownReduction);
        }
        if (es.modifications.addStatusEffect) {
          finalStatusEffect = { ...es.modifications.addStatusEffect };
        } else if (es.modifications.statusEffectChanceBonus && finalStatusEffect) {
          finalStatusEffect = {
            ...finalStatusEffect,
            chance: Math.min(100, finalStatusEffect.chance + es.modifications.statusEffectChanceBonus),
          };
        }
      }

      if (es.branchId && skill.branches) {
        const branch = skill.branches.find(b => b.id === es.branchId);
        if (branch) {
          branchName = branch.name;
          if (branch.damageModifier) {
            finalDamage = Math.floor(finalDamage * branch.damageModifier);
          }
          if (branch.cooldownModifier) {
            finalCooldown = finalCooldown + branch.cooldownModifier;
          }
          if (branch.effectOverride) {
            finalEffect = { ...finalEffect, ...branch.effectOverride };
          }
          if (branch.statusEffectOverride) {
            finalStatusEffect = { ...branch.statusEffectOverride };
          }
          if (branch.passive) {
            branchPassive = branch.passive;
            allPassives.push(branch.passive);
          }
        }
      }

      if (skill.passive) {
        allPassives.push(skill.passive);
      }

      if (skill.comboTriggers) {
        allComboTriggers.push(...skill.comboTriggers);
      }

      return {
        skillId: skill.id,
        name: branchName ? `${skill.name}·${branchName}` : skill.name,
        type: skill.type,
        damage: finalDamage,
        cooldown: finalCooldown,
        currentCooldown: 0,
        emoji: skill.emoji,
        element: skill.element,
        effect: finalEffect,
        statusEffect: finalStatusEffect,
        branchId: es.branchId,
        passive: branchPassive,
        comboTriggers: skill.comboTriggers,
      } as BattleSkill;
    })
    .filter(Boolean) as BattleSkill[];

  if (skills.length === 0) {
    const basicSkill = getSkillTemplate('skill_bite');
    if (basicSkill) {
      skills.push({
        skillId: basicSkill.id,
        name: basicSkill.name,
        type: basicSkill.type,
        damage: basicSkill.damage,
        cooldown: basicSkill.cooldown,
        currentCooldown: 0,
        emoji: basicSkill.emoji,
        comboTriggers: basicSkill.comboTriggers,
      });
    }
  }

  const activeSetBonuses = getActiveSetBonuses(animal.parts);
  let setCritBonus = 0;
  for (const entry of activeSetBonuses) {
    setCritBonus += entry.bonus.stats.crit || 0;
  }

  return {
    id: generateId('unit'),
    animalId: animal.id,
    name: template?.name || animal.name,
    emoji: template?.emoji || '❓',
    element: template?.element || 'dark',
    maxHp: stats.hp,
    currentHp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    skills,
    isAlive: true,
    side,
    position,
    formationPosition,
    targetStrategy,
    buffs: setCritBonus > 0 ? [{ stat: 'crit', value: setCritBonus, remainingTurns: -1 }] : [],
    statusEffects: [],
    comboCount: 0,
    isSkipTurn: false,
    passives: allPassives,
    activatedCombos: [],
    triggeredPassives: [],
    activeSetBonuses: activeSetBonuses.map(e => ({ setId: e.setId, bonus: e.bonus })),
  };
};

export const createEnemyAnimal = (templateId: string, level: number, rarity: number): Animal => {
  const template = getAnimalTemplate(templateId);
  if (!template) {
    throw new Error(`Animal template not found: ${templateId}`);
  }

  return {
    id: generateId('enemy'),
    templateId,
    name: template.name,
    level,
    starLevel: 1 as StarLevel,
    breakthroughTier: 0 as BreakthroughTier,
    exp: 0,
    expToNext: 100 * level,
    rarity: rarity as 1 | 2 | 3 | 4 | 5,
    parts: [],
    skills: [
      { skillId: 'skill_bite', level: 1 },
      { skillId: 'skill_claw', level: 1 },
    ],
  };
};

export const generateEnemyTeam = (playerAvgLevel: number, dynamicContext?: DynamicOpponentContext, opponentDifficultyOverride?: 'easy' | 'normal' | 'hard') => {
  if (dynamicContext) {
    const result = generateDynamicEnemyTeam(dynamicContext, opponentDifficultyOverride);
    return {
      opponent: result.opponent,
      animals: result.animals,
      effectiveDifficulty: result.effectiveDifficulty,
      rewardMultiplier: result.rewardMultiplier,
    };
  }

  const difficulty = playerAvgLevel < 3 ? 'easy' : playerAvgLevel < 6 ? 'normal' : 'hard';
  const opponent = getRandomOpponent(difficulty);

  const minLevel = Math.max(1, playerAvgLevel + opponent.levelRange[0] - 3);
  const maxLevel = Math.max(minLevel + 1, playerAvgLevel + opponent.levelRange[1] - 3);

  const animals: Animal[] = opponent.animalTemplates.map(templateId => {
    const level = randomInt(minLevel, maxLevel);
    const rarity = chance(30) ? 2 : 1;
    return createEnemyAnimal(templateId, level, rarity);
  });

  return {
    opponent,
    animals,
    effectiveDifficulty: undefined as DynamicDifficultyTier | undefined,
    rewardMultiplier: undefined as number | undefined,
  };
};

export const getActionOrder = (
  units: BattleUnit[],
  actionPriority: ActionPriority = 'speedFirst'
): BattleUnit[] => {
  const alive = [...units].filter(u => u.isAlive);

  if (actionPriority === 'aggressive') {
    return alive.sort((a, b) => {
      const isAttackA = a.skills.some(s => (s.type === 'attack' || s.type === 'special') && s.currentCooldown === 0);
      const isAttackB = b.skills.some(s => (s.type === 'attack' || s.type === 'special') && s.currentCooldown === 0);
      if (isAttackA && !isAttackB) return -1;
      if (!isAttackA && isAttackB) return 1;
      const spdA = getEffectiveUnitSpd(a);
      const spdB = getEffectiveUnitSpd(b);
      return spdB - spdA;
    });
  }

  if (actionPriority === 'strategic') {
    return alive.sort((a, b) => {
      const priorityA = getStrategicPriority(a);
      const priorityB = getStrategicPriority(b);
      if (priorityA !== priorityB) return priorityB - priorityA;
      const spdA = getEffectiveUnitSpd(a);
      const spdB = getEffectiveUnitSpd(b);
      return spdB - spdA;
    });
  }

  return alive.sort((a, b) => {
    const spdA = getEffectiveUnitSpd(a);
    const spdB = getEffectiveUnitSpd(b);
    return spdB - spdA;
  });
};

const getEffectiveUnitSpd = (unit: BattleUnit): number => {
  const spdMod = unit.statusEffects.reduce((sum, se) => {
    const config = STATUS_EFFECT_CONFIG[se.type];
    return sum + (config?.statModifier?.stat === 'spd' ? config.statModifier.value : 0);
  }, 0);
  const buffMod = unit.buffs.filter(b => b.stat === 'spd').reduce((s, b) => s + b.value, 0);
  return unit.spd * (1 + (buffMod + spdMod) / 100);
};

const getStrategicPriority = (unit: BattleUnit): number => {
  let priority = 0;
  if (unit.skills.some(s => s.type === 'buff' && s.currentCooldown === 0)) priority += 3;
  if (unit.skills.some(s => s.type === 'debuff' && s.currentCooldown === 0)) priority += 2;
  if (unit.currentHp / unit.maxHp < 0.4 && unit.skills.some(s => s.type === 'heal' && s.currentCooldown === 0)) priority += 4;
  if (unit.formationPosition === 'front') priority += 1;
  return priority;
};

export const selectSkillForUnit = (unit: BattleUnit): BattleSkill | null => {
  const availableSkills = unit.skills.filter(s => s.currentCooldown === 0);
  if (availableSkills.length === 0) return null;

  const attackSkills = availableSkills.filter(s => s.type === 'attack' || s.type === 'special');
  const buffSkills = availableSkills.filter(s => s.type === 'buff');
  const healSkills = availableSkills.filter(s => s.type === 'heal');
  const debuffSkills = availableSkills.filter(s => s.type === 'debuff');

  const hpPercent = unit.currentHp / unit.maxHp;

  if (hpPercent < 0.3 && healSkills.length > 0 && chance(60)) {
    return pickRandom(healSkills);
  }

  if (buffSkills.length > 0 && !unit.buffs.some(b => b.stat === 'atk') && chance(30)) {
    return pickRandom(buffSkills);
  }

  if (debuffSkills.length > 0 && chance(25)) {
    return pickRandom(debuffSkills);
  }

  if (attackSkills.length > 0) {
    return pickRandom(attackSkills);
  }

  return pickRandom(availableSkills);
};

export const selectTarget = (
  attacker: BattleUnit,
  playerUnits: BattleUnit[],
  enemyUnits: BattleUnit[],
  skill: BattleSkill | null
): BattleUnit | BattleUnit[] | undefined => {
  const enemies = attacker.side === 'player' ? enemyUnits : playerUnits;
  const allies = attacker.side === 'player' ? playerUnits : enemyUnits;

  if (skill?.type === 'heal') {
    return getLowestHpTarget(allies);
  }

  if (skill?.type === 'buff') {
    return attacker;
  }

  if (skill?.effect?.aoe) {
    return getAliveUnits(enemies);
  }

  const strategy = attacker.targetStrategy;

  if (strategy === 'lowestHp') {
    return getLowestHpTarget(enemies);
  }
  if (strategy === 'highestAtk') {
    return getHighestAtkTarget(enemies);
  }
  if (strategy === 'weakest') {
    return getWeakestDefTarget(enemies);
  }
  if (strategy === 'highestThreat') {
    return getHighestThreatTarget(enemies);
  }

  return getRandomTarget(enemies);
};

export const processStatusEffects = (
  units: BattleUnit[]
): BattleLogEntry[] => {
  const logs: BattleLogEntry[] = [];

  units.forEach(unit => {
    if (!unit.isAlive) return;

    unit.statusEffects.forEach(se => {
      const config = STATUS_EFFECT_CONFIG[se.type];
      const afterTurns = se.remainingTurns - 1;

      if (se.damage > 0) {
        unit.currentHp = Math.max(0, unit.currentHp - se.damage);
        logs.push({
          id: generateId('log'),
          timestamp: Date.now(),
          type: 'statusTick',
          targetId: unit.id,
          targetName: unit.name,
          value: se.damage,
          statusType: se.type,
          statusRemainingTurns: afterTurns,
          statusEffectData: {
            type: se.type,
            remainingTurns: afterTurns,
            damage: se.damage,
            sourceId: se.sourceId,
            skipTurnChance: config.skipTurnChance,
            statModifier: config.statModifier ? { ...config.statModifier } : undefined,
          },
          message: `${config.emoji} ${unit.name} 受到${config.name}伤害 ${se.damage}！`,
        });

        if (unit.currentHp <= 0) {
          unit.isAlive = false;
          logs.push({
            timestamp: Date.now(),
            type: 'death',
            targetId: unit.id,
            targetName: unit.name,
            message: `💀 ${unit.name} 被击败了！`,
          });
        }
      } else {
        logs.push({
          id: generateId('log'),
          timestamp: Date.now(),
          type: 'statusTick',
          targetId: unit.id,
          targetName: unit.name,
          value: 0,
          statusType: se.type,
          statusRemainingTurns: afterTurns,
          statusEffectData: {
            type: se.type,
            remainingTurns: afterTurns,
            damage: se.damage,
            sourceId: se.sourceId,
            skipTurnChance: config.skipTurnChance,
            statModifier: config.statModifier ? { ...config.statModifier } : undefined,
          },
          message: afterTurns > 0
            ? `${config.emoji} ${unit.name} 的${config.name}效果持续中（剩余${afterTurns}回合）`
            : `${config.emoji} ${unit.name} 的${config.name}效果已消退`,
        });
      }
    });

    unit.statusEffects = unit.statusEffects
      .map(se => ({ ...se, remainingTurns: se.remainingTurns - 1 }))
      .filter(se => se.remainingTurns > 0);
  });

  return logs;
};

export const checkSkipTurn = (unit: BattleUnit): boolean => {
  for (const se of unit.statusEffects) {
    const config = STATUS_EFFECT_CONFIG[se.type];
    if (config.skipTurnChance > 0 && chance(config.skipTurnChance)) {
      return true;
    }
  }
  return false;
};

export const processPassives = (
  unit: BattleUnit,
  trigger: PassiveEffect['trigger'],
  playerUnits: BattleUnit[],
  enemyUnits: BattleUnit[],
  context?: PassiveContext
): { logs: BattleLogEntry[]; extraTurn: boolean } => {
  const logs: BattleLogEntry[] = [];
  let extraTurn = false;
  if (!unit.isAlive) return { logs, extraTurn };

  const allUnits = [...playerUnits, ...enemyUnits];
  const allies = allUnits.filter(u => u.side === unit.side && u.isAlive);
  const isBuffPhase = context?.buffPhase === true;
  const isReactPhase = context?.buffPhase === false;

  for (const passive of unit.passives) {
    if (passive.trigger !== trigger) continue;

    if (trigger === 'onAttack') {
      if (isBuffPhase && (passive.healPercent || passive.statusEffectApply || passive.extraTurnChance)) continue;
      if (isReactPhase && (passive.statBonus || passive.damageBonus || passive.critBonus)) continue;
    }

    if (passive.hpThreshold) {
      const hpPercent = (unit.currentHp / unit.maxHp) * 100;
      if (hpPercent > passive.hpThreshold) continue;
      if (unit.triggeredPassives.includes(passive.id)) continue;
      unit.triggeredPassives.push(passive.id);
    }

    const triggerRoll = passive.triggerChance ?? 100;
    if (!chance(triggerRoll)) continue;

    if (passive.statBonus) {
      const existingBuff = unit.buffs.find(b => b.stat === passive.statBonus!.stat);
      if (existingBuff) {
        existingBuff.value = Math.max(existingBuff.value, passive.statBonus.value);
        existingBuff.remainingTurns = Math.max(existingBuff.remainingTurns, 2);
      } else {
        unit.buffs.push({
          stat: passive.statBonus.stat,
          value: passive.statBonus.value,
          remainingTurns: 2,
        });
      }
      if (trigger !== 'onAttack') {
        logs.push({
          timestamp: Date.now(),
          type: 'passive',
          sourceId: unit.id,
          sourceName: unit.name,
          targetId: unit.id,
          targetName: unit.name,
          passiveId: passive.id,
          passiveName: passive.name,
          message: `${passive.emoji} ${unit.name} 的被动【${passive.name}】触发！${passive.statBonus.stat.toUpperCase()} +${passive.statBonus.value}%！`,
        });
      }
    }

    if (passive.healPercent) {
      let healAmount: number;
      if (trigger === 'onAttack' && isReactPhase && context?.damage) {
        healAmount = Math.floor(context.damage * (passive.healPercent / 100));
      } else {
        healAmount = Math.floor(unit.maxHp * (passive.healPercent / 100));
      }
      healAmount = Math.max(1, healAmount);
      unit.currentHp = Math.min(unit.maxHp, unit.currentHp + healAmount);
      logs.push({
        timestamp: Date.now(),
        type: 'passive',
        sourceId: unit.id,
        sourceName: unit.name,
        targetId: unit.id,
        targetName: unit.name,
        value: healAmount,
        passiveId: passive.id,
        passiveName: passive.name,
        message: `${passive.emoji} ${unit.name} 的被动【${passive.name}】触发！恢复了 ${healAmount} 点生命！`,
      });
    }

    if (passive.damageBonus) {
      if (trigger === 'onHit' && context?.attacker && context.damage) {
        const reflectDamage = Math.floor(context.damage * passive.damageBonus / 100);
        if (reflectDamage > 0 && context.attacker.isAlive) {
          context.attacker.currentHp = Math.max(0, context.attacker.currentHp - reflectDamage);
          logs.push({
            timestamp: Date.now(),
            type: 'passive',
            sourceId: unit.id,
            sourceName: unit.name,
            targetId: context.attacker.id,
            targetName: context.attacker.name,
            value: reflectDamage,
            passiveId: passive.id,
            passiveName: passive.name,
            message: `${passive.emoji} ${unit.name} 的被动【${passive.name}】触发！反弹 ${reflectDamage} 点伤害给 ${context.attacker.name}！`,
          });
          if (context.attacker.currentHp <= 0) {
            context.attacker.isAlive = false;
            logs.push({
              timestamp: Date.now(),
              type: 'death',
              sourceId: unit.id,
              sourceName: unit.name,
              targetId: context.attacker.id,
              targetName: context.attacker.name,
              message: `💀 ${context.attacker.name} 被击败了！`,
            });
          }
        }
      } else if (trigger !== 'onHit') {
        const existingAtkBuff = unit.buffs.find(b => b.stat === 'atk');
        if (existingAtkBuff) {
          existingAtkBuff.value += passive.damageBonus;
        } else {
          unit.buffs.push({
            stat: 'atk',
            value: passive.damageBonus,
            remainingTurns: 2,
          });
        }
        if (trigger !== 'onAttack') {
          logs.push({
            timestamp: Date.now(),
            type: 'passive',
            sourceId: unit.id,
            sourceName: unit.name,
            targetId: unit.id,
            targetName: unit.name,
            passiveId: passive.id,
            passiveName: passive.name,
            message: `${passive.emoji} ${unit.name} 的被动【${passive.name}】触发！攻击力 +${passive.damageBonus}%！`,
          });
        }
      }
    }

    if (passive.critBonus) {
      const existingCritBuff = unit.buffs.find(b => b.stat === 'crit');
      if (existingCritBuff) {
        existingCritBuff.value = Math.max(existingCritBuff.value, passive.critBonus);
        existingCritBuff.remainingTurns = Math.max(existingCritBuff.remainingTurns, 2);
      } else {
        unit.buffs.push({
          stat: 'crit',
          value: passive.critBonus,
          remainingTurns: 2,
        });
      }
      if (trigger !== 'onAttack') {
        logs.push({
          timestamp: Date.now(),
          type: 'passive',
          sourceId: unit.id,
          sourceName: unit.name,
          targetId: unit.id,
          targetName: unit.name,
          passiveId: passive.id,
          passiveName: passive.name,
          message: `${passive.emoji} ${unit.name} 的被动【${passive.name}】触发！暴击率 +${passive.critBonus}%！`,
        });
      }
    }

    if (passive.statusEffectApply) {
      const enemies = allUnits.filter(u => u.side !== unit.side && u.isAlive);
      const seTarget = getLowestHpTarget(enemies);
      if (seTarget && chance(passive.statusEffectApply.chance)) {
        const existing = seTarget.statusEffects.find(se => se.type === passive.statusEffectApply!.type);
        if (existing) {
          existing.remainingTurns = Math.max(existing.remainingTurns, passive.statusEffectApply!.duration);
        } else {
          seTarget.statusEffects.push({
            type: passive.statusEffectApply!.type,
            remainingTurns: passive.statusEffectApply!.duration,
            damage: passive.statusEffectApply!.damage || 0,
            sourceId: unit.id,
          });
        }
        const seConfig = STATUS_EFFECT_CONFIG[passive.statusEffectApply.type];
        logs.push({
          timestamp: Date.now(),
          type: 'passive',
          sourceId: unit.id,
          sourceName: unit.name,
          targetId: seTarget.id,
          targetName: seTarget.name,
          passiveId: passive.id,
          passiveName: passive.name,
          message: `${passive.emoji} ${unit.name} 的被动【${passive.name}】触发！对 ${seTarget.name} 施加了${seConfig.name}！`,
        });
      }
    } else if (trigger === 'onStatusApply' && context?.statusApplied) {
      const enemies = allUnits.filter(u => u.side !== unit.side && u.isAlive);
      const alreadyTargetedIds = allUnits
        .filter(u => u.statusEffects.some(se => se.sourceId === unit.id && se.type === context.statusApplied!.type))
        .map(u => u.id);
      const otherEnemies = enemies.filter(e => !alreadyTargetedIds.includes(e.id));
      const seTarget = otherEnemies.length > 0
        ? getLowestHpTarget(otherEnemies)
        : null;

      if (seTarget) {
        const sa = context.statusApplied;
        if (chance(sa.chance)) {
          const existing = seTarget.statusEffects.find(se => se.type === sa.type);
          if (existing) {
            existing.remainingTurns = Math.max(existing.remainingTurns, sa.duration);
          } else {
            seTarget.statusEffects.push({
              type: sa.type,
              remainingTurns: sa.duration,
              damage: sa.damage || 0,
              sourceId: unit.id,
            });
          }
          const seConfig = STATUS_EFFECT_CONFIG[sa.type];
          logs.push({
            timestamp: Date.now(),
            type: 'passive',
            sourceId: unit.id,
            sourceName: unit.name,
            targetId: seTarget.id,
            targetName: seTarget.name,
            passiveId: passive.id,
            passiveName: passive.name,
            message: `${passive.emoji} ${unit.name} 的被动【${passive.name}】触发！${seTarget.name} 也被施加了${seConfig.name}！`,
          });
        }
      }
    }

    if (passive.extraTurnChance) {
      if (chance(passive.extraTurnChance)) {
        extraTurn = true;
        logs.push({
          timestamp: Date.now(),
          type: 'passive',
          sourceId: unit.id,
          sourceName: unit.name,
          passiveId: passive.id,
          passiveName: passive.name,
          message: `${passive.emoji} ${unit.name} 的被动【${passive.name}】触发！获得额外行动机会！`,
        });
      }
    }

    if (!passive.healPercent && !passive.damageBonus && !passive.critBonus && !passive.statusEffectApply
      && !(trigger === 'onStatusApply' && context?.statusApplied) && !passive.statBonus && !passive.extraTurnChance) {
      logs.push({
        timestamp: Date.now(),
        type: 'passive',
        sourceId: unit.id,
        sourceName: unit.name,
        passiveId: passive.id,
        passiveName: passive.name,
        message: `${passive.emoji} ${unit.name} 的被动【${passive.name}】触发！${passive.description}`,
      });
    }
  }

  return { logs, extraTurn };
};

export const checkComboTriggers = (
  attacker: BattleUnit,
  skill: BattleSkill,
  playerUnits: BattleUnit[],
  enemyUnits: BattleUnit[]
): BattleLogEntry[] => {
  const logs: BattleLogEntry[] = [];
  const allUnits = [...playerUnits, ...enemyUnits];
  const allies = allUnits.filter(u => u.side === attacker.side && u.isAlive && u.id !== attacker.id);
  const allySkillIds = allies.flatMap(u => u.skills.map(s => s.skillId));

  const comboTriggersToCheck: ComboTrigger[] = [];

  if (skill.comboTriggers) {
    comboTriggersToCheck.push(...skill.comboTriggers);
  }

  for (const ally of allies) {
    for (const allySkill of ally.skills) {
      if (allySkill.comboTriggers) {
        comboTriggersToCheck.push(...allySkill.comboTriggers);
      }
    }
  }

  const seenIds = new Set<string>();
  for (const combo of comboTriggersToCheck) {
    if (seenIds.has(combo.id)) continue;
    seenIds.add(combo.id);

    if (attacker.activatedCombos.includes(combo.id)) continue;

    let triggered = false;

    if (combo.condition === 'specificSkill' && combo.requiredSkillIds) {
      triggered = combo.requiredSkillIds.some(id => allySkillIds.includes(id));
    } else if (combo.condition === 'sameElement') {
      triggered = allies.some(ally =>
        ally.skills.some(s => s.element === skill.element && s.element !== undefined)
      );
    } else if (combo.condition === 'sameType') {
      triggered = allies.some(ally =>
        ally.skills.some(s => s.type === skill.type && s.currentCooldown === 0)
      );
    } else if (combo.condition === 'consecutiveUse') {
      triggered = attacker.comboCount >= 2;
    }

    if (triggered) {
      attacker.activatedCombos.push(combo.id);

      const bonusDmg = combo.bonusDamage + (combo.bonusDamagePerHit ? combo.bonusDamagePerHit * attacker.comboCount : 0);
      const enemies = allUnits.filter(u => u.side !== attacker.side && u.isAlive);
      const target = getLowestHpTarget(enemies);

      if (target && bonusDmg > 0) {
        target.currentHp = Math.max(0, target.currentHp - bonusDmg);
        logs.push({
          timestamp: Date.now(),
          type: 'comboTrigger',
          sourceId: attacker.id,
          sourceName: attacker.name,
          targetId: target.id,
          targetName: target.name,
          value: bonusDmg,
          comboTriggerId: combo.id,
          comboTriggerName: combo.name,
          message: `${combo.emoji} 组合技【${combo.name}】触发！${target.name} 受到 ${bonusDmg} 点额外伤害！`,
        });

        if (target.currentHp <= 0) {
          target.isAlive = false;
          logs.push({
            timestamp: Date.now(),
            type: 'death',
            sourceId: attacker.id,
            sourceName: attacker.name,
            targetId: target.id,
            targetName: target.name,
            message: `💀 ${target.name} 被击败了！`,
          });
        }
      } else {
        logs.push({
          timestamp: Date.now(),
          type: 'comboTrigger',
          sourceId: attacker.id,
          sourceName: attacker.name,
          comboTriggerId: combo.id,
          comboTriggerName: combo.name,
          message: `${combo.emoji} 组合技【${combo.name}】触发！${combo.description}`,
        });
      }

      if (combo.triggerStatusEffect) {
        const enemies = allUnits.filter(u => u.side !== attacker.side && u.isAlive);
        const seTarget = getLowestHpTarget(enemies);
        if (seTarget && chance(combo.triggerStatusEffect.chance)) {
          const existing = seTarget.statusEffects.find(se => se.type === combo.triggerStatusEffect!.type);
          if (existing) {
            existing.remainingTurns = Math.max(existing.remainingTurns, combo.triggerStatusEffect!.duration);
          } else {
            seTarget.statusEffects.push({
              type: combo.triggerStatusEffect!.type,
              remainingTurns: combo.triggerStatusEffect!.duration,
              damage: combo.triggerStatusEffect!.damage || 0,
              sourceId: attacker.id,
            });
          }
          const seConfig = STATUS_EFFECT_CONFIG[combo.triggerStatusEffect.type];
          logs.push({
            timestamp: Date.now(),
            type: 'statusApply',
            sourceId: attacker.id,
            sourceName: attacker.name,
            targetId: seTarget.id,
            targetName: seTarget.name,
            statusType: combo.triggerStatusEffect.type,
            message: `${seConfig.emoji} ${seTarget.name} 被组合技施加了${seConfig.name}！持续${combo.triggerStatusEffect.duration}回合`,
          });
        }
      }

      if (combo.teamBuff) {
        const teamUnits = allUnits.filter(u => u.side === attacker.side && u.isAlive);
        for (const teamUnit of teamUnits) {
          const existingBuff = teamUnit.buffs.find(b => b.stat === combo.teamBuff!.stat);
          if (existingBuff) {
            existingBuff.value = Math.max(existingBuff.value, combo.teamBuff.value);
            existingBuff.remainingTurns = Math.max(existingBuff.remainingTurns, combo.teamBuff.duration);
          } else {
            teamUnit.buffs.push({
              stat: combo.teamBuff.stat,
              value: combo.teamBuff.value,
              remainingTurns: combo.teamBuff.duration,
            });
          }
        }
        logs.push({
          timestamp: Date.now(),
          type: 'comboTrigger',
          sourceId: attacker.id,
          sourceName: attacker.name,
          comboTriggerId: combo.id,
          comboTriggerName: combo.name,
          message: `${combo.emoji} 组合技【${combo.name}】触发！全队${combo.teamBuff.stat.toUpperCase()} +${combo.teamBuff.value}%！`,
        });
      }
    }
  }

  return logs;
};

export const tryApplyStatusEffect = (
  attacker: BattleUnit,
  target: BattleUnit,
  skill: BattleSkill
): BattleLogEntry | null => {
  if (!skill.statusEffect) return null;

  const { type, chance: applyChance, duration, damage } = skill.statusEffect;
  if (!chance(applyChance)) return null;

  const actualDamage = damage || STATUS_EFFECT_CONFIG[type].baseDamage;
  const actualDuration = duration;
  const config = STATUS_EFFECT_CONFIG[type];

  const existing = target.statusEffects.find(se => se.type === type);
  if (existing) {
    existing.remainingTurns = Math.max(existing.remainingTurns, actualDuration);
    existing.damage = actualDamage;
  } else {
    target.statusEffects.push({
      type,
      remainingTurns: actualDuration,
      damage: actualDamage,
      sourceId: attacker.id,
    });
  }

  if (config.statModifier) {
    const existingBuff = target.buffs.find(b => b.stat === config.statModifier!.stat);
    if (existingBuff) {
      existingBuff.value = Math.min(existingBuff.value, config.statModifier.value);
      existingBuff.remainingTurns = Math.max(existingBuff.remainingTurns, actualDuration);
    } else {
      target.buffs.push({
        stat: config.statModifier.stat,
        value: config.statModifier.value,
        remainingTurns: actualDuration,
      });
    }
  }

  const payload: StatusEffectPayload = {
    type,
    remainingTurns: actualDuration,
    damage: actualDamage,
    sourceId: attacker.id,
    skipTurnChance: config.skipTurnChance,
    statModifier: config.statModifier ? { ...config.statModifier } : undefined,
  };

  return {
    timestamp: Date.now(),
    type: 'statusApply',
    sourceId: attacker.id,
    sourceName: attacker.name,
    targetId: target.id,
    targetName: target.name,
    statusType: type,
    statusEffectData: payload,
    message: `${config.emoji} ${target.name} 被施加了${config.name}！持续${actualDuration}回合`,
  };
};

export const executeSkill = (
  attacker: BattleUnit,
  target: BattleUnit | BattleUnit[],
  skill: BattleSkill,
  playerUnits: BattleUnit[],
  enemyUnits: BattleUnit[]
): ActionResult => {
  const logs: BattleLogEntry[] = [];
  const targets = Array.isArray(target) ? target : [target];
  const targetResults: TargetResult[] = [];

  skill.currentCooldown = skill.cooldown;

  const allUnits = [...playerUnits, ...enemyUnits];
  const sameSideUnits = allUnits.filter(u => u.side === attacker.side && u.isAlive && u.id !== attacker.id);
  const anyCombo = sameSideUnits.some(u => u.comboCount > 0);
  if (anyCombo) {
    attacker.comboCount = Math.max(attacker.comboCount, 1);
  }
  attacker.comboCount++;

  const comboMultiplier = Math.min(
    1 + (attacker.comboCount - 1) * BATTLE_CONSTANTS.COMBO_DAMAGE_BONUS_PER_HIT,
    BATTLE_CONSTANTS.COMBO_MAX_MULTIPLIER
  );

  logs.push({
    id: generateId('log'),
    timestamp: Date.now(),
    type: 'skill',
    sourceId: attacker.id,
    sourceName: attacker.name,
    skillId: skill.skillId,
    skillName: skill.name,
    element: skill.element,
    comboCount: attacker.comboCount > 1 ? attacker.comboCount : undefined,
    comboMultiplier: attacker.comboCount > 1 ? comboMultiplier : undefined,
    skillCooldown: skill.cooldown,
    message: attacker.comboCount > 1
      ? `${attacker.name} 使用了 ${skill.emoji} ${skill.name}！🔥 ${attacker.comboCount}连击！`
      : `${attacker.name} 使用了 ${skill.emoji} ${skill.name}！`,
  });

  if (attacker.comboCount > 1) {
    logs.push({
      timestamp: Date.now(),
      type: 'combo',
      sourceId: attacker.id,
      sourceName: attacker.name,
      comboCount: attacker.comboCount,
      comboMultiplier,
      message: `🔥 ${attacker.comboCount}连击！伤害加成 +${Math.floor((attacker.comboCount - 1) * BATTLE_CONSTANTS.COMBO_DAMAGE_BONUS_PER_HIT * 100)}%`,
    });
  }

  targets.forEach(t => {
    if (!t.isAlive) return;

    const tr: TargetResult = {
      targetId: t.id,
      damage: 0,
      isCrit: false,
      killed: false,
    };

    if (skill.type === 'heal') {
      const healAmount = calculateHeal(attacker, t, skill.effect?.healPercent || 20);
      t.currentHp = Math.min(t.maxHp, t.currentHp + healAmount);
      logs.push({
        timestamp: Date.now(),
        type: 'heal',
        sourceId: attacker.id,
        sourceName: attacker.name,
        targetId: t.id,
        targetName: t.name,
        value: healAmount,
        message: `${t.name} 恢复了 ${healAmount} 点生命值！`,
      });
    } else if (skill.type === 'buff') {
      if (skill.effect?.stat && skill.effect?.value !== undefined) {
        const buffDuration = skill.effect.duration || 2;
        t.buffs = t.buffs.filter(b => b.stat !== skill.effect!.stat);
        t.buffs.push({
          stat: skill.effect.stat,
          value: skill.effect.value,
          remainingTurns: buffDuration,
        });
        const buffPayload: BuffPayload = {
          stat: skill.effect.stat,
          value: skill.effect.value,
          remainingTurns: buffDuration,
        };
        logs.push({
          timestamp: Date.now(),
          type: 'buff',
          sourceId: attacker.id,
          sourceName: attacker.name,
          targetId: t.id,
          targetName: t.name,
          value: skill.effect.value,
          buffData: buffPayload,
          message: `${t.name} 获得了 ${skill.effect.stat.toUpperCase()} +${skill.effect.value}% 增益！`,
        });
      }
    } else if (skill.type === 'debuff') {
      if (skill.effect?.stat && skill.effect?.value !== undefined) {
        const debuffDuration = skill.effect.duration || 2;
        t.buffs = t.buffs.filter(b => b.stat !== skill.effect!.stat);
        t.buffs.push({
          stat: skill.effect.stat,
          value: skill.effect.value,
          remainingTurns: debuffDuration,
        });
        const debuffPayload: BuffPayload = {
          stat: skill.effect.stat,
          value: skill.effect.value,
          remainingTurns: debuffDuration,
        };
        logs.push({
          timestamp: Date.now(),
          type: 'debuff',
          sourceId: attacker.id,
          sourceName: attacker.name,
          targetId: t.id,
          targetName: t.name,
          value: skill.effect.value,
          buffData: debuffPayload,
          message: `${t.name} 受到 ${skill.effect.stat.toUpperCase()} ${skill.effect.value}% 减益！`,
        });
      }
      if (skill.damage > 0) {
        const dmgResult = calculateDamage(attacker, t, skill.damage, skill.element);
        t.currentHp = Math.max(0, t.currentHp - dmgResult.damage);
        tr.damage = dmgResult.damage;
        tr.isCrit = dmgResult.isCrit;

        if (dmgResult.isElementAdvantage) {
          logs.push({
            timestamp: Date.now(),
            type: 'elementAdvantage',
            sourceId: attacker.id,
            sourceName: attacker.name,
            targetId: t.id,
            targetName: t.name,
            element: skill.element || attacker.element,
            attackerElement: skill.element || attacker.element,
            defenderElement: t.element,
            isElementAdvantage: true,
            message: `✦ 属性克制！${ELEMENT_EMOJIS[skill.element || attacker.element]}${ELEMENT_NAMES[skill.element || attacker.element]}克制${ELEMENT_NAMES[t.element]}！伤害 ×${BATTLE_CONSTANTS.ELEMENT_ADVANTAGE_MULTIPLIER}`,
          });
        }

        logs.push({
          timestamp: Date.now(),
          type: dmgResult.isCrit ? 'crit' : 'damage',
          sourceId: attacker.id,
          sourceName: attacker.name,
          targetId: t.id,
          targetName: t.name,
          value: dmgResult.damage,
          isCrit: dmgResult.isCrit,
          isElementAdvantage: dmgResult.isElementAdvantage,
          comboCount: attacker.comboCount > 1 ? attacker.comboCount : undefined,
          comboMultiplier: attacker.comboCount > 1 ? comboMultiplier : undefined,
          message: dmgResult.isCrit
            ? `💥 暴击！${t.name} 受到 ${dmgResult.damage} 点伤害！`
            : `${t.name} 受到 ${dmgResult.damage} 点伤害！`,
        });
      }

      const statusLog = tryApplyStatusEffect(attacker, t, skill);
      if (statusLog) {
        logs.push(statusLog);
        if (skill.statusEffect) {
          tr.statusApplied = { ...skill.statusEffect };
        }
      }
    } else {
      const dmgResult = calculateDamage(attacker, t, skill.damage, skill.element);
      t.currentHp = Math.max(0, t.currentHp - dmgResult.damage);
      tr.damage = dmgResult.damage;
      tr.isCrit = dmgResult.isCrit;

      if (dmgResult.isElementAdvantage) {
        logs.push({
          timestamp: Date.now(),
          type: 'elementAdvantage',
          sourceId: attacker.id,
          sourceName: attacker.name,
          targetId: t.id,
          targetName: t.name,
          element: skill.element || attacker.element,
          attackerElement: skill.element || attacker.element,
          defenderElement: t.element,
          isElementAdvantage: true,
          message: `✦ 属性克制！${ELEMENT_EMOJIS[skill.element || attacker.element]}${ELEMENT_NAMES[skill.element || attacker.element]}克制${ELEMENT_NAMES[t.element]}！伤害 ×${BATTLE_CONSTANTS.ELEMENT_ADVANTAGE_MULTIPLIER}`,
        });
      }

      logs.push({
        timestamp: Date.now(),
        type: dmgResult.isCrit ? 'crit' : 'damage',
        sourceId: attacker.id,
        sourceName: attacker.name,
        targetId: t.id,
        targetName: t.name,
        value: dmgResult.damage,
        isCrit: dmgResult.isCrit,
        isElementAdvantage: dmgResult.isElementAdvantage,
        comboCount: attacker.comboCount > 1 ? attacker.comboCount : undefined,
        comboMultiplier: attacker.comboCount > 1 ? comboMultiplier : undefined,
        message: dmgResult.isCrit
          ? `💥 暴击！${t.name} 受到 ${dmgResult.damage} 点伤害！`
          : `${t.name} 受到 ${dmgResult.damage} 点伤害！`,
      });

      const statusLog = tryApplyStatusEffect(attacker, t, skill);
      if (statusLog) {
        logs.push(statusLog);
        if (skill.statusEffect) {
          tr.statusApplied = { ...skill.statusEffect };
        }
      }
    }

    if (t.currentHp <= 0) {
      t.isAlive = false;
      tr.killed = true;
      logs.push({
        timestamp: Date.now(),
        type: 'death',
        sourceId: attacker.id,
        sourceName: attacker.name,
        targetId: t.id,
        targetName: t.name,
        message: `💀 ${t.name} 被击败了！`,
      });
    }

    targetResults.push(tr);
  });

  return { logs, targets: targetResults, skillUsed: skill };
};

export const executeBasicAttack = (
  attacker: BattleUnit,
  playerUnits: BattleUnit[],
  enemyUnits: BattleUnit[]
): ActionResult => {
  const logs: BattleLogEntry[] = [];
  const targetResults: TargetResult[] = [];
  const enemies = attacker.side === 'player' ? enemyUnits : playerUnits;
  const target = getLowestHpTarget(enemies);

  if (!target) return { logs, targets: [], skillUsed: null };

  attacker.comboCount++;

  const comboMultiplier = Math.min(
    1 + (attacker.comboCount - 1) * BATTLE_CONSTANTS.COMBO_DAMAGE_BONUS_PER_HIT,
    BATTLE_CONSTANTS.COMBO_MAX_MULTIPLIER
  );

  const dmgResult = calculateDamage(attacker, target, 0);
  target.currentHp = Math.max(0, target.currentHp - dmgResult.damage);

  const tr: TargetResult = {
    targetId: target.id,
    damage: dmgResult.damage,
    isCrit: dmgResult.isCrit,
    killed: false,
  };

  if (dmgResult.isElementAdvantage) {
    logs.push({
      timestamp: Date.now(),
      type: 'elementAdvantage',
      sourceId: attacker.id,
      sourceName: attacker.name,
      targetId: target.id,
      targetName: target.name,
      element: attacker.element,
      attackerElement: attacker.element,
      defenderElement: target.element,
      isElementAdvantage: true,
      message: `✦ 属性克制！${ELEMENT_EMOJIS[attacker.element]}${ELEMENT_NAMES[attacker.element]}克制${ELEMENT_NAMES[target.element]}！伤害 ×${BATTLE_CONSTANTS.ELEMENT_ADVANTAGE_MULTIPLIER}`,
    });
  }

  logs.push({
    timestamp: Date.now(),
    type: 'attack',
    sourceId: attacker.id,
    sourceName: attacker.name,
    targetId: target.id,
    targetName: target.name,
    value: dmgResult.damage,
    isCrit: dmgResult.isCrit,
    isElementAdvantage: dmgResult.isElementAdvantage,
    comboCount: attacker.comboCount > 1 ? attacker.comboCount : undefined,
    comboMultiplier: attacker.comboCount > 1 ? comboMultiplier : undefined,
    message: dmgResult.isCrit
      ? `💥 暴击！${attacker.name} 攻击 ${target.name}，造成 ${dmgResult.damage} 点伤害！`
      : `${attacker.name} 攻击 ${target.name}，造成 ${dmgResult.damage} 点伤害！`,
  });

  if (attacker.comboCount > 1) {
    logs.push({
      timestamp: Date.now(),
      type: 'combo',
      sourceId: attacker.id,
      sourceName: attacker.name,
      comboCount: attacker.comboCount,
      comboMultiplier,
      message: `🔥 ${attacker.comboCount}连击！伤害加成 +${Math.floor((attacker.comboCount - 1) * BATTLE_CONSTANTS.COMBO_DAMAGE_BONUS_PER_HIT * 100)}%`,
    });
  }

  if (target.currentHp <= 0) {
    target.isAlive = false;
    tr.killed = true;
    logs.push({
      timestamp: Date.now(),
      type: 'death',
      sourceId: attacker.id,
      sourceName: attacker.name,
      targetId: target.id,
      targetName: target.name,
      message: `💀 ${target.name} 被击败了！`,
    });
  }

  targetResults.push(tr);

  const basicSkill: BattleSkill = {
    skillId: 'basic_attack',
    name: '普通攻击',
    type: 'attack',
    damage: 0,
    cooldown: 0,
    currentCooldown: 0,
    emoji: '⚔️',
    element: attacker.element,
  };

  return { logs, targets: targetResults, skillUsed: basicSkill };
};

export const updateCooldowns = (units: BattleUnit[]): void => {
  units.forEach(unit => {
    unit.skills.forEach(skill => {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown--;
      }
    });
    unit.buffs = unit.buffs
      .map(b => ({ ...b, remainingTurns: b.remainingTurns === -1 ? -1 : b.remainingTurns - 1 }))
      .filter(b => b.remainingTurns === -1 || b.remainingTurns > 0);
  });
};

export const resetComboCounts = (units: BattleUnit[]): void => {
  units.forEach(unit => {
    unit.comboCount = 0;
    unit.activatedCombos = [];
  });
};

export const simulateFullBattle = (
  playerAnimals: Animal[],
  betAmount: number,
  lineupConfig?: LineupConfig,
  dynamicContext?: DynamicOpponentContext,
  opponentDifficultyOverride?: 'easy' | 'normal' | 'hard'
): {
  playerUnits: BattleUnit[];
  enemyUnits: BattleUnit[];
  initialPlayerUnits: BattleUnit[];
  initialEnemyUnits: BattleUnit[];
  battleLog: BattleLogEntry[];
  isWin: boolean;
  reward: number;
  opponentName: string;
  opponentAvatar: string;
  effectiveDifficulty?: DynamicDifficultyTier;
  rewardMultiplier?: number;
} => {
  const playerAvgLevel = Math.floor(
    playerAnimals.reduce((sum, a) => sum + a.level, 0) / playerAnimals.length
  );

  const { opponent, animals: enemyAnimals, effectiveDifficulty, rewardMultiplier } = generateEnemyTeam(playerAvgLevel, dynamicContext, opponentDifficultyOverride);

  const config = lineupConfig || { animals: [], actionPriority: 'speedFirst' as ActionPriority };

  const playerUnits = playerAnimals.map((animal, i) => {
    const animalConfig = config.animals.find(c => c.animalId === animal.id);
    const formationPos = animalConfig?.position || (i === 0 ? 'front' : i === 1 ? 'mid' : 'back') as FormationPosition;
    const targetStrat = animalConfig?.targetStrategy || 'lowestHp' as TargetStrategy;
    return createBattleUnit(animal, 'player', i, formationPos, targetStrat);
  });
  const enemyUnits = enemyAnimals.map((animal, i) =>
    createBattleUnit(animal, 'enemy', i, 'mid', 'lowestHp')
  );

  const initialPlayerUnits = JSON.parse(JSON.stringify(playerUnits));
  const initialEnemyUnits = JSON.parse(JSON.stringify(enemyUnits));

  const fullBattleLog: BattleLogEntry[] = [];
  let turn = 0;

  const processUnitAction = (unit: BattleUnit): boolean => {
    if (!unit.isAlive) return false;
    if (!isTeamAlive(playerUnits) || !isTeamAlive(enemyUnits)) return false;

    let extraTurn = false;

    const preBuffResult = processPassives(unit, 'onAttack', playerUnits, enemyUnits, { buffPhase: true });
    fullBattleLog.push(...preBuffResult.logs);

    const skill = selectSkillForUnit(unit);
    let actionResult: ActionResult;

    if (skill) {
      const target = selectTarget(unit, playerUnits, enemyUnits, skill);
      if (target) {
        actionResult = executeSkill(unit, target, skill, playerUnits, enemyUnits);
      } else {
        actionResult = executeBasicAttack(unit, playerUnits, enemyUnits);
      }
    } else {
      actionResult = executeBasicAttack(unit, playerUnits, enemyUnits);
    }

    fullBattleLog.push(...actionResult.logs);

    const allUnits = [...playerUnits, ...enemyUnits];
    const totalDamage = actionResult.targets.reduce((sum, tr) => sum + tr.damage, 0);
    const anyCrit = actionResult.targets.some(tr => tr.isCrit);

    for (const tr of actionResult.targets) {
      if (tr.damage <= 0) continue;
      const target = allUnits.find(u => u.id === tr.targetId);
      if (!target) continue;

      const hitResult = processPassives(target, 'onHit', playerUnits, enemyUnits, {
        attacker: unit,
        damage: tr.damage,
        isCrit: tr.isCrit,
      });
      fullBattleLog.push(...hitResult.logs);
      extraTurn = extraTurn || hitResult.extraTurn;

      const targetAllies = (target.side === 'player' ? playerUnits : enemyUnits)
        .filter(u => u.isAlive && u.id !== target.id);
      for (const ally of targetAllies) {
        const allyHitResult = processPassives(ally, 'onAllyHit', playerUnits, enemyUnits, {
          attacker: unit,
          damage: tr.damage,
        });
        fullBattleLog.push(...allyHitResult.logs);
        extraTurn = extraTurn || allyHitResult.extraTurn;
      }

      if (tr.isCrit) {
        const critResult = processPassives(unit, 'onCrit', playerUnits, enemyUnits, {
          damage: tr.damage,
          isCrit: true,
        });
        fullBattleLog.push(...critResult.logs);
        extraTurn = extraTurn || critResult.extraTurn;
      }

      if (target.isAlive) {
        const hpBelowResult = processPassives(target, 'onHpBelow', playerUnits, enemyUnits, {
          attacker: unit,
          damage: tr.damage,
        });
        fullBattleLog.push(...hpBelowResult.logs);
        extraTurn = extraTurn || hpBelowResult.extraTurn;
      }

      if (tr.killed) {
        const killResult = processPassives(unit, 'onKill', playerUnits, enemyUnits);
        fullBattleLog.push(...killResult.logs);
        extraTurn = extraTurn || killResult.extraTurn;
      }
    }

    if (totalDamage > 0) {
      const reactResult = processPassives(unit, 'onAttack', playerUnits, enemyUnits, {
        buffPhase: false,
        damage: totalDamage,
        isCrit: anyCrit,
      });
      fullBattleLog.push(...reactResult.logs);
      extraTurn = extraTurn || reactResult.extraTurn;
    }

    for (const tr of actionResult.targets) {
      if (tr.statusApplied) {
        const statusResult = processPassives(unit, 'onStatusApply', playerUnits, enemyUnits, {
          statusApplied: tr.statusApplied,
        });
        fullBattleLog.push(...statusResult.logs);
        extraTurn = extraTurn || statusResult.extraTurn;
      }
    }

    if (actionResult.skillUsed) {
      const comboLogs = checkComboTriggers(unit, actionResult.skillUsed, playerUnits, enemyUnits);
      fullBattleLog.push(...comboLogs);
    }

    return extraTurn;
  };

  while (
    isTeamAlive(playerUnits) &&
    isTeamAlive(enemyUnits) &&
    turn < BATTLE_CONSTANTS.MAX_BATTLE_TURNS
  ) {
    turn++;
    resetComboCounts([...playerUnits, ...enemyUnits]);

    const allTurnUnits = [...playerUnits, ...enemyUnits];
    for (const unit of allTurnUnits) {
      if (!unit.isAlive) continue;
      const { logs: startLogs, extraTurn: startExtra } = processPassives(unit, 'onTurnStart', playerUnits, enemyUnits);
      fullBattleLog.push(...startLogs);
      if (startExtra) {
        processUnitAction(unit);
      }
    }

    const statusLogs = processStatusEffects([...playerUnits, ...enemyUnits]);
    fullBattleLog.push(...statusLogs);

    for (const unit of [...playerUnits, ...enemyUnits]) {
      if (!unit.isAlive) continue;
      const hpBelowResult = processPassives(unit, 'onHpBelow', playerUnits, enemyUnits);
      fullBattleLog.push(...hpBelowResult.logs);
    }

    if (!isTeamAlive(playerUnits) || !isTeamAlive(enemyUnits)) break;

    const actionOrder = getActionOrder([...playerUnits, ...enemyUnits], config.actionPriority);

    for (const unit of actionOrder) {
      if (!unit.isAlive) continue;
      if (!isTeamAlive(playerUnits) || !isTeamAlive(enemyUnits)) break;

      if (checkSkipTurn(unit)) {
        const skipStatus = unit.statusEffects
          .filter(se => STATUS_EFFECT_CONFIG[se.type].skipTurnChance > 0)
          .find(() => true);
        const skipConfig = skipStatus ? STATUS_EFFECT_CONFIG[skipStatus.type] : null;
        fullBattleLog.push({
          timestamp: Date.now(),
          type: 'statusTick',
          targetId: unit.id,
          targetName: unit.name,
          statusType: skipStatus?.type,
          statusRemainingTurns: skipStatus?.remainingTurns,
          isSkipTurn: true,
          statusEffectData: skipStatus ? {
            type: skipStatus.type,
            remainingTurns: skipStatus.remainingTurns,
            damage: skipStatus.damage,
            sourceId: skipStatus.sourceId,
            skipTurnChance: STATUS_EFFECT_CONFIG[skipStatus.type].skipTurnChance,
            statModifier: STATUS_EFFECT_CONFIG[skipStatus.type].statModifier,
          } : undefined,
          message: `${skipConfig?.emoji || '⏸'} ${unit.name} 因${skipConfig?.name || '异常状态'}无法行动！`,
        });
        continue;
      }

      const extraTurn = processUnitAction(unit);

      if (extraTurn && unit.isAlive && isTeamAlive(playerUnits) && isTeamAlive(enemyUnits)) {
        processUnitAction(unit);
      }
    }

    for (const unit of [...playerUnits, ...enemyUnits]) {
      if (!unit.isAlive) continue;
      const { logs: endLogs } = processPassives(unit, 'onTurnEnd', playerUnits, enemyUnits);
      fullBattleLog.push(...endLogs);
    }

    updateCooldowns([...playerUnits, ...enemyUnits]);
  }

  const isWin = isTeamAlive(playerUnits) && !isTeamAlive(enemyUnits);
  const baseRewardMultiplier = opponent.betMultiplier;
  const effectiveRewardMultiplier = rewardMultiplier || baseRewardMultiplier;
  const reward = isWin ? Math.floor(betAmount * effectiveRewardMultiplier) : 0;

  fullBattleLog.push({
    timestamp: Date.now(),
    type: 'victory',
    sourceId: isWin ? 'player' : 'enemy',
    sourceName: isWin ? '玩家' : '对手',
    message: isWin
      ? `🎉 胜利！获得 ${reward} 货币奖励！`
      : `💔 失败...失去 ${betAmount} 货币。`,
  });

  return {
    playerUnits,
    enemyUnits,
    initialPlayerUnits,
    initialEnemyUnits,
    battleLog: fullBattleLog,
    isWin,
    reward,
    opponentName: opponent.name,
    opponentAvatar: opponent.avatar,
    effectiveDifficulty,
    rewardMultiplier: effectiveRewardMultiplier,
  };
};

export interface CustomEnemyBattleConfig {
  enemyAnimals: Animal[];
  enemyLineupConfig: {
    animals: { animalId: string; position: FormationPosition; targetStrategy: TargetStrategy }[];
    actionPriority: ActionPriority;
  };
}

export const simulateFullBattleWithCustomEnemies = (
  playerAnimals: Animal[],
  betAmount: number,
  lineupConfig: LineupConfig | undefined,
  customEnemyConfig: CustomEnemyBattleConfig
): {
  playerUnits: BattleUnit[];
  enemyUnits: BattleUnit[];
  initialPlayerUnits: BattleUnit[];
  initialEnemyUnits: BattleUnit[];
  battleLog: BattleLogEntry[];
  isWin: boolean;
  reward: number;
} => {
  const { enemyAnimals, enemyLineupConfig } = customEnemyConfig;

  const config = lineupConfig || { animals: [], actionPriority: 'speedFirst' as ActionPriority };

  const playerUnits = playerAnimals.map((animal, i) => {
    const animalConfig = config.animals.find(c => c.animalId === animal.id);
    const formationPos = animalConfig?.position || (i === 0 ? 'front' : i === 1 ? 'mid' : 'back') as FormationPosition;
    const targetStrat = animalConfig?.targetStrategy || 'lowestHp' as TargetStrategy;
    return createBattleUnit(animal, 'player', i, formationPos, targetStrat);
  });

  const enemyUnits = enemyAnimals.map((animal, i) => {
    const enemyConfig = enemyLineupConfig.animals.find(c => c.animalId === animal.id);
    const formationPos = enemyConfig?.position || 'mid';
    const targetStrat = enemyConfig?.targetStrategy || 'lowestHp';
    return createBattleUnit(animal, 'enemy', i, formationPos, targetStrat);
  });

  const initialPlayerUnits = JSON.parse(JSON.stringify(playerUnits));
  const initialEnemyUnits = JSON.parse(JSON.stringify(enemyUnits));

  const fullBattleLog: BattleLogEntry[] = [];
  let turn = 0;

  const processUnitAction = (unit: BattleUnit): boolean => {
    if (!unit.isAlive) return false;
    if (!isTeamAlive(playerUnits) || !isTeamAlive(enemyUnits)) return false;

    let extraTurn = false;

    const preBuffResult = processPassives(unit, 'onAttack', playerUnits, enemyUnits, { buffPhase: true });
    fullBattleLog.push(...preBuffResult.logs);
    extraTurn = extraTurn || preBuffResult.extraTurn;

    const skill = selectSkillForUnit(unit);
    let actionResult: ActionResult;

    if (skill) {
      const target = selectTarget(unit, playerUnits, enemyUnits, skill);
      if (target) {
        actionResult = executeSkill(unit, target, skill, playerUnits, enemyUnits);
      } else {
        actionResult = executeBasicAttack(unit, playerUnits, enemyUnits);
      }
    } else {
      actionResult = executeBasicAttack(unit, playerUnits, enemyUnits);
    }

    fullBattleLog.push(...actionResult.logs);

    const allUnits = [...playerUnits, ...enemyUnits];
    const totalDamage = actionResult.targets.reduce((sum, tr) => sum + tr.damage, 0);
    const anyCrit = actionResult.targets.some(tr => tr.isCrit);

    for (const tr of actionResult.targets) {
      if (tr.damage <= 0) continue;
      const target = allUnits.find(u => u.id === tr.targetId);
      if (!target) continue;

      const hitResult = processPassives(target, 'onHit', playerUnits, enemyUnits, {
        attacker: unit,
        damage: tr.damage,
        isCrit: tr.isCrit,
      });
      fullBattleLog.push(...hitResult.logs);
      extraTurn = extraTurn || hitResult.extraTurn;

      const targetAllies = (target.side === 'player' ? playerUnits : enemyUnits)
        .filter(u => u.isAlive && u.id !== target.id);
      for (const ally of targetAllies) {
        const allyHitResult = processPassives(ally, 'onAllyHit', playerUnits, enemyUnits, {
          attacker: unit,
          damage: tr.damage,
        });
        fullBattleLog.push(...allyHitResult.logs);
        extraTurn = extraTurn || allyHitResult.extraTurn;
      }

      if (tr.isCrit) {
        const critResult = processPassives(unit, 'onCrit', playerUnits, enemyUnits, {
          damage: tr.damage,
          isCrit: true,
        });
        fullBattleLog.push(...critResult.logs);
        extraTurn = extraTurn || critResult.extraTurn;
      }

      if (target.isAlive) {
        const hpBelowResult = processPassives(target, 'onHpBelow', playerUnits, enemyUnits, {
          attacker: unit,
          damage: tr.damage,
        });
        fullBattleLog.push(...hpBelowResult.logs);
        extraTurn = extraTurn || hpBelowResult.extraTurn;
      }

      if (tr.killed) {
        const killResult = processPassives(unit, 'onKill', playerUnits, enemyUnits);
        fullBattleLog.push(...killResult.logs);
        extraTurn = extraTurn || killResult.extraTurn;
      }
    }

    if (totalDamage > 0) {
      const reactResult = processPassives(unit, 'onAttack', playerUnits, enemyUnits, {
        buffPhase: false,
        damage: totalDamage,
        isCrit: anyCrit,
      });
      fullBattleLog.push(...reactResult.logs);
      extraTurn = extraTurn || reactResult.extraTurn;
    }

    for (const tr of actionResult.targets) {
      if (tr.statusApplied) {
        const statusResult = processPassives(unit, 'onStatusApply', playerUnits, enemyUnits, {
          statusApplied: tr.statusApplied,
        });
        fullBattleLog.push(...statusResult.logs);
        extraTurn = extraTurn || statusResult.extraTurn;
      }
    }

    if (actionResult.skillUsed) {
      const comboLogs = checkComboTriggers(unit, actionResult.skillUsed, playerUnits, enemyUnits);
      fullBattleLog.push(...comboLogs);
    }

    return extraTurn;
  };

  while (
    isTeamAlive(playerUnits) &&
    isTeamAlive(enemyUnits) &&
    turn < BATTLE_CONSTANTS.MAX_BATTLE_TURNS
  ) {
    turn++;
    resetComboCounts([...playerUnits, ...enemyUnits]);

    const allTurnUnits = [...playerUnits, ...enemyUnits];
    for (const unit of allTurnUnits) {
      if (!unit.isAlive) continue;
      const { logs: startLogs, extraTurn: startExtra } = processPassives(unit, 'onTurnStart', playerUnits, enemyUnits);
      fullBattleLog.push(...startLogs);
      if (startExtra) {
        processUnitAction(unit);
      }
    }

    const statusLogs = processStatusEffects([...playerUnits, ...enemyUnits]);
    fullBattleLog.push(...statusLogs);

    for (const unit of [...playerUnits, ...enemyUnits]) {
      if (!unit.isAlive) continue;
      const hpBelowResult = processPassives(unit, 'onHpBelow', playerUnits, enemyUnits);
      fullBattleLog.push(...hpBelowResult.logs);
    }

    if (!isTeamAlive(playerUnits) || !isTeamAlive(enemyUnits)) break;

    const actionOrder = getActionOrder([...playerUnits, ...enemyUnits], config.actionPriority);

    for (const unit of actionOrder) {
      if (!unit.isAlive) continue;
      if (!isTeamAlive(playerUnits) || !isTeamAlive(enemyUnits)) break;

      if (checkSkipTurn(unit)) {
        const skipStatus = unit.statusEffects
          .filter(se => STATUS_EFFECT_CONFIG[se.type].skipTurnChance > 0)
          .find(() => true);
        const skipConfig = skipStatus ? STATUS_EFFECT_CONFIG[skipStatus.type] : null;
        fullBattleLog.push({
          timestamp: Date.now(),
          type: 'statusTick',
          targetId: unit.id,
          targetName: unit.name,
          statusType: skipStatus?.type,
          statusRemainingTurns: skipStatus?.remainingTurns,
          isSkipTurn: true,
          statusEffectData: skipStatus ? {
            type: skipStatus.type,
            remainingTurns: skipStatus.remainingTurns,
            damage: skipStatus.damage,
            sourceId: skipStatus.sourceId,
            skipTurnChance: skipConfig?.skipTurnChance || 0,
          } : undefined,
          message: `${skipConfig?.emoji || '⏸'} ${unit.name} 因${skipConfig?.name || '异常状态'}无法行动！`,
        });
        continue;
      }

      const extraTurn = processUnitAction(unit);

      if (extraTurn && unit.isAlive && isTeamAlive(playerUnits) && isTeamAlive(enemyUnits)) {
        processUnitAction(unit);
      }
    }

    for (const unit of [...playerUnits, ...enemyUnits]) {
      if (!unit.isAlive) continue;
      const { logs: endLogs } = processPassives(unit, 'onTurnEnd', playerUnits, enemyUnits);
      fullBattleLog.push(...endLogs);
    }

    updateCooldowns([...playerUnits, ...enemyUnits]);
  }

  const isWin = isTeamAlive(playerUnits) && !isTeamAlive(enemyUnits);
  const reward = isWin ? Math.floor(betAmount * 1.5) : 0;

  fullBattleLog.push({
    timestamp: Date.now(),
    type: 'victory',
    sourceId: isWin ? 'player' : 'enemy',
    sourceName: isWin ? '玩家' : '对手',
    message: isWin
      ? `🎉 胜利！获得 ${reward} 货币奖励！`
      : `💔 失败...失去 ${betAmount} 货币。`,
  });

  return {
    playerUnits,
    enemyUnits,
    initialPlayerUnits,
    initialEnemyUnits,
    battleLog: fullBattleLog,
    isWin,
    reward,
  };
};
