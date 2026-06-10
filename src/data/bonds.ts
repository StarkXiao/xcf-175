import type { BondTemplate, BondCategory, CodexMilestone } from '@/types';

export const BOND_TEMPLATES: BondTemplate[] = [
  {
    id: 'bond_cat_clan',
    name: '猫族同盟',
    description: '猫科动物们暗中结盟，共享战斗本能',
    emoji: '🐱',
    category: 'species',
    color: '#00ff66',
    animalTemplateIds: ['cat_stray', 'cat_black'],
    levels: [
      { requiredCount: 1, stats: { spd: 3 }, description: '猫族初觉：速度+3' },
      { requiredCount: 2, stats: { spd: 8, atk: 5 }, description: '猫族觉醒：速度+8，攻击+5' },
    ],
  },
  {
    id: 'bond_dog_pack',
    name: '犬群意志',
    description: '犬科动物以群体之力协同作战',
    emoji: '🐶',
    category: 'species',
    color: '#ff4400',
    animalTemplateIds: ['dog_stray', 'fox_alley'],
    levels: [
      { requiredCount: 1, stats: { atk: 4 }, description: '犬群意志：攻击+4' },
      { requiredCount: 2, stats: { atk: 10, hp: 50 }, description: '犬群狂热：攻击+10，生命+50' },
    ],
  },
  {
    id: 'bond_rodent_swarm',
    name: '啮齿暗潮',
    description: '啮齿类动物从暗处涌出，无人能挡',
    emoji: '🐀',
    category: 'species',
    color: '#aa00ff',
    animalTemplateIds: ['rat_sewer'],
    levels: [
      { requiredCount: 1, stats: { spd: 5, atk: 3 }, description: '啮齿暗潮：速度+5，攻击+3' },
    ],
  },
  {
    id: 'bond_aviary',
    name: '翱翔天际',
    description: '鸟类从空中俯瞰战场，掌控全局',
    emoji: '🕊️',
    category: 'species',
    color: '#00ccff',
    animalTemplateIds: ['pigeon_city', 'crow_urban'],
    levels: [
      { requiredCount: 1, stats: { spd: 4, crit: 3 }, description: '翱翔天际：速度+4，暴击+3' },
      { requiredCount: 2, stats: { spd: 10, crit: 8, atk: 6 }, description: '天空霸主：速度+10，暴击+8，攻击+6' },
    ],
  },
  {
    id: 'bond_reptile',
    name: '冷血契约',
    description: '爬行类以冷酷的姿态猎杀猎物',
    emoji: '🐍',
    category: 'species',
    color: '#00ff66',
    animalTemplateIds: ['snake_alley', 'turtle_sewer'],
    levels: [
      { requiredCount: 1, stats: { def: 5, atk: 3 }, description: '冷血契约：防御+5，攻击+3' },
      { requiredCount: 2, stats: { def: 15, atk: 10, hp: 80 }, description: '冷血猎杀：防御+15，攻击+10，生命+80' },
    ],
  },
  {
    id: 'bond_fire_unity',
    name: '烈焰共鸣',
    description: '火属性动物燃起同一团烈火',
    emoji: '🔥',
    category: 'element',
    color: '#ff4400',
    animalTemplateIds: ['dog_stray', 'fox_alley', 'boar_urban'],
    levels: [
      { requiredCount: 1, stats: { atk: 5 }, description: '烈焰微光：攻击+5' },
      { requiredCount: 2, stats: { atk: 12, hp: 40 }, description: '烈焰燃烧：攻击+12，生命+40' },
      { requiredCount: 3, stats: { atk: 22, hp: 80, crit: 5 }, description: '烈焰风暴：攻击+22，生命+80，暴击+5' },
    ],
  },
  {
    id: 'bond_nature_unity',
    name: '自然庇护',
    description: '自然之力守护着每一个生灵',
    emoji: '🌿',
    category: 'element',
    color: '#00ff66',
    animalTemplateIds: ['cat_stray', 'pigeon_city', 'raccoon_trash', 'goat_feral'],
    levels: [
      { requiredCount: 1, stats: { hp: 30 }, description: '自然之息：生命+30' },
      { requiredCount: 2, stats: { hp: 60, def: 8 }, description: '自然之盾：生命+60，防御+8' },
      { requiredCount: 3, stats: { hp: 100, def: 16, spd: 5 }, description: '自然之怒：生命+100，防御+16，速度+5' },
      { requiredCount: 4, stats: { hp: 160, def: 25, spd: 10, atk: 8 }, description: '自然圣域：生命+160，防御+25，速度+10，攻击+8' },
    ],
  },
  {
    id: 'bond_dark_unity',
    name: '暗影共鸣',
    description: '暗属性生物在黑暗中融为一体',
    emoji: '🌑',
    category: 'element',
    color: '#aa00ff',
    animalTemplateIds: ['rat_sewer', 'crow_urban', 'cat_black'],
    levels: [
      { requiredCount: 1, stats: { crit: 4 }, description: '暗影微光：暴击+4' },
      { requiredCount: 2, stats: { crit: 8, spd: 6 }, description: '暗影潜行：暴击+8，速度+6' },
      { requiredCount: 3, stats: { crit: 14, spd: 12, atk: 10 }, description: '暗影主宰：暴击+14，速度+12，攻击+10' },
    ],
  },
  {
    id: 'bond_ice_unity',
    name: '冰霜之心',
    description: '冰属性生物凝结成坚不可摧的寒冰',
    emoji: '❄️',
    category: 'element',
    color: '#00ccff',
    animalTemplateIds: ['snake_alley', 'turtle_sewer'],
    levels: [
      { requiredCount: 1, stats: { def: 6 }, description: '冰霜之甲：防御+6' },
      { requiredCount: 2, stats: { def: 15, hp: 60 }, description: '冰霜之壁：防御+15，生命+60' },
    ],
  },
  {
    id: 'bond_urban_legends',
    name: '都市传说',
    description: '黑猫与乌鸦，厄运与预言的使者',
    emoji: '👁️',
    category: 'special',
    color: '#ffdd00',
    animalTemplateIds: ['cat_black', 'crow_urban'],
    levels: [
      { requiredCount: 1, stats: { crit: 5 }, description: '预兆之眼：暴击+5' },
      { requiredCount: 2, stats: { crit: 12, spd: 8, atk: 6 }, description: '命运之眼：暴击+12，速度+8，攻击+6' },
    ],
  },
  {
    id: 'bond_survivors',
    name: '街头幸存者',
    description: '流浪猫与流浪狗，在最艰难的街头共同生存',
    emoji: '🏙️',
    category: 'special',
    color: '#ff8844',
    animalTemplateIds: ['cat_stray', 'dog_stray'],
    levels: [
      { requiredCount: 1, stats: { hp: 20, spd: 3 }, description: '街头本能：生命+20，速度+3' },
      { requiredCount: 2, stats: { hp: 60, spd: 8, atk: 5, def: 5 }, description: '街头王者：生命+60，速度+8，攻击+5，防御+5' },
    ],
  },
  {
    id: 'bond_trash_kingdom',
    name: '垃圾王国',
    description: '在城市的废弃物中，浣熊和老鼠建立了自己的王国',
    emoji: '🗑️',
    category: 'special',
    color: '#88cc00',
    animalTemplateIds: ['raccoon_trash', 'rat_sewer'],
    levels: [
      { requiredCount: 1, stats: { def: 4, hp: 20 }, description: '拾荒本能：防御+4，生命+20' },
      { requiredCount: 2, stats: { def: 10, hp: 60, spd: 5 }, description: '垃圾王者：防御+10，生命+60，速度+5' },
    ],
  },
  {
    id: 'bond_urban_beasts',
    name: '都市猛兽',
    description: '野猪和野山羊——城市中最具破坏力的力量',
    emoji: '💪',
    category: 'special',
    color: '#ff4444',
    animalTemplateIds: ['boar_urban', 'goat_feral'],
    levels: [
      { requiredCount: 1, stats: { atk: 8, hp: 30 }, description: '蛮力初现：攻击+8，生命+30' },
      { requiredCount: 2, stats: { atk: 18, hp: 80, def: 10 }, description: '所向披靡：攻击+18，生命+80，防御+10' },
    ],
  },
  {
    id: 'bond_full_collection',
    name: '万兽之王',
    description: '收集所有动物，成为真正的图鉴大师',
    emoji: '👑',
    category: 'special',
    color: '#ffdd00',
    animalTemplateIds: ['cat_stray', 'dog_stray', 'rat_sewer', 'pigeon_city', 'crow_urban', 'fox_alley', 'raccoon_trash', 'cat_black', 'goat_feral', 'boar_urban', 'snake_alley', 'turtle_sewer'],
    levels: [
      { requiredCount: 6, stats: { hp: 50, atk: 10, def: 10, spd: 5 }, description: '图鉴学者：全属性提升' },
      { requiredCount: 9, stats: { hp: 100, atk: 20, def: 20, spd: 10, crit: 5 }, description: '图鉴大师：大幅全属性提升' },
      { requiredCount: 12, stats: { hp: 200, atk: 40, def: 35, spd: 18, crit: 10 }, description: '万兽之王：极致全属性提升' },
    ],
  },
];

export const getBondTemplate = (id: string): BondTemplate | undefined => {
  return BOND_TEMPLATES.find(b => b.id === id);
};

export const getBondsByCategory = (category: BondCategory): BondTemplate[] => {
  return BOND_TEMPLATES.filter(b => b.category === category);
};

export const getBondsForAnimal = (animalTemplateId: string): BondTemplate[] => {
  return BOND_TEMPLATES.filter(b => b.animalTemplateIds.includes(animalTemplateId));
};

export const calculateBondLevel = (bond: BondTemplate, ownedTemplateIds: Set<string>): number => {
  const ownedCount = bond.animalTemplateIds.filter(id => ownedTemplateIds.has(id)).length;
  let level = 0;
  for (let i = 0; i < bond.levels.length; i++) {
    if (ownedCount >= bond.levels[i].requiredCount) {
      level = i + 1;
    }
  }
  return level;
};

export const calculateAllBondBonuses = (
  ownedTemplateIds: Set<string>,
): { hp: number; atk: number; def: number; spd: number; crit: number } => {
  const total = { hp: 0, atk: 0, def: 0, spd: 0, crit: 0 };
  for (const bond of BOND_TEMPLATES) {
    const level = calculateBondLevel(bond, ownedTemplateIds);
    if (level > 0) {
      const levelConfig = bond.levels[level - 1];
      total.hp += levelConfig.stats.hp || 0;
      total.atk += levelConfig.stats.atk || 0;
      total.def += levelConfig.stats.def || 0;
      total.spd += levelConfig.stats.spd || 0;
      total.crit += levelConfig.stats.crit || 0;
    }
  }
  return total;
};

export const CODEX_MILESTONES: CodexMilestone[] = [
  { id: 'milestone_collect_3', type: 'collection', name: '初入荒野', description: '收集3种不同动物', emoji: '🌱', targetValue: 3, reward: { type: 'coins', amount: 500 }, isClaimed: false },
  { id: 'milestone_collect_6', type: 'collection', name: '猎手之路', description: '收集6种不同动物', emoji: '🏹', targetValue: 6, reward: { type: 'gems', amount: 10 }, isClaimed: false },
  { id: 'milestone_collect_9', type: 'collection', name: '图鉴学者', description: '收集9种不同动物', emoji: '📖', targetValue: 9, reward: { type: 'coins', amount: 3000 }, isClaimed: false },
  { id: 'milestone_collect_12', type: 'collection', name: '全图鉴达成', description: '收集全部12种动物', emoji: '👑', targetValue: 12, reward: { type: 'gems', amount: 50 }, isClaimed: false },
  { id: 'milestone_bond_2', type: 'bond', name: '羁绊初成', description: '激活2个羁绊', emoji: '🔗', targetValue: 2, reward: { type: 'coins', amount: 800 }, isClaimed: false },
  { id: 'milestone_bond_5', type: 'bond', name: '羁绊大师', description: '激活5个羁绊', emoji: '⚡', targetValue: 5, reward: { type: 'gems', amount: 20 }, isClaimed: false },
  { id: 'milestone_bond_8', type: 'bond', name: '羁绊之王', description: '激活8个羁绊', emoji: '🔮', targetValue: 8, reward: { type: 'coins', amount: 5000 }, isClaimed: false },
  { id: 'milestone_rarity_4', type: 'rarity', name: '传说降临', description: '拥有稀有度4的动物', emoji: '💎', targetValue: 1, reward: { type: 'gems', amount: 15 }, isClaimed: false },
  { id: 'milestone_rarity_5', type: 'rarity', name: '神话现世', description: '拥有稀有度5的动物', emoji: '🌟', targetValue: 1, reward: { type: 'gems', amount: 30 }, isClaimed: false },
];

export const createInitialCodexData = (): import('@/types').CodexSaveData => ({
  bonds: BOND_TEMPLATES.map(b => ({
    bondId: b.id,
    currentLevel: 0,
    isActivated: false,
  })),
  milestones: CODEX_MILESTONES.map(m => ({ ...m })),
  totalCollected: 0,
  totalBondsActivated: 0,
});
