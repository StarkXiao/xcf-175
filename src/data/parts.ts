import type { PartTemplate, PartSlot, Rarity, PartQuality, PartSetConfig } from '@/types';

export const QUALITY_MULTIPLIER: Record<PartQuality, number> = {
  1: 1.0,
  2: 1.1,
  3: 1.25,
  4: 1.45,
  5: 1.7,
};

export const QUALITY_NAMES: Record<PartQuality, string> = {
  1: '普通',
  2: '精良',
  3: '稀有',
  4: '史诗',
  5: '传说',
};

export const QUALITY_COLORS: Record<PartQuality, string> = {
  1: '#9ca3af',
  2: '#22c55e',
  3: '#3b82f6',
  4: '#a855f7',
  5: '#f59e0b',
};

export const QUALITY_REFINE_COST: Record<PartQuality, number> = {
  1: 0,
  2: 200,
  3: 500,
  4: 1200,
  5: 0,
};

export const PART_SETS: PartSetConfig[] = [
  {
    id: 'set_blaze',
    name: '烈焰',
    emoji: '🔥',
    color: '#ff4400',
    bonuses: [
      { pieces: 2, stats: { atk: 10 }, description: '攻击力 +10' },
      { pieces: 4, stats: { atk: 20, crit: 15 }, description: '攻击力 +20，暴击率 +15%' },
    ],
  },
  {
    id: 'set_frost',
    name: '寒冰',
    emoji: '❄️',
    color: '#00ccff',
    bonuses: [
      { pieces: 2, stats: { def: 10 }, description: '防御力 +10' },
      { pieces: 4, stats: { def: 20, hp: 50 }, description: '防御力 +20，生命 +50' },
    ],
  },
  {
    id: 'set_thunder',
    name: '雷霆',
    emoji: '⚡',
    color: '#ffee00',
    bonuses: [
      { pieces: 2, stats: { spd: 10 }, description: '速度 +10' },
      { pieces: 4, stats: { spd: 20, atk: 10 }, description: '速度 +20，攻击力 +10' },
    ],
  },
  {
    id: 'set_mech',
    name: '机甲',
    emoji: '🤖',
    color: '#06b6d4',
    bonuses: [
      { pieces: 2, stats: { hp: 30, def: 5 }, description: '生命 +30，防御力 +5' },
      { pieces: 4, stats: { hp: 80, def: 15, spd: 5 }, description: '生命 +80，防御力 +15，速度 +5' },
    ],
  },
  {
    id: 'set_shadow',
    name: '暗影',
    emoji: '🌑',
    color: '#aa00ff',
    bonuses: [
      { pieces: 2, stats: { spd: 5, atk: 5 }, description: '速度 +5，攻击力 +5' },
      { pieces: 4, stats: { spd: 10, atk: 15, crit: 10 }, description: '速度 +10，攻击力 +15，暴击率 +10%' },
    ],
  },
];

export const getPartSet = (setId: string): PartSetConfig | undefined => {
  return PART_SETS.find(s => s.id === setId);
};

export const getActiveSetBonuses = (
  equippedParts: { partId: string; slot: string; setId?: string }[]
): { setId: string; setName: string; emoji: string; color: string; bonus: { pieces: number; stats: { hp?: number; atk?: number; def?: number; spd?: number; crit?: number }; description: string }; count: number }[] => {
  const setCounts: Record<string, number> = {};
  for (const ep of equippedParts) {
    if (ep.setId) {
      setCounts[ep.setId] = (setCounts[ep.setId] || 0) + 1;
    }
  }

  const results: { setId: string; setName: string; emoji: string; color: string; bonus: { pieces: number; stats: { hp?: number; atk?: number; def?: number; spd?: number; crit?: number }; description: string }; count: number }[] = [];

  for (const [setId, count] of Object.entries(setCounts)) {
    const setConfig = getPartSet(setId);
    if (!setConfig) continue;

    for (const bonus of setConfig.bonuses) {
      if (count >= bonus.pieces) {
        results.push({
          setId,
          setName: setConfig.name,
          emoji: setConfig.emoji,
          color: setConfig.color,
          bonus,
          count,
        });
      }
    }
  }

  return results;
};

export const computeSetBonusStats = (
  equippedParts: { partId: string; slot: string; setId?: string }[]
): { hp: number; atk: number; def: number; spd: number; crit: number } => {
  const active = getActiveSetBonuses(equippedParts);
  const result = { hp: 0, atk: 0, def: 0, spd: 0, crit: 0 };
  for (const entry of active) {
    result.hp += entry.bonus.stats.hp || 0;
    result.atk += entry.bonus.stats.atk || 0;
    result.def += entry.bonus.stats.def || 0;
    result.spd += entry.bonus.stats.spd || 0;
    result.crit += entry.bonus.stats.crit || 0;
  }
  return result;
};

export const rollPartQuality = (rarity: Rarity): PartQuality => {
  const roll = Math.random() * 100;
  if (rarity >= 5) {
    if (roll < 5) return 5;
    if (roll < 25) return 4;
    if (roll < 60) return 3;
    if (roll < 90) return 2;
    return 1;
  }
  if (rarity >= 4) {
    if (roll < 2) return 5;
    if (roll < 15) return 4;
    if (roll < 45) return 3;
    if (roll < 80) return 2;
    return 1;
  }
  if (rarity >= 3) {
    if (roll < 1) return 5;
    if (roll < 8) return 4;
    if (roll < 30) return 3;
    if (roll < 70) return 2;
    return 1;
  }
  if (roll < 3) return 4;
  if (roll < 18) return 3;
  if (roll < 55) return 2;
  return 1;
};

export const PART_TEMPLATES: PartTemplate[] = [
  {
    id: 'head_visor',
    name: '光学护目镜',
    slot: 'head',
    rarity: 2,
    stats: { spd: 5 },
    emoji: '🥽',
    price: 100,
  },
  {
    id: 'head_mohawk',
    name: '霓虹莫霍克',
    slot: 'head',
    rarity: 3,
    stats: { atk: 8 },
    emoji: '💈',
    price: 200,
  },
  {
    id: 'head_helmet',
    name: '战术头盔',
    slot: 'head',
    rarity: 3,
    stats: { hp: 20, def: 5 },
    emoji: '⛑️',
    price: 250,
  },
  {
    id: 'head_horn',
    name: '等离子角',
    slot: 'head',
    rarity: 4,
    stats: { atk: 15 },
    emoji: '🦏',
    price: 400,
  },
  {
    id: 'head_crown',
    name: '电子王冠',
    slot: 'head',
    rarity: 5,
    stats: { atk: 10, spd: 10, hp: 15 },
    emoji: '👑',
    price: 800,
  },
  {
    id: 'head_blaze_helm',
    name: '烈焰战盔',
    slot: 'head',
    rarity: 4,
    stats: { atk: 12, hp: 10 },
    emoji: '🔥',
    price: 420,
    setId: 'set_blaze',
  },
  {
    id: 'head_frost_circlet',
    name: '寒冰头冠',
    slot: 'head',
    rarity: 4,
    stats: { def: 12, hp: 15 },
    emoji: '🧊',
    price: 420,
    setId: 'set_frost',
  },
  {
    id: 'head_thunder_visors',
    name: '雷霆护目镜',
    slot: 'head',
    rarity: 4,
    stats: { spd: 15, atk: 5 },
    emoji: '⚡',
    price: 430,
    setId: 'set_thunder',
  },
  {
    id: 'head_mech_helmet',
    name: '机甲战盔',
    slot: 'head',
    rarity: 3,
    stats: { hp: 25, def: 8 },
    emoji: '🤖',
    price: 280,
    setId: 'set_mech',
  },
  {
    id: 'head_shadow_mask',
    name: '暗影面具',
    slot: 'head',
    rarity: 4,
    stats: { spd: 10, atk: 8 },
    emoji: '🎭',
    price: 410,
    setId: 'set_shadow',
  },
  {
    id: 'body_armor',
    name: '防弹背心',
    slot: 'body',
    rarity: 2,
    stats: { def: 10 },
    emoji: '🎽',
    price: 120,
  },
  {
    id: 'body_plate',
    name: '碳纤维装甲',
    slot: 'body',
    rarity: 3,
    stats: { def: 18, hp: 15 },
    emoji: '🦾',
    price: 280,
  },
  {
    id: 'body_reactor',
    name: '微型反应堆',
    slot: 'body',
    rarity: 4,
    stats: { atk: 12, hp: 30 },
    emoji: '⚛️',
    price: 500,
  },
  {
    id: 'body_titanium',
    name: '钛合金骨架',
    slot: 'body',
    rarity: 5,
    stats: { def: 30, hp: 50 },
    emoji: '🔩',
    price: 900,
  },
  {
    id: 'body_blaze_plate',
    name: '烈焰胸甲',
    slot: 'body',
    rarity: 4,
    stats: { atk: 10, hp: 25 },
    emoji: '🁡',
    price: 520,
    setId: 'set_blaze',
  },
  {
    id: 'body_frost_armor',
    name: '寒冰铠甲',
    slot: 'body',
    rarity: 4,
    stats: { def: 22, hp: 20 },
    emoji: '🛡️',
    price: 530,
    setId: 'set_frost',
  },
  {
    id: 'body_thunder_core',
    name: '雷霆躯干',
    slot: 'body',
    rarity: 4,
    stats: { spd: 12, hp: 20 },
    emoji: '🌩️',
    price: 510,
    setId: 'set_thunder',
  },
  {
    id: 'body_mech_chassis',
    name: '机甲躯干',
    slot: 'body',
    rarity: 3,
    stats: { hp: 30, def: 12 },
    emoji: '🔩',
    price: 290,
    setId: 'set_mech',
  },
  {
    id: 'body_shadow_cloak',
    name: '暗影斗篷',
    slot: 'body',
    rarity: 4,
    stats: { spd: 8, atk: 10 },
    emoji: '🧥',
    price: 500,
    setId: 'set_shadow',
  },
  {
    id: 'limbs_blades',
    name: '折叠利刃',
    slot: 'limbs',
    rarity: 3,
    stats: { atk: 12, spd: 3 },
    emoji: '🗡️',
    price: 220,
  },
  {
    id: 'limbs_boost',
    name: '推进器',
    slot: 'limbs',
    rarity: 3,
    stats: { spd: 15 },
    emoji: '🚀',
    price: 240,
  },
  {
    id: 'limbs_hydraulic',
    name: '液压肢体',
    slot: 'limbs',
    rarity: 4,
    stats: { atk: 18, def: 8 },
    emoji: '🦿',
    price: 450,
  },
  {
    id: 'limbs_spring',
    name: '弹簧腿',
    slot: 'limbs',
    rarity: 4,
    stats: { spd: 25 },
    emoji: '🦘',
    price: 480,
  },
  {
    id: 'limbs_blaze_fists',
    name: '烈焰拳套',
    slot: 'limbs',
    rarity: 4,
    stats: { atk: 16, spd: 5 },
    emoji: '🥊',
    price: 460,
    setId: 'set_blaze',
  },
  {
    id: 'limbs_frost_gauntlets',
    name: '寒冰护臂',
    slot: 'limbs',
    rarity: 4,
    stats: { def: 14, spd: 5 },
    emoji: '🧤',
    price: 440,
    setId: 'set_frost',
  },
  {
    id: 'limbs_thunder_legs',
    name: '雷霆腿甲',
    slot: 'limbs',
    rarity: 4,
    stats: { spd: 18, atk: 5 },
    emoji: '🦿',
    price: 470,
    setId: 'set_thunder',
  },
  {
    id: 'limbs_mech_arms',
    name: '机甲臂甲',
    slot: 'limbs',
    rarity: 3,
    stats: { def: 10, hp: 15 },
    emoji: '🦾',
    price: 250,
    setId: 'set_mech',
  },
  {
    id: 'limbs_shadow_greaves',
    name: '暗影胫甲',
    slot: 'limbs',
    rarity: 4,
    stats: { spd: 12, def: 6 },
    emoji: '👢',
    price: 440,
    setId: 'set_shadow',
  },
  {
    id: 'weapon_claw',
    name: '热能爪',
    slot: 'weapon',
    rarity: 3,
    stats: { atk: 20 },
    emoji: '🔪',
    price: 300,
  },
  {
    id: 'weapon_laser',
    name: '激光眼',
    slot: 'weapon',
    rarity: 4,
    stats: { atk: 28 },
    emoji: '🔫',
    price: 550,
  },
  {
    id: 'weapon_plasma',
    name: '等离子炮',
    slot: 'weapon',
    rarity: 5,
    stats: { atk: 40 },
    emoji: '💣',
    price: 1000,
  },
  {
    id: 'weapon_chain',
    name: '锁链',
    slot: 'weapon',
    rarity: 2,
    stats: { atk: 10, spd: 5 },
    emoji: '⛓️',
    price: 150,
  },
  {
    id: 'weapon_blaze_sword',
    name: '烈焰之刃',
    slot: 'weapon',
    rarity: 5,
    stats: { atk: 35, spd: 5 },
    emoji: '🗡️',
    price: 1100,
    setId: 'set_blaze',
  },
  {
    id: 'weapon_frost_spear',
    name: '寒冰长矛',
    slot: 'weapon',
    rarity: 5,
    stats: { atk: 25, def: 15 },
    emoji: '🔱',
    price: 1050,
    setId: 'set_frost',
  },
  {
    id: 'weapon_thunder_hammer',
    name: '雷霆之锤',
    slot: 'weapon',
    rarity: 5,
    stats: { atk: 30, spd: 8 },
    emoji: '🔨',
    price: 1080,
    setId: 'set_thunder',
  },
  {
    id: 'weapon_mech_cannon',
    name: '机甲加农',
    slot: 'weapon',
    rarity: 4,
    stats: { atk: 22, hp: 15 },
    emoji: '🎯',
    price: 580,
    setId: 'set_mech',
  },
  {
    id: 'weapon_shadow_dagger',
    name: '暗影匕首',
    slot: 'weapon',
    rarity: 4,
    stats: { atk: 24, spd: 8 },
    emoji: '🗡️',
    price: 560,
    setId: 'set_shadow',
  },
  {
    id: 'core_cpu',
    name: '战斗CPU',
    slot: 'core',
    rarity: 3,
    stats: { atk: 8, def: 8, spd: 8 },
    emoji: '💻',
    price: 350,
  },
  {
    id: 'core_ai',
    name: 'AI芯片',
    slot: 'core',
    rarity: 4,
    stats: { atk: 12, def: 12, spd: 12 },
    emoji: '🤖',
    price: 600,
  },
  {
    id: 'core_quantum',
    name: '量子核心',
    slot: 'core',
    rarity: 5,
    stats: { atk: 20, def: 20, spd: 20, hp: 30 },
    emoji: '💎',
    price: 1200,
  },
  {
    id: 'core_battery',
    name: '高效电池',
    slot: 'core',
    rarity: 2,
    stats: { hp: 25 },
    emoji: '🔋',
    price: 180,
  },
  {
    id: 'core_blaze_engine',
    name: '烈焰引擎',
    slot: 'core',
    rarity: 4,
    stats: { atk: 15, spd: 5 },
    emoji: '🔥',
    price: 620,
    setId: 'set_blaze',
  },
  {
    id: 'core_frost_crystal',
    name: '寒冰晶体',
    slot: 'core',
    rarity: 4,
    stats: { def: 15, hp: 20 },
    emoji: '❄️',
    price: 600,
    setId: 'set_frost',
  },
  {
    id: 'core_thunder_spark',
    name: '雷霆火花',
    slot: 'core',
    rarity: 4,
    stats: { spd: 18, atk: 5 },
    emoji: '⚡',
    price: 610,
    setId: 'set_thunder',
  },
  {
    id: 'core_mech_processor',
    name: '机甲处理器',
    slot: 'core',
    rarity: 3,
    stats: { hp: 20, def: 10, spd: 5 },
    emoji: '💻',
    price: 360,
    setId: 'set_mech',
  },
  {
    id: 'core_shadow_module',
    name: '暗影模组',
    slot: 'core',
    rarity: 4,
    stats: { spd: 10, atk: 10 },
    emoji: '🌑',
    price: 590,
    setId: 'set_shadow',
  },
  {
    id: 'special_cloak',
    name: '光学迷彩',
    slot: 'special',
    rarity: 4,
    stats: { spd: 10, def: 10 },
    emoji: '🥋',
    price: 550,
  },
  {
    id: 'special_shield',
    name: '能量护盾',
    slot: 'special',
    rarity: 4,
    stats: { def: 25, hp: 20 },
    emoji: '🛡️',
    price: 650,
  },
  {
    id: 'special_regen',
    name: '再生装置',
    slot: 'special',
    rarity: 5,
    stats: { hp: 50 },
    emoji: '💊',
    price: 1100,
  },
  {
    id: 'special_nano',
    name: '纳米机器人',
    slot: 'special',
    rarity: 5,
    stats: { hp: 30, atk: 15, def: 15 },
    emoji: '🧬',
    price: 1300,
  },
  {
    id: 'special_blaze_core',
    name: '烈焰核心',
    slot: 'special',
    rarity: 5,
    stats: { atk: 25, spd: 8 },
    emoji: '☄️',
    price: 1250,
    setId: 'set_blaze',
  },
  {
    id: 'special_frost_ward',
    name: '寒冰结界',
    slot: 'special',
    rarity: 5,
    stats: { def: 25, hp: 40 },
    emoji: '💠',
    price: 1200,
    setId: 'set_frost',
  },
  {
    id: 'special_thunder_coil',
    name: '雷霆线圈',
    slot: 'special',
    rarity: 5,
    stats: { spd: 22, atk: 10 },
    emoji: '🌀',
    price: 1220,
    setId: 'set_thunder',
  },
  {
    id: 'special_mech_field',
    name: '机甲力场',
    slot: 'special',
    rarity: 4,
    stats: { hp: 35, def: 12 },
    emoji: '🔵',
    price: 660,
    setId: 'set_mech',
  },
  {
    id: 'special_shadow_veil',
    name: '暗影之幕',
    slot: 'special',
    rarity: 5,
    stats: { spd: 15, atk: 18 },
    emoji: '👁️',
    price: 1280,
    setId: 'set_shadow',
  },
];

export const getPartTemplate = (id: string): PartTemplate | undefined => {
  return PART_TEMPLATES.find(p => p.id === id);
};

export const getPartsBySlot = (slot: PartSlot): PartTemplate[] => {
  return PART_TEMPLATES.filter(p => p.slot === slot);
};

export const getPartsByRarity = (rarity: Rarity): PartTemplate[] => {
  return PART_TEMPLATES.filter(p => p.rarity === rarity);
};
