import type { Rarity } from '@/types';

export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const randomFloat = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const pickRandom = <T>(array: T[]): T => {
  if (array.length === 0) throw new Error('Cannot pick from empty array');
  return array[Math.floor(Math.random() * array.length)];
};

export const pickRandomWeighted = <T>(items: T[], weights: number[]): T => {
  if (items.length === 0) throw new Error('Cannot pick from empty array');
  if (items.length !== weights.length) throw new Error('Items and weights length mismatch');

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) return items[0];

  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
};

export const rollRarity = (rates: Record<Rarity, number>): Rarity => {
  const rarities = Object.keys(rates).map(Number) as Rarity[];
  const weights = rarities.map(r => rates[r]);
  return pickRandomWeighted(rarities, weights);
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const chance = (probability: number): boolean => {
  return Math.random() < probability / 100;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const random = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};
