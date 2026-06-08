import type { Animal, Equipment, Skill, Modification, Stage, Stats, PlayerData } from '../types'

export const getElementColor = (element: string): string => {
  const colors: Record<string, string> = {
    fire: '#ff4444',
    water: '#4488ff',
    electric: '#ffdd00',
    poison: '#aa44ff',
    normal: '#aaaaaa',
    cyber: '#00ffff',
  }
  return colors[element] || '#ffffff'
}

export const getRarityColor = (rarity: string): string => {
  const colors: Record<string, string> = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
  }
  return colors[rarity] || '#ffffff'
}

export const calculatePower = (animal: Animal): number => {
  const { maxHp, attack, defense, speed } = animal.currentStats
  return Math.floor(maxHp / 10 + attack * 2 + defense * 1.5 + speed * 1.2)
}

export const calculateTeamPower = (animals: Animal[]): number => {
  return animals.reduce((sum, a) => sum + calculatePower(a), 0)
}

export const createAnimal = (
  name: string,
  icon: string,
  element: Animal['element'],
  rarity: Animal['rarity'],
  baseStats: Stats,
  level: number = 1
): Animal => {
  const levelMultiplier = 1 + (level - 1) * 0.1
  const currentStats = {
    maxHp: Math.floor(baseStats.maxHp * levelMultiplier),
    attack: Math.floor(baseStats.attack * levelMultiplier),
    defense: Math.floor(baseStats.defense * levelMultiplier),
    speed: Math.floor(baseStats.speed * levelMultiplier),
  }

  return {
    id: `animal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    icon,
    element,
    rarity,
    level,
    exp: 0,
    expToNext: level * 100,
    baseStats: { ...baseStats },
    currentStats: { ...currentStats, hp: currentStats.maxHp },
    skills: [{ ...initialSkills[0], currentCooldown: 0 }],
    equipment: [null, null, null],
    modifications: [],
    statusEffects: [],
    isDeployed: false,
    position: null,
  }
}

export const initialAnimals: Animal[] = [
  createAnimal('流浪橘猫', '🐱', 'fire', 'common', { maxHp: 100, attack: 15, defense: 8, speed: 12 }, 1),
  createAnimal('废墟哈士奇', '🐺', 'normal', 'common', { maxHp: 120, attack: 18, defense: 10, speed: 10 }, 1),
  createAnimal('电子麻雀', '🐦', 'electric', 'rare', { maxHp: 80, attack: 22, defense: 5, speed: 18 }, 1),
]

export const initialSkills: Skill[] = [
  {
    id: 'skill_bite',
    name: '撕咬',
    description: '对敌方单体造成100%攻击力的伤害',
    icon: '🦷',
    element: 'normal',
    type: 'active',
    trigger: 'attack',
    cooldown: 0,
    currentCooldown: 0,
    maxLevel: 5,
    level: 1,
    cost: 0,
    power: 100,
    chance: 100,
  },
  {
    id: 'skill_fireball',
    name: '烈焰吐息',
    description: '发射火焰弹，对敌方单体造成150%攻击力的火焰伤害，有30%几率点燃',
    icon: '🔥',
    element: 'fire',
    type: 'active',
    trigger: 'attack',
    cooldown: 2,
    currentCooldown: 0,
    maxLevel: 5,
    level: 1,
    cost: 500,
    power: 150,
    chance: 30,
  },
  {
    id: 'skill_thunder',
    name: '雷霆一击',
    description: '召唤雷电攻击敌方，造成120%攻击力的电系伤害，有25%几率麻痹',
    icon: '⚡',
    element: 'electric',
    type: 'active',
    trigger: 'attack',
    cooldown: 2,
    currentCooldown: 0,
    maxLevel: 5,
    level: 1,
    cost: 500,
    power: 120,
    chance: 25,
  },
  {
    id: 'skill_poison',
    name: '毒液喷射',
    description: '喷射毒液造成80%伤害，并使目标中毒3回合，每回合损失5%生命',
    icon: '☠️',
    element: 'poison',
    type: 'active',
    trigger: 'attack',
    cooldown: 3,
    currentCooldown: 0,
    maxLevel: 5,
    level: 1,
    cost: 600,
    power: 80,
    chance: 100,
  },
  {
    id: 'skill_heal',
    name: '自愈',
    description: '恢复自身30%最大生命值',
    icon: '💚',
    element: 'normal',
    type: 'active',
    trigger: 'turnStart',
    cooldown: 3,
    currentCooldown: 0,
    maxLevel: 5,
    level: 1,
    cost: 800,
    power: 30,
    chance: 100,
  },
  {
    id: 'skill_shield',
    name: '能量护盾',
    description: '获得护盾，本回合防御力提升100%',
    icon: '🛡️',
    element: 'cyber',
    type: 'active',
    trigger: 'defend',
    cooldown: 3,
    currentCooldown: 0,
    maxLevel: 5,
    level: 1,
    cost: 700,
    power: 100,
    chance: 100,
  },
  {
    id: 'skill_berserk',
    name: '狂暴',
    description: '生命值低于30%时，攻击力提升50%',
    icon: '😤',
    element: 'fire',
    type: 'passive',
    trigger: 'turnStart',
    cooldown: 0,
    currentCooldown: 0,
    maxLevel: 5,
    level: 1,
    cost: 1000,
    power: 50,
    chance: 100,
  },
  {
    id: 'skill_freeze',
    name: '冰冻光束',
    description: '发射冰冻光线造成90%伤害，有40%几率冻结目标1回合',
    icon: '❄️',
    element: 'water',
    type: 'active',
    trigger: 'attack',
    cooldown: 3,
    currentCooldown: 0,
    maxLevel: 5,
    level: 1,
    cost: 800,
    power: 90,
    chance: 40,
  },
  {
    id: 'skill_laser',
    name: '激光眼',
    description: '发射高能激光，对敌方全体造成60%攻击力的伤害',
    icon: '👁️',
    element: 'cyber',
    type: 'active',
    trigger: 'attack',
    cooldown: 4,
    currentCooldown: 0,
    maxLevel: 5,
    level: 1,
    cost: 1500,
    power: 60,
    chance: 100,
  },
]

export const initialEquipment: Equipment[] = [
  {
    id: 'equip_knife',
    name: '霓虹匕首',
    description: '改装的电子匕首，锋利无比',
    icon: '🔪',
    type: 'weapon',
    rarity: 'common',
    stats: { attack: 10 },
    price: 300,
  },
  {
    id: 'equip_sword',
    name: '等离子长剑',
    description: '高温等离子体构成的能量剑',
    icon: '⚔️',
    type: 'weapon',
    rarity: 'rare',
    stats: { attack: 25 },
    price: 800,
  },
  {
    id: 'equip_hammer',
    name: '重力战锤',
    description: '内置重力发生器的重型战锤',
    icon: '🔨',
    type: 'weapon',
    rarity: 'epic',
    stats: { attack: 40, speed: -5 },
    price: 1500,
  },
  {
    id: 'equip_armor',
    name: '废铁护甲',
    description: '用废墟金属拼凑的护甲',
    icon: '🛡️',
    type: 'armor',
    rarity: 'common',
    stats: { defense: 8, maxHp: 20 },
    price: 300,
  },
  {
    id: 'equip_vest',
    name: '防弹背心',
    description: '军用级别的防护装备',
    icon: '🦺',
    type: 'armor',
    rarity: 'rare',
    stats: { defense: 20, maxHp: 50 },
    price: 800,
  },
  {
    id: 'equip_shield',
    name: '能量护盾',
    description: '便携式能量护盾发生器',
    icon: '🔰',
    type: 'armor',
    rarity: 'epic',
    stats: { defense: 35, maxHp: 80 },
    price: 1500,
  },
  {
    id: 'equip_ring',
    name: '速度指环',
    description: '嵌入神经刺激器的指环',
    icon: '💍',
    type: 'accessory',
    rarity: 'common',
    stats: { speed: 10 },
    price: 300,
  },
  {
    id: 'equip_charm',
    name: '幸运护符',
    description: '据说能带来好运的神秘护符',
    icon: '🍀',
    type: 'accessory',
    rarity: 'rare',
    stats: { attack: 10, speed: 10 },
    price: 800,
  },
  {
    id: 'equip_core',
    name: '能量核心',
    description: '高能生物能量核心，全面提升属性',
    icon: '💎',
    type: 'accessory',
    rarity: 'legendary',
    stats: { maxHp: 100, attack: 20, defense: 15, speed: 15 },
    price: 3000,
  },
]

export const initialModifications: Modification[] = [
  {
    id: 'mod_muscle',
    name: '肌肉强化',
    description: '基因改造强化肌肉纤维',
    icon: '💪',
    statBonus: { attack: 15 },
    price: 500,
  },
  {
    id: 'mod_bone',
    name: '骨骼强化',
    description: '金属骨骼移植，提升防御力',
    icon: '🦴',
    statBonus: { defense: 15, maxHp: 30 },
    price: 500,
  },
  {
    id: 'mod_heart',
    name: '心脏加速',
    description: '植入式心脏起搏器',
    icon: '❤️',
    statBonus: { speed: 15, maxHp: 20 },
    price: 500,
  },
  {
    id: 'mod_brain',
    name: '神经芯片',
    description: '大脑植入计算芯片，全面提升',
    icon: '🧠',
    statBonus: { attack: 10, defense: 10, speed: 10 },
    price: 1000,
  },
  {
    id: 'mod_dna',
    name: 'DNA重组',
    description: '完全改写基因序列',
    icon: '🧬',
    statBonus: { maxHp: 80, attack: 25, defense: 20, speed: 20 },
    price: 2500,
  },
]

export const createStages = (): Stage[] => {
  const stageNames = [
    '废墟小巷', '霓虹街区', '电子市场', '地下拳场', '机械工厂',
    '黑客巢穴', '能量电厂', '变异实验室', '摩天大楼', '核心控制区',
    '量子领域', '异次元门', '时空裂缝', '最终审判', '无尽深渊',
  ]

  const enemyTemplates = [
    { name: '疯狗', icon: '🐕', element: 'normal' as const, stats: { maxHp: 80, attack: 12, defense: 5, speed: 10 } },
    { name: '毒鼠', icon: '🐀', element: 'poison' as const, stats: { maxHp: 60, attack: 15, defense: 3, speed: 14 } },
    { name: '电鳗', icon: '🐍', element: 'electric' as const, stats: { maxHp: 70, attack: 18, defense: 4, speed: 12 } },
    { name: '火猫', icon: '🐈‍⬛', element: 'fire' as const, stats: { maxHp: 90, attack: 20, defense: 6, speed: 11 } },
    { name: '冰蛙', icon: '🐸', element: 'water' as const, stats: { maxHp: 100, attack: 14, defense: 10, speed: 8 } },
    { name: '机械犬', icon: '🤖', element: 'cyber' as const, stats: { maxHp: 120, attack: 22, defense: 12, speed: 9 } },
    { name: '毒蜘蛛', icon: '🕷️', element: 'poison' as const, stats: { maxHp: 85, attack: 25, defense: 5, speed: 13 } },
    { name: '雷鸟', icon: '🦅', element: 'electric' as const, stats: { maxHp: 75, attack: 28, defense: 4, speed: 16 } },
    { name: '熔岩巨兽', icon: '🦎', element: 'fire' as const, stats: { maxHp: 150, attack: 30, defense: 15, speed: 7 } },
    { name: '量子幽灵', icon: '👻', element: 'cyber' as const, stats: { maxHp: 100, attack: 35, defense: 8, speed: 18 } },
  ]

  const stages: Stage[] = []

  for (let i = 1; i <= 10; i++) {
    const enemyCount = Math.min(3, 1 + Math.floor(i / 3))
    const levelMultiplier = 1 + (i - 1) * 0.2
    const basePower = 50 + i * 30

    const enemies: Animal[] = []
    for (let j = 0; j < enemyCount; j++) {
      const template = enemyTemplates[(i + j - 1) % enemyTemplates.length]
      const level = i + j
      const stats = {
        maxHp: Math.floor(template.stats.maxHp * levelMultiplier),
        attack: Math.floor(template.stats.attack * levelMultiplier),
        defense: Math.floor(template.stats.defense * levelMultiplier),
        speed: Math.floor(template.stats.speed * levelMultiplier),
      }
      const enemy = createAnimal(template.name, template.icon, template.element, 'common', stats, level)
      enemies.push(enemy)
    }

    stages.push({
      id: i,
      name: stageNames[i - 1] || `第 ${i} 区`,
      requiredPower: basePower * enemyCount,
      enemies,
      reward: {
        coins: 100 * i * enemyCount,
        exp: 50 * i,
      },
    })
  }

  return stages
}

export const createInitialPlayerState = (): PlayerData => {
  const animals = initialAnimals.map((animal, index) => ({
    ...animal,
    id: `animal_initial_${index}`,
    isDeployed: index < 2,
    position: index < 2 ? index : null,
    skills: [{ ...initialSkills[0], id: `skill_${index}_bite`, currentCooldown: 0 }],
  }))

  return {
    coins: 2000,
    gems: 50,
    animals,
    equipment: [],
    skills: initialSkills.filter((s) => s.id !== 'skill_bite'),
    modifications: [],
    lineup: [
      { position: 0, animalId: animals[0]?.id || null },
      { position: 1, animalId: animals[1]?.id || null },
      { position: 2, animalId: null },
    ],
    currentStage: 1,
    highestStage: 1,
    unlockedStages: 5,
    totalWins: 0,
    totalLosses: 0,
  }
}
