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
} from '@/types';
import { getAnimalTemplate } from '@/data/animals';
import { getSkillTemplate } from '@/data/skills';
import { getPartTemplate } from '@/data/parts';
import { getRandomOpponent } from '@/data/opponents';
import { generateId } from '@/utils/id';
import { randomInt, pickRandom, chance } from '@/utils/random';
import { BATTLE_CONSTANTS, RARITY_MULTIPLIER, STATUS_EFFECT_CONFIG, ELEMENT_NAMES, ELEMENT_EMOJIS } from './constants';
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

  let hp = Math.floor(template.baseHp * levelMultiplier * rarityMultiplier);
  let atk = Math.floor(template.baseAtk * levelMultiplier * rarityMultiplier);
  let def = Math.floor(template.baseDef * levelMultiplier * rarityMultiplier);
  let spd = Math.floor(template.baseSpd * levelMultiplier * rarityMultiplier);

  animal.parts.forEach(ep => {
    const part = getPartTemplate(ep.partId);
    if (part) {
      hp += part.stats.hp || 0;
      atk += part.stats.atk || 0;
      def += part.stats.def || 0;
      spd += part.stats.spd || 0;
    }
  });

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

  const skills: BattleSkill[] = animal.skills
    .map(es => {
      const skill = getSkillTemplate(es.skillId);
      if (!skill) return null;
      const skillMultiplier = 1 + (es.level - 1) * 0.15;
      return {
        skillId: skill.id,
        name: skill.name,
        type: skill.type,
        damage: Math.floor(skill.damage * skillMultiplier),
        cooldown: skill.cooldown,
        currentCooldown: 0,
        emoji: skill.emoji,
        element: skill.element,
        effect: skill.effect,
        statusEffect: skill.statusEffect,
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
      });
    }
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
    buffs: [],
    statusEffects: [],
    comboCount: 0,
    isSkipTurn: false,
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

export const generateEnemyTeam = (playerAvgLevel: number) => {
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
): BattleLogEntry[] => {
  const logs: BattleLogEntry[] = [];
  const targets = Array.isArray(target) ? target : [target];

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
      if (statusLog) logs.push(statusLog);
    } else {
      const dmgResult = calculateDamage(attacker, t, skill.damage, skill.element);
      t.currentHp = Math.max(0, t.currentHp - dmgResult.damage);

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
      if (statusLog) logs.push(statusLog);
    }

    if (t.currentHp <= 0) {
      t.isAlive = false;
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
  });

  return logs;
};

export const executeBasicAttack = (
  attacker: BattleUnit,
  playerUnits: BattleUnit[],
  enemyUnits: BattleUnit[]
): BattleLogEntry[] => {
  const logs: BattleLogEntry[] = [];
  const enemies = attacker.side === 'player' ? enemyUnits : playerUnits;
  const target = getLowestHpTarget(enemies);

  if (!target) return logs;

  attacker.comboCount++;

  const comboMultiplier = Math.min(
    1 + (attacker.comboCount - 1) * BATTLE_CONSTANTS.COMBO_DAMAGE_BONUS_PER_HIT,
    BATTLE_CONSTANTS.COMBO_MAX_MULTIPLIER
  );

  const dmgResult = calculateDamage(attacker, target, 0);
  target.currentHp = Math.max(0, target.currentHp - dmgResult.damage);

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

  return logs;
};

export const updateCooldowns = (units: BattleUnit[]): void => {
  units.forEach(unit => {
    unit.skills.forEach(skill => {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown--;
      }
    });
    unit.buffs = unit.buffs
      .map(b => ({ ...b, remainingTurns: b.remainingTurns - 1 }))
      .filter(b => b.remainingTurns > 0);
  });
};

export const resetComboCounts = (units: BattleUnit[]): void => {
  units.forEach(unit => {
    unit.comboCount = 0;
  });
};

export const simulateFullBattle = (
  playerAnimals: Animal[],
  betAmount: number,
  lineupConfig?: LineupConfig
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
} => {
  const playerAvgLevel = Math.floor(
    playerAnimals.reduce((sum, a) => sum + a.level, 0) / playerAnimals.length
  );

  const { opponent, animals: enemyAnimals } = generateEnemyTeam(playerAvgLevel);

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

  while (
    isTeamAlive(playerUnits) &&
    isTeamAlive(enemyUnits) &&
    turn < BATTLE_CONSTANTS.MAX_BATTLE_TURNS
  ) {
    turn++;
    resetComboCounts([...playerUnits, ...enemyUnits]);

    const statusLogs = processStatusEffects([...playerUnits, ...enemyUnits]);
    fullBattleLog.push(...statusLogs);

    if (!isTeamAlive(playerUnits) || !isTeamAlive(enemyUnits)) break;

    const actionOrder = getActionOrder([...playerUnits, ...enemyUnits], config.actionPriority);

    for (const unit of actionOrder) {
      if (!unit.isAlive) continue;
      if (!isTeamAlive(playerUnits) || !isTeamAlive(enemyUnits)) break;

      if (checkSkipTurn(unit)) {
        const skipStatus = unit.statusEffects
          .filter(se => STATUS_EFFECT_CONFIG[se.type].skipTurnChance > 0)
          .find(() => true);
        const config = skipStatus ? STATUS_EFFECT_CONFIG[skipStatus.type] : null;
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
          message: `${config?.emoji || '⏸'} ${unit.name} 因${config?.name || '异常状态'}无法行动！`,
        });
        continue;
      }

      const skill = selectSkillForUnit(unit);
      let turnLogs: BattleLogEntry[];

      if (skill) {
        const target = selectTarget(unit, playerUnits, enemyUnits, skill);
        if (target) {
          turnLogs = executeSkill(unit, target, skill, playerUnits, enemyUnits);
        } else {
          turnLogs = executeBasicAttack(unit, playerUnits, enemyUnits);
        }
      } else {
        turnLogs = executeBasicAttack(unit, playerUnits, enemyUnits);
      }

      fullBattleLog.push(...turnLogs);
    }

    updateCooldowns([...playerUnits, ...enemyUnits]);
  }

  const isWin = isTeamAlive(playerUnits) && !isTeamAlive(enemyUnits);
  const reward = isWin ? Math.floor(betAmount * opponent.betMultiplier) : 0;

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
  };
};
