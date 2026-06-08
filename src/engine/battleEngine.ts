import type {
  Animal,
  BattleUnit,
  BattleLogEntry,
  BattleSkill,
  Part,
  Skill,
  BattleSide,
} from '@/types';
import { ANIMAL_TEMPLATES, getAnimalTemplate } from '@/data/animals';
import { getSkillTemplate } from '@/data/skills';
import { getPartTemplate } from '@/data/parts';
import { getRandomOpponent } from '@/data/opponents';
import { generateId } from '@/utils/id';
import { randomInt, pickRandom, chance } from '@/utils/random';
import { BATTLE_CONSTANTS, RARITY_MULTIPLIER } from './constants';
import {
  calculateDamage,
  calculateHeal,
  getRandomTarget,
  getLowestHpTarget,
  getHighestAtkTarget,
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
  position: number
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
        effect: skill.effect,
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
    maxHp: stats.hp,
    currentHp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    skills,
    isAlive: true,
    side,
    position,
    buffs: [],
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

export const getActionOrder = (units: BattleUnit[]): BattleUnit[] => {
  return [...units]
    .filter(u => u.isAlive)
    .sort((a, b) => {
      const spdA = a.spd * (1 + a.buffs.filter(b => b.stat === 'spd').reduce((s, b) => s + b.value, 0) / 100);
      const spdB = b.spd * (1 + b.buffs.filter(b => b.stat === 'spd').reduce((s, b) => s + b.value, 0) / 100);
      return spdB - spdA;
    });
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

  if (chance(50)) {
    return getLowestHpTarget(enemies);
  }
  if (chance(50)) {
    return getHighestAtkTarget(enemies);
  }
  return getRandomTarget(enemies);
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

  logs.push({
    id: generateId('log'),
    timestamp: Date.now(),
    type: 'skill',
    sourceId: attacker.id,
    sourceName: attacker.name,
    skillId: skill.skillId,
    skillName: skill.name,
    message: `${attacker.name} 使用了 ${skill.emoji} ${skill.name}！`,
  });

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
        t.buffs = t.buffs.filter(b => b.stat !== skill.effect!.stat);
        t.buffs.push({
          stat: skill.effect.stat,
          value: skill.effect.value,
          remainingTurns: skill.effect.duration || 2,
        });
        logs.push({
          timestamp: Date.now(),
          type: 'buff',
          sourceId: attacker.id,
          sourceName: attacker.name,
          targetId: t.id,
          targetName: t.name,
          value: skill.effect.value,
          message: `${t.name} 获得了 ${skill.effect.stat.toUpperCase()} +${skill.effect.value}% 增益！`,
        });
      }
    } else if (skill.type === 'debuff') {
      if (skill.effect?.stat && skill.effect?.value !== undefined) {
        t.buffs = t.buffs.filter(b => b.stat !== skill.effect!.stat);
        t.buffs.push({
          stat: skill.effect.stat,
          value: skill.effect.value,
          remainingTurns: skill.effect.duration || 2,
        });
        logs.push({
          timestamp: Date.now(),
          type: 'debuff',
          sourceId: attacker.id,
          sourceName: attacker.name,
          targetId: t.id,
          targetName: t.name,
          value: skill.effect.value,
          message: `${t.name} 受到 ${skill.effect.stat.toUpperCase()} ${skill.effect.value}% 减益！`,
        });
      }
      if (skill.damage > 0) {
        const dmgResult = calculateDamage(attacker, t, skill.damage);
        t.currentHp = Math.max(0, t.currentHp - dmgResult.damage);
        logs.push({
          timestamp: Date.now(),
          type: 'damage',
          sourceId: attacker.id,
          sourceName: attacker.name,
          targetId: t.id,
          targetName: t.name,
          value: dmgResult.damage,
          isCrit: dmgResult.isCrit,
          message: dmgResult.isCrit
            ? `💥 暴击！${t.name} 受到 ${dmgResult.damage} 点伤害！`
            : `${t.name} 受到 ${dmgResult.damage} 点伤害！`,
        });
      }
    } else {
      const dmgResult = calculateDamage(attacker, t, skill.damage);
      t.currentHp = Math.max(0, t.currentHp - dmgResult.damage);
      logs.push({
        timestamp: Date.now(),
        type: 'damage',
        sourceId: attacker.id,
        sourceName: attacker.name,
        targetId: t.id,
        targetName: t.name,
        value: dmgResult.damage,
        isCrit: dmgResult.isCrit,
        message: dmgResult.isCrit
          ? `💥 暴击！${t.name} 受到 ${dmgResult.damage} 点伤害！`
          : `${t.name} 受到 ${dmgResult.damage} 点伤害！`,
      });
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

  const dmgResult = calculateDamage(attacker, target, 0);
  target.currentHp = Math.max(0, target.currentHp - dmgResult.damage);

  logs.push({
    timestamp: Date.now(),
    type: 'attack',
    sourceId: attacker.id,
    sourceName: attacker.name,
    targetId: target.id,
    targetName: target.name,
    value: dmgResult.damage,
    isCrit: dmgResult.isCrit,
    message: dmgResult.isCrit
      ? `💥 暴击！${attacker.name} 攻击 ${target.name}，造成 ${dmgResult.damage} 点伤害！`
      : `${attacker.name} 攻击 ${target.name}，造成 ${dmgResult.damage} 点伤害！`,
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

export const simulateFullBattle = (
  playerAnimals: Animal[],
  betAmount: number
): {
  playerUnits: BattleUnit[];
  enemyUnits: BattleUnit[];
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

  const playerUnits = playerAnimals.map((animal, i) =>
    createBattleUnit(animal, 'player', i)
  );
  const enemyUnits = enemyAnimals.map((animal, i) =>
    createBattleUnit(animal, 'enemy', i)
  );

  const fullBattleLog: BattleLogEntry[] = [];
  let turn = 0;

  while (
    isTeamAlive(playerUnits) &&
    isTeamAlive(enemyUnits) &&
    turn < BATTLE_CONSTANTS.MAX_BATTLE_TURNS
  ) {
    turn++;
    const actionOrder = getActionOrder([...playerUnits, ...enemyUnits]);

    for (const unit of actionOrder) {
      if (!unit.isAlive) continue;
      if (!isTeamAlive(playerUnits) || !isTeamAlive(enemyUnits)) break;

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
    battleLog: fullBattleLog,
    isWin,
    reward,
    opponentName: opponent.name,
    opponentAvatar: opponent.avatar,
  };
};
