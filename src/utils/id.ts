export const generateId = (prefix?: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
};

export const generateAnimalId = (): string => generateId('animal');
export const generateBattleId = (): string => generateId('battle');
export const generatePartId = (): string => generateId('part');
export const generateSkillId = (): string => generateId('skill');
