import type { BattleUnit, DamageResult, Element, FormationPosition } from '@/types';
import { BATTLE_CONSTANTS, hasElementAdvantage, hasElementDisadvantage, STATUS_EFFECT_CONFIG } from './constants';
import { chance, clamp, random } from '@/utils/random';

export const FORMATION_MODIFIERS: Record<FormationPosition, {
  damageDealtMul: number;
  damageTakenMul: number;
  defBonus: number;
}> = {
  front: { damageDealtMul: 1.0, damageTakenMul: 0.85, defBonus: 15 },
  mid: { damageDealtMul: 1.0, damageTakenMul: 1.0, defBonus: 0 },
  back: { damageDealtMul: 1.15, damageTakenMul: 1.1, defBonus: -10 },
};

export const getElementMultiplier = (
  attackerElement: Element,
  defenderElement: Element
): { multiplier: number; isAdvantage: boolean; isDisadvantage: boolean } => {
  if (hasElementAdvantage(attackerElement, defenderElement)) {
    return {
      multiplier: BATTLE_CONSTANTS.ELEMENT_ADVANTAGE_MULTIPLIER,
      isAdvantage: true,
      isDisadvantage: false,
    };
  }
  if (hasElementDisadvantage(attackerElement, defenderElement)) {
    return {
      multiplier: BATTLE_CONSTANTS.ELEMENT_DISADVANTAGE_MULTIPLIER,
      isAdvantage: false,
      isDisadvantage: true,
    };
  }
  return { multiplier: 1, isAdvantage: false, isDisadvantage: false };
};

export const getComboMultiplier = (comboCount: number): number => {
  if (comboCount <= 1) return 1;
  const bonus = (comboCount - 1) * BATTLE_CONSTANTS.COMBO_DAMAGE_BONUS_PER_HIT;
  return Math.min(1 + bonus, BATTLE_CONSTANTS.COMBO_MAX_MULTIPLIER);
};

export const calculateDamage = (
  attacker: BattleUnit,
  defender: BattleUnit,
  skillDamage: number = 0,
  skillElement?: Element
): DamageResult => {
  const attackerFormation = FORMATION_MODIFIERS[attacker.formationPosition];
  const defenderFormation = FORMATION_MODIFIERS[defender.formationPosition];

  const atkBonus = attacker.buffs
    .filter(b => b.stat === 'atk')
    .reduce((sum, b) => sum + b.value, 0);
  const defBonus = defender.buffs
    .filter(b => b.stat === 'def')
    .reduce((sum, b) => sum + b.value, 0);

  const statusAtkMod = attacker.statusEffects.reduce((sum, se) => {
    const config = STATUS_EFFECT_CONFIG[se.type];
    return sum + (config?.statModifier?.stat === 'atk' ? config.statModifier.value : 0);
  }, 0);

  const statusDefMod = defender.statusEffects.reduce((sum, se) => {
    const config = STATUS_EFFECT_CONFIG[se.type];
    return sum + (config?.statModifier?.stat === 'def' ? config.statModifier.value : 0);
  }, 0);

  const finalAtk = attacker.atk * (1 + (atkBonus + statusAtkMod) / 100);
  const totalDefBonus = defBonus + statusDefMod + defenderFormation.defBonus;
  const finalDef = defender.def * (1 + totalDefBonus / 100);

  let baseDamage = finalAtk - finalDef * BATTLE_CONSTANTS.DEFENSE_FACTOR;
  baseDamage += skillDamage;

  const critBonus = attacker.buffs
    .filter(b => b.stat === 'crit')
    .reduce((sum, b) => sum + b.value, 0);
  const isCrit = chance(BATTLE_CONSTANTS.BASE_CRIT_RATE + critBonus);
  const critMultiplier = isCrit ? BATTLE_CONSTANTS.BASE_CRIT_DAMAGE : 1;

  const effectiveElement = skillElement || attacker.element;
  const { multiplier: elementMultiplier, isAdvantage, isDisadvantage } =
    getElementMultiplier(effectiveElement, defender.element);

  const comboMultiplier = getComboMultiplier(attacker.comboCount);

  const randomFactor = 1 + random(-BATTLE_CONSTANTS.RANDOM_DAMAGE_RANGE, BATTLE_CONSTANTS.RANDOM_DAMAGE_RANGE);

  const formationAttackMul = attackerFormation.damageDealtMul;
  const formationDefenseMul = defenderFormation.damageTakenMul;

  let finalDamage = Math.floor(
    baseDamage * critMultiplier * elementMultiplier * comboMultiplier * randomFactor * formationAttackMul * formationDefenseMul
  );
  finalDamage = clamp(finalDamage, 1, 9999);

  const isBlocked = finalDamage <= 1 && baseDamage < defender.def * 0.3;

  return {
    damage: finalDamage,
    isCrit,
    isBlocked,
    isElementAdvantage: isAdvantage,
    isElementDisadvantage: isDisadvantage,
    elementAdvantageMultiplier: elementMultiplier,
  };
};

export const calculateStatusDamage = (unit: BattleUnit): { type: string; damage: number }[] => {
  const results: { type: string; damage: number }[] = [];
  for (const se of unit.statusEffects) {
    if (se.damage > 0) {
      results.push({ type: se.type, damage: se.damage });
    }
  }
  return results;
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

export const getWeakestDefTarget = (units: BattleUnit[]): BattleUnit | undefined => {
  const alive = getAliveUnits(units);
  if (alive.length === 0) return undefined;
  return alive.reduce((weakest, current) =>
    getEffectiveStat(current, 'def') < getEffectiveStat(weakest, 'def') ? current : weakest
  );
};

export const getHighestThreatTarget = (units: BattleUnit[]): BattleUnit | undefined => {
  const alive = getAliveUnits(units);
  if (alive.length === 0) return undefined;
  return alive.reduce((highest, current) => {
    const threatA = getEffectiveStat(current, 'atk') * (current.currentHp / current.maxHp)
      + (current.formationPosition === 'back' ? 20 : 0);
    const threatB = getEffectiveStat(highest, 'atk') * (highest.currentHp / highest.maxHp)
      + (highest.formationPosition === 'back' ? 20 : 0);
    return threatA > threatB ? current : highest;
  });
};
