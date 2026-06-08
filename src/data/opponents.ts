import type { OpponentTemplate } from '@/types';

export const OPPONENT_TEMPLATES: OpponentTemplate[] = [
  {
    id: 'opp_street_brawler',
    name: '街头霸王',
    avatar: '🥊',
    description: '在街头摸爬滚打的老对手，擅长使用流浪动物进行战斗。',
    difficulty: 'easy',
    animalTemplates: ['cat_stray', 'rat_sewer', 'pigeon_city'],
    levelRange: [1, 3],
    betMultiplier: 1.2,
  },
  {
    id: 'opp_shadow_hunter',
    name: '暗影猎手',
    avatar: '🏴‍☠️',
    description: '在黑夜中行动的神秘训练师，专研敏捷型动物。',
    difficulty: 'easy',
    animalTemplates: ['cat_black', 'crow_urban', 'snake_alley'],
    levelRange: [2, 4],
    betMultiplier: 1.3,
  },
  {
    id: 'opp_scrap_king',
    name: '废品之王',
    avatar: '👑',
    description: '垃圾场的统治者，擅长使用防御型动物进行持久战。',
    difficulty: 'normal',
    animalTemplates: ['raccoon_trash', 'rat_sewer', 'turtle_sewer'],
    levelRange: [3, 5],
    betMultiplier: 1.5,
  },
  {
    id: 'opp_steel_legion',
    name: '钢铁军团',
    avatar: '⚔️',
    description: '前军事训练师，专研力量型动物的冲撞战术。',
    difficulty: 'normal',
    animalTemplates: ['dog_stray', 'goat_feral', 'boar_urban'],
    levelRange: [4, 6],
    betMultiplier: 1.6,
  },
  {
    id: 'opp_speed_demon',
    name: '速度恶魔',
    avatar: '💨',
    description: '追求极致速度的疯狂训练师，信奉先下手为强。',
    difficulty: 'normal',
    animalTemplates: ['fox_alley', 'pigeon_city', 'cat_black'],
    levelRange: [4, 7],
    betMultiplier: 1.7,
  },
  {
    id: 'opp_poison_lord',
    name: '毒雾领主',
    avatar: '☠️',
    description: '使用毒系动物的阴险训练师，让对手在痛苦中慢慢倒下。',
    difficulty: 'hard',
    animalTemplates: ['snake_alley', 'rat_sewer', 'crow_urban'],
    levelRange: [5, 8],
    betMultiplier: 2.0,
  },
  {
    id: 'opp_iron_fortress',
    name: '钢铁堡垒',
    avatar: '🏰',
    description: '防御大师，他的动物几乎坚不可摧。',
    difficulty: 'hard',
    animalTemplates: ['turtle_sewer', 'boar_urban', 'goat_feral'],
    levelRange: [6, 9],
    betMultiplier: 2.2,
  },
  {
    id: 'opp_neon_king',
    name: '霓虹王者',
    avatar: '👺',
    description: '斗兽场的传奇冠军，拥有最强的动物阵容。',
    difficulty: 'hard',
    animalTemplates: ['fox_alley', 'cat_black', 'boar_urban'],
    levelRange: [7, 10],
    betMultiplier: 2.5,
  },
];

export const getOpponentTemplate = (id: string): OpponentTemplate | undefined => {
  return OPPONENT_TEMPLATES.find(o => o.id === id);
};

export const getOpponentsByDifficulty = (difficulty: OpponentTemplate['difficulty']): OpponentTemplate[] => {
  return OPPONENT_TEMPLATES.filter(o => o.difficulty === difficulty);
};

export const getRandomOpponent = (difficulty?: OpponentTemplate['difficulty']): OpponentTemplate => {
  const pool = difficulty ? getOpponentsByDifficulty(difficulty) : OPPONENT_TEMPLATES;
  return pool[Math.floor(Math.random() * pool.length)];
};
