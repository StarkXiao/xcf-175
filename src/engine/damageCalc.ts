import type { BattleUnit, DamageResult } from '@/types';
import { BATTLE_CONSTANTS } from './constants';
import { chance, clamp, random } from '@/utils/random';

export const calculateDamage = (
  attacker: BattleUnit,
  defender: BattleUnit,
  skillDamage: number = 0
): DamageResult => {
  const atkBonus = attacker.buffs
    .filter(b => b.stat === 'atk')
    .reduce((sum, b) => sum + b.value, 0);
  const defBonus = defender.buffs
    .filter(b => b.stat === 'def')
    .reduce((sum, b) => sum + b.value, 0);

  const finalAtk = attacker.atk * (1 + atkBonus / 100);
  const finalDef = defender.def * (1 + defBonus / 100);

  let baseDamage = finalAtk - finalDef * BATTLE_CONSTANTS.DEFENSE_FACTOR;
  baseDamage += skillDamage;

  const isCrit = chance(BATTLE_CONSTANTS.BASE_CRIT_RATE);
  const critMultiplier = isCrit ? BATTLE_CONSTANTS.BASE_CRIT_DAMAGE : 1;

  const randomFactor = 1 + random(-BATTLE_CONSTANTS.RANDOM_DAMAGE_RANGE, BATTLE_CONSTANTS.RANDOM_DAMAGE_RANGE);

  let finalDamage = Math.floor(baseDamage * critMultiplier * randomFactor);
  finalDamage = clamp(finalDamage, 1, 9999);

  const isBlocked = finalDamage <= 1 && baseDamage < defender.def * 0.3;

  return {
    damage: finalDamage,
    isCrit,
    isBlocked,
  };
};

export const calculateHeal = (
  healer: BattleUnit,
  target: BattleUnit,
  healPercent: number
): number => {
  const healAmount = Math.floor(target.maxHp * (healPercent / 100));
  return clamp(healAmount, 1, target.maxHp - target.currentHp);
};

export const getEffectiveStat = (unit: BattleUnit, stat: 'atk' | 'def' | 'spd'): number => {
  const baseValue = unit[stat];
  const buffValue = unit.buffs
    .filter(b => b.stat === stat)
    .reduce((sum, b) => sum + b.value, 0);
  return Math.floor(baseValue * (1 + buffValue / 100));
};

export const isTeamAlive = (units: BattleUnit[]): boolean => {
  return units.some(unit => unit.isAlive);
};

export const getAliveUnits = (units: BattleUnit[]): BattleUnit[] => {
  return units.filter(unit => unit.isAlive);
};

export const getRandomTarget = (units: BattleUnit[]): BattleUnit | undefined => {
  const alive = getAliveUnits(units);
  if (alive.length === 0) return undefined;
  return alive[Math.floor(Math.random() * alive.length)];
};

export const getLowestHpTarget = (units: BattleUnit[]): BattleUnit | undefined => {
  const alive = getAliveUnits(units);
  if (alive.length === 0) return undefined;
  return alive.reduce((lowest, current) =>
    current.currentHp < lowest.currentHp ? current : lowest
  );
};

export const getHighestAtkTarget = (units: BattleUnit[]): BattleUnit | undefined => {
  const alive = getAliveUnits(units);
  if (alive.length === 0) return undefined;
  return alive.reduce((highest, current) =>
    getEffectiveStat(current, 'atk') > getEffectiveStat(highest, 'atk') ? current : highest
  );
};
