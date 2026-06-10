import type { ChapterTemplate, StageTemplate } from '@/types';

export const CHAPTER_TEMPLATES: ChapterTemplate[] = [
  {
    id: 'chapter_1',
    chapterNumber: 1,
    name: '霓虹街头',
    subtitle: '流浪动物的觉醒',
    description: '在霓虹闪烁的城市角落，流浪动物们开始觉醒特殊能力。你将在这里开始你的斗兽场之旅。',
    emoji: '🏙️',
    backgroundImage: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a2a4e 100%)',
    stages: [
      {
        id: 'stage_1_1',
        chapterId: 'chapter_1',
        stageNumber: 1,
        name: '初遇流浪猫',
        description: '一只瘦弱的流浪猫挡住了你的去路，它似乎在测试你的实力。',
        emoji: '🐱',
        difficulty: 'easy',
        enemies: [
          { animalTemplateId: 'cat_stray', level: 1, starLevel: 1, breakthroughTier: 0, skills: ['skill_bite'] },
        ],
        formationPosition: ['front'],
        drops: [
          { type: 'coins', amount: 100, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_common', amount: 1, dropRate: 50 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 500 },
          { type: 'gems', amount: 10 },
          { type: 'material', templateId: 'mat_star_common', amount: 3 },
        ],
        staminaCost: 5,
        narrative: '城市的霓虹灯闪烁着，你第一次踏入这片地下斗兽场的领地。一只流浪猫警觉地盯着你...',
      },
      {
        id: 'stage_1_2',
        chapterId: 'chapter_1',
        stageNumber: 2,
        name: '巷口的野狗',
        description: '一只凶猛的野狗守护着这条小巷，它的獠牙在霓虹下闪闪发光。',
        emoji: '🐕',
        difficulty: 'easy',
        requiredStageId: 'stage_1_1',
        enemies: [
          { animalTemplateId: 'dog_stray', level: 2, starLevel: 1, breakthroughTier: 0, skills: ['skill_bite', 'skill_claw'] },
        ],
        formationPosition: ['front'],
        drops: [
          { type: 'coins', amount: 150, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_common', amount: 1, dropRate: 60 },
          { type: 'part', templateId: 'head_bandage', amount: 1, dropRate: 15 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 600 },
          { type: 'gems', amount: 15 },
          { type: 'material', templateId: 'mat_star_common', amount: 5 },
        ],
        staminaCost: 5,
      },
      {
        id: 'stage_1_3',
        chapterId: 'chapter_1',
        stageNumber: 3,
        name: '下水道鼠群',
        description: '下水道中窜出一群变异老鼠，它们数量众多，需要小心应对。',
        emoji: '🐀',
        difficulty: 'easy',
        requiredStageId: 'stage_1_2',
        enemies: [
          { animalTemplateId: 'rat_sewer', level: 2, starLevel: 1, breakthroughTier: 0, skills: ['skill_bite'] },
          { animalTemplateId: 'rat_sewer', level: 2, starLevel: 1, breakthroughTier: 0, skills: ['skill_poison_fang'] },
        ],
        formationPosition: ['front', 'mid'],
        drops: [
          { type: 'coins', amount: 200, dropRate: 100 },
          { type: 'material', templateId: 'mat_breakthrough_common', amount: 1, dropRate: 40 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 800 },
          { type: 'gems', amount: 15 },
          { type: 'skill', templateId: 'skill_poison_fang', amount: 1 },
        ],
        staminaCost: 5,
      },
      {
        id: 'stage_1_4',
        chapterId: 'chapter_1',
        stageNumber: 4,
        name: '鸽子空袭',
        description: '城市的鸽子发生了变异，它们从空中发起攻击，速度极快。',
        emoji: '🕊️',
        difficulty: 'normal',
        requiredStageId: 'stage_1_3',
        enemies: [
          { animalTemplateId: 'pigeon_city', level: 3, starLevel: 1, breakthroughTier: 0, skills: ['skill_claw', 'skill_thunder_bolt'] },
        ],
        formationPosition: ['back'],
        drops: [
          { type: 'coins', amount: 250, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_common', amount: 2, dropRate: 50 },
          { type: 'part', templateId: 'body_leather', amount: 1, dropRate: 12 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 1000 },
          { type: 'gems', amount: 20 },
          { type: 'material', templateId: 'mat_breakthrough_common', amount: 5 },
        ],
        staminaCost: 8,
      },
      {
        id: 'stage_1_5',
        chapterId: 'chapter_1',
        stageNumber: 5,
        name: '街头霸王',
        description: '号称「街头霸王」的训练师出现了！他手下的流浪动物阵容完整，实力强劲。',
        emoji: '🥊',
        difficulty: 'boss',
        requiredStageId: 'stage_1_4',
        enemies: [
          { animalTemplateId: 'cat_stray', level: 3, starLevel: 1, breakthroughTier: 0, skills: ['skill_bite', 'skill_claw'] },
          { animalTemplateId: 'rat_sewer', level: 3, starLevel: 1, breakthroughTier: 0, skills: ['skill_poison_fang'] },
          { animalTemplateId: 'pigeon_city', level: 3, starLevel: 1, breakthroughTier: 0, skills: ['skill_thunder_bolt'] },
        ],
        formationPosition: ['front', 'mid', 'back'],
        drops: [
          { type: 'coins', amount: 500, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_rare', amount: 1, dropRate: 40 },
          { type: 'material', templateId: 'mat_breakthrough_common', amount: 2, dropRate: 60 },
          { type: 'animal', templateId: 'cat_stray', amount: 1, dropRate: 5 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 2000 },
          { type: 'gems', amount: 50 },
          { type: 'material', templateId: 'mat_star_rare', amount: 3 },
          { type: 'part', templateId: 'weapon_brass', amount: 1 },
        ],
        staminaCost: 15,
        narrative: '「嘿嘿，让我来教教你什么是真正的斗兽场！」街头霸王大笑着派出了他的三只得意战将...',
      },
    ],
  },
  {
    id: 'chapter_2',
    chapterNumber: 2,
    name: '暗影都市',
    subtitle: '黑夜中的猎手',
    description: '当夜幕降临，城市的暗影中潜伏着更危险的对手。敏捷的猎手们在黑暗中等待猎物。',
    emoji: '🌃',
    backgroundImage: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #2a0a2e 100%)',
    requiredCompletedStages: 5,
    stages: [
      {
        id: 'stage_2_1',
        chapterId: 'chapter_2',
        stageNumber: 1,
        name: '暗夜黑猫',
        description: '一只神秘的黑猫在阴影中注视着你，它的眼睛在黑暗中发出诡异的光芒。',
        emoji: '🐈‍⬛',
        difficulty: 'easy',
        enemies: [
          { animalTemplateId: 'cat_black', level: 4, starLevel: 1, breakthroughTier: 0, skills: ['skill_claw', 'skill_poison_fang'] },
        ],
        formationPosition: ['front'],
        drops: [
          { type: 'coins', amount: 300, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_rare', amount: 1, dropRate: 30 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 1200 },
          { type: 'gems', amount: 25 },
          { type: 'material', templateId: 'mat_star_rare', amount: 3 },
        ],
        staminaCost: 8,
      },
      {
        id: 'stage_2_2',
        chapterId: 'chapter_2',
        stageNumber: 2,
        name: '乌鸦群',
        description: '一群变异乌鸦盘旋在头顶，它们擅长协同作战，从多个方向发起攻击。',
        emoji: '🐦',
        difficulty: 'normal',
        requiredStageId: 'stage_2_1',
        enemies: [
          { animalTemplateId: 'crow_urban', level: 4, starLevel: 1, breakthroughTier: 0, skills: ['skill_thunder_bolt'] },
          { animalTemplateId: 'crow_urban', level: 4, starLevel: 1, breakthroughTier: 0, skills: ['skill_claw', 'skill_ice_shard'] },
        ],
        formationPosition: ['mid', 'back'],
        drops: [
          { type: 'coins', amount: 350, dropRate: 100 },
          { type: 'material', templateId: 'mat_breakthrough_rare', amount: 1, dropRate: 25 },
          { type: 'part', templateId: 'head_hood', amount: 1, dropRate: 10 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 1500 },
          { type: 'gems', amount: 30 },
          { type: 'skill', templateId: 'skill_thunder_bolt', amount: 1 },
        ],
        staminaCost: 8,
      },
      {
        id: 'stage_2_3',
        chapterId: 'chapter_2',
        stageNumber: 3,
        name: '胡同毒蛇',
        description: '狭窄的胡同中潜伏着剧毒的蛇类，它们的毒液可以在瞬间麻痹对手。',
        emoji: '🐍',
        difficulty: 'normal',
        requiredStageId: 'stage_2_2',
        enemies: [
          { animalTemplateId: 'snake_alley', level: 5, starLevel: 2, breakthroughTier: 0, skills: ['skill_poison_fang', 'skill_bite'] },
        ],
        formationPosition: ['front'],
        drops: [
          { type: 'coins', amount: 400, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_rare', amount: 2, dropRate: 35 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 1800 },
          { type: 'gems', amount: 30 },
          { type: 'material', templateId: 'mat_breakthrough_rare', amount: 3 },
        ],
        staminaCost: 10,
      },
      {
        id: 'stage_2_4',
        chapterId: 'chapter_2',
        stageNumber: 4,
        name: '暗影猎手',
        description: '传说中的「暗影猎手」现身了！他专研敏捷型动物，信奉先下手为强。',
        emoji: '🏴‍☠️',
        difficulty: 'boss',
        requiredStageId: 'stage_2_3',
        enemies: [
          { animalTemplateId: 'cat_black', level: 5, starLevel: 2, breakthroughTier: 0, skills: ['skill_claw', 'skill_poison_fang'] },
          { animalTemplateId: 'crow_urban', level: 5, starLevel: 1, breakthroughTier: 0, skills: ['skill_thunder_bolt', 'skill_ice_shard'] },
          { animalTemplateId: 'snake_alley', level: 5, starLevel: 1, breakthroughTier: 0, skills: ['skill_poison_fang'] },
        ],
        formationPosition: ['front', 'mid', 'back'],
        drops: [
          { type: 'coins', amount: 800, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_rare', amount: 2, dropRate: 50 },
          { type: 'material', templateId: 'mat_breakthrough_rare', amount: 1, dropRate: 40 },
          { type: 'animal', templateId: 'cat_black', amount: 1, dropRate: 5 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 3000 },
          { type: 'gems', amount: 80 },
          { type: 'material', templateId: 'mat_star_epic', amount: 1 },
          { type: 'part', templateId: 'weapon_shadow', amount: 1 },
        ],
        staminaCost: 20,
        narrative: '「在绝对的速度面前，一切防御都是徒劳！」暗影猎手冷笑着，他的动物们在黑暗中若隐若现...',
      },
    ],
  },
  {
    id: 'chapter_3',
    chapterNumber: 3,
    name: '钢铁废墟',
    subtitle: '力量的碰撞',
    description: '城市边缘的废弃工业区，这里是力量型动物的天下。钢铁般的意志与身躯在这里碰撞。',
    emoji: '🏭',
    backgroundImage: 'linear-gradient(135deg, #1a1a0a 0%, #3e2a1a 50%, #2e1a0a 100%)',
    requiredCompletedStages: 9,
    stages: [
      {
        id: 'stage_3_1',
        chapterId: 'chapter_3',
        stageNumber: 1,
        name: '垃圾场浣熊',
        description: '在垃圾堆中长大的浣熊，拥有惊人的防御力和适应能力。',
        emoji: '🦝',
        difficulty: 'normal',
        enemies: [
          { animalTemplateId: 'raccoon_trash', level: 6, starLevel: 2, breakthroughTier: 0, skills: ['skill_bite', 'skill_heal'] },
        ],
        formationPosition: ['front'],
        drops: [
          { type: 'coins', amount: 450, dropRate: 100 },
          { type: 'material', templateId: 'mat_breakthrough_rare', amount: 1, dropRate: 30 },
          { type: 'part', templateId: 'body_armor', amount: 1, dropRate: 8 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 2000 },
          { type: 'gems', amount: 35 },
          { type: 'skill', templateId: 'skill_heal', amount: 1 },
        ],
        staminaCost: 10,
      },
      {
        id: 'stage_3_2',
        chapterId: 'chapter_3',
        stageNumber: 2,
        name: '钢铁野猪',
        description: '浑身覆盖金属碎片的野猪，它的冲撞可以摧毁一切挡路的东西。',
        emoji: '🐗',
        difficulty: 'normal',
        requiredStageId: 'stage_3_1',
        enemies: [
          { animalTemplateId: 'boar_urban', level: 6, starLevel: 2, breakthroughTier: 0, skills: ['skill_bite', 'skill_charge'] },
        ],
        formationPosition: ['front'],
        drops: [
          { type: 'coins', amount: 500, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_epic', amount: 1, dropRate: 20 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 2200 },
          { type: 'gems', amount: 40 },
          { type: 'material', templateId: 'mat_breakthrough_rare', amount: 5 },
        ],
        staminaCost: 10,
      },
      {
        id: 'stage_3_3',
        chapterId: 'chapter_3',
        stageNumber: 3,
        name: '野山羊群',
        description: '一群凶猛的野山羊，它们擅长团队协作，从多角度发起冲击。',
        emoji: '🐐',
        difficulty: 'hard',
        requiredStageId: 'stage_3_2',
        enemies: [
          { animalTemplateId: 'goat_feral', level: 7, starLevel: 2, breakthroughTier: 0, skills: ['skill_charge', 'skill_bite'] },
          { animalTemplateId: 'goat_feral', level: 6, starLevel: 2, breakthroughTier: 0, skills: ['skill_thunder_bolt'] },
        ],
        formationPosition: ['front', 'mid'],
        drops: [
          { type: 'coins', amount: 600, dropRate: 100 },
          { type: 'material', templateId: 'mat_breakthrough_epic', amount: 1, dropRate: 20 },
          { type: 'part', templateId: 'limbs_boots', amount: 1, dropRate: 8 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 2500 },
          { type: 'gems', amount: 45 },
          { type: 'material', templateId: 'mat_star_epic', amount: 3 },
        ],
        staminaCost: 12,
      },
      {
        id: 'stage_3_4',
        chapterId: 'chapter_3',
        stageNumber: 4,
        name: '下水道鳄龟',
        description: '生活在下水道深处的巨型鳄龟，它的壳几乎坚不可摧。',
        emoji: '🐢',
        difficulty: 'hard',
        requiredStageId: 'stage_3_3',
        enemies: [
          { animalTemplateId: 'turtle_sewer', level: 7, starLevel: 2, breakthroughTier: 1, skills: ['skill_bite', 'skill_heal', 'skill_ice_shard'] },
        ],
        formationPosition: ['front'],
        drops: [
          { type: 'coins', amount: 700, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_epic', amount: 2, dropRate: 30 },
          { type: 'material', templateId: 'mat_breakthrough_epic', amount: 1, dropRate: 25 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 2800 },
          { type: 'gems', amount: 50 },
          { type: 'skill', templateId: 'skill_ice_shard', amount: 1 },
        ],
        staminaCost: 12,
      },
      {
        id: 'stage_3_5',
        chapterId: 'chapter_3',
        stageNumber: 5,
        name: '废品之王',
        description: '垃圾场的统治者「废品之王」出现了！他的动物们拥有最强的防御和耐力。',
        emoji: '👑',
        difficulty: 'boss',
        requiredStageId: 'stage_3_4',
        enemies: [
          { animalTemplateId: 'raccoon_trash', level: 8, starLevel: 2, breakthroughTier: 1, skills: ['skill_bite', 'skill_heal'] },
          { animalTemplateId: 'turtle_sewer', level: 8, starLevel: 2, breakthroughTier: 1, skills: ['skill_bite', 'skill_ice_shard', 'skill_heal'] },
          { animalTemplateId: 'rat_sewer', level: 8, starLevel: 2, breakthroughTier: 0, skills: ['skill_poison_fang'] },
        ],
        formationPosition: ['front', 'mid', 'back'],
        drops: [
          { type: 'coins', amount: 1000, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_epic', amount: 2, dropRate: 50 },
          { type: 'material', templateId: 'mat_breakthrough_epic', amount: 2, dropRate: 40 },
          { type: 'part', templateId: 'body_titanium', amount: 1, dropRate: 10 },
          { type: 'animal', templateId: 'turtle_sewer', amount: 1, dropRate: 5 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 5000 },
          { type: 'gems', amount: 100 },
          { type: 'material', templateId: 'mat_breakthrough_epic', amount: 5 },
          { type: 'part', templateId: 'core_shield', amount: 1 },
        ],
        staminaCost: 25,
        narrative: '「我的城堡，由钢铁和垃圾筑成！想通过？先问问我的龟壳答不答应！」废品之王狂笑着...',
      },
    ],
  },
  {
    id: 'chapter_4',
    chapterNumber: 4,
    name: '霓虹斗兽场',
    subtitle: '终极对决',
    description: '传说中的霓虹斗兽场地下竞技场，只有最强的训练师才能站在这里。你准备好迎接最终挑战了吗？',
    emoji: '🏆',
    backgroundImage: 'linear-gradient(135deg, #2e0a2e 0%, #4e1a4e 50%, #1a0a4e 100%)',
    requiredCompletedStages: 14,
    stages: [
      {
        id: 'stage_4_1',
        chapterId: 'chapter_4',
        stageNumber: 1,
        name: '速度恶魔',
        description: '追求极致速度的疯狂训练师，他的动物们在行动顺序上永远占据优势。',
        emoji: '💨',
        difficulty: 'hard',
        enemies: [
          { animalTemplateId: 'fox_alley', level: 8, starLevel: 3, breakthroughTier: 1, skills: ['skill_claw', 'skill_thunder_wave'] },
          { animalTemplateId: 'pigeon_city', level: 8, starLevel: 2, breakthroughTier: 0, skills: ['skill_thunder_bolt', 'skill_ice_shard'] },
          { animalTemplateId: 'cat_black', level: 8, starLevel: 2, breakthroughTier: 1, skills: ['skill_claw', 'skill_poison_fang'] },
        ],
        formationPosition: ['front', 'mid', 'back'],
        drops: [
          { type: 'coins', amount: 800, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_epic', amount: 2, dropRate: 40 },
          { type: 'material', templateId: 'mat_breakthrough_epic', amount: 1, dropRate: 30 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 3500 },
          { type: 'gems', amount: 60 },
          { type: 'skill', templateId: 'skill_thunder_wave', amount: 1 },
        ],
        staminaCost: 15,
      },
      {
        id: 'stage_4_2',
        chapterId: 'chapter_4',
        stageNumber: 2,
        name: '毒雾领主',
        description: '阴险的「毒雾领主」，他的每一只动物都带有致命的毒素。',
        emoji: '☠️',
        difficulty: 'hard',
        requiredStageId: 'stage_4_1',
        enemies: [
          { animalTemplateId: 'snake_alley', level: 9, starLevel: 3, breakthroughTier: 1, skills: ['skill_poison_fang', 'skill_bite'] },
          { animalTemplateId: 'rat_sewer', level: 9, starLevel: 2, breakthroughTier: 1, skills: ['skill_poison_fang'] },
          { animalTemplateId: 'crow_urban', level: 9, starLevel: 2, breakthroughTier: 1, skills: ['skill_poison_fang', 'skill_thunder_bolt'] },
        ],
        formationPosition: ['front', 'mid', 'back'],
        drops: [
          { type: 'coins', amount: 900, dropRate: 100 },
          { type: 'material', templateId: 'mat_breakthrough_epic', amount: 2, dropRate: 35 },
          { type: 'part', templateId: 'core_poison', amount: 1, dropRate: 8 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 4000 },
          { type: 'gems', amount: 70 },
          { type: 'material', templateId: 'mat_star_legendary', amount: 1 },
        ],
        staminaCost: 15,
      },
      {
        id: 'stage_4_3',
        chapterId: 'chapter_4',
        stageNumber: 3,
        name: '钢铁堡垒',
        description: '防御大师「钢铁堡垒」，他的阵容如同铜墙铁壁，几乎坚不可摧。',
        emoji: '🏰',
        difficulty: 'hard',
        requiredStageId: 'stage_4_2',
        enemies: [
          { animalTemplateId: 'turtle_sewer', level: 10, starLevel: 3, breakthroughTier: 2, skills: ['skill_bite', 'skill_heal', 'skill_ice_shard'] },
          { animalTemplateId: 'boar_urban', level: 10, starLevel: 3, breakthroughTier: 1, skills: ['skill_charge', 'skill_bite'] },
          { animalTemplateId: 'goat_feral', level: 10, starLevel: 2, breakthroughTier: 1, skills: ['skill_charge', 'skill_thunder_bolt'] },
        ],
        formationPosition: ['front', 'mid', 'back'],
        drops: [
          { type: 'coins', amount: 1000, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_legendary', amount: 1, dropRate: 25 },
          { type: 'material', templateId: 'mat_breakthrough_epic', amount: 2, dropRate: 40 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 4500 },
          { type: 'gems', amount: 80 },
          { type: 'material', templateId: 'mat_breakthrough_legendary', amount: 1 },
        ],
        staminaCost: 18,
      },
      {
        id: 'stage_4_4',
        chapterId: 'chapter_4',
        stageNumber: 4,
        name: '霓虹王者',
        description: '斗兽场的传奇冠军「霓虹王者」！他拥有最强的动物阵容，是无数训练师的终极目标。',
        emoji: '👺',
        difficulty: 'boss',
        requiredStageId: 'stage_4_3',
        enemies: [
          { animalTemplateId: 'fox_alley', level: 12, starLevel: 3, breakthroughTier: 2, skills: ['skill_claw', 'skill_thunder_wave', 'skill_charge'] },
          { animalTemplateId: 'cat_black', level: 12, starLevel: 3, breakthroughTier: 2, skills: ['skill_claw', 'skill_poison_fang', 'skill_heal'] },
          { animalTemplateId: 'boar_urban', level: 12, starLevel: 3, breakthroughTier: 2, skills: ['skill_charge', 'skill_bite', 'skill_thunder_bolt'] },
        ],
        formationPosition: ['front', 'mid', 'back'],
        drops: [
          { type: 'coins', amount: 2000, dropRate: 100 },
          { type: 'material', templateId: 'mat_star_legendary', amount: 2, dropRate: 50 },
          { type: 'material', templateId: 'mat_breakthrough_legendary', amount: 1, dropRate: 40 },
          { type: 'part', templateId: 'weapon_legendary', amount: 1, dropRate: 15 },
          { type: 'animal', templateId: 'fox_alley', amount: 1, dropRate: 5 },
        ],
        firstClearRewards: [
          { type: 'coins', amount: 10000 },
          { type: 'gems', amount: 200 },
          { type: 'material', templateId: 'mat_breakthrough_legendary', amount: 3 },
          { type: 'part', templateId: 'core_legendary', amount: 1 },
          { type: 'animal', templateId: 'fox_alley', amount: 1 },
        ],
        staminaCost: 30,
        narrative: '「小子，能走到这里，你确实有两下子。但想成为真正的霓虹王者，你得先打败我！」传说中的冠军放出了他的三只神兽...',
      },
    ],
  },
];

export const STORY_CONSTANTS = {
  MAX_STAMINA: 100,
  STAMINA_REGEN_RATE: 1,
  STAMINA_REGEN_INTERVAL_MS: 5 * 60 * 1000,
  CHAPTER_UNLOCK_STAGES_REQUIRED: 5,
  STAGE_UNLOCK_REQUIRED: true,
} as const;

export const getChapterTemplate = (id: string): ChapterTemplate | undefined => {
  return CHAPTER_TEMPLATES.find(c => c.id === id);
};

export const getStageTemplate = (id: string): StageTemplate | undefined => {
  for (const chapter of CHAPTER_TEMPLATES) {
    const stage = chapter.stages.find(s => s.id === id);
    if (stage) return stage;
  }
  return undefined;
};

export const getAllStageTemplates = (): StageTemplate[] => {
  return CHAPTER_TEMPLATES.flatMap(c => c.stages);
};

export const getChapterStages = (chapterId: string): StageTemplate[] => {
  const chapter = getChapterTemplate(chapterId);
  return chapter?.stages || [];
};

export const getDifficultyColor = (difficulty: StageTemplate['difficulty']): string => {
  const colors: Record<StageTemplate['difficulty'], string> = {
    easy: '#44cc44',
    normal: '#ffcc00',
    hard: '#ff8800',
    boss: '#ff2244',
  };
  return colors[difficulty];
};

export const getDifficultyName = (difficulty: StageTemplate['difficulty']): string => {
  const names: Record<StageTemplate['difficulty'], string> = {
    easy: '简单',
    normal: '普通',
    hard: '困难',
    boss: 'BOSS',
  };
  return names[difficulty];
};

export const getDifficultyEmoji = (difficulty: StageTemplate['difficulty']): string => {
  const emojis: Record<StageTemplate['difficulty'], string> = {
    easy: '🟢',
    normal: '🟡',
    hard: '🟠',
    boss: '💀',
  };
  return emojis[difficulty];
};
