import type {
  LabMaterialTemplate,
  PartSynthesisRecipe,
  SkillModificationRecipe,
  ProbabilityExperiment,
  Rarity,
} from '@/types';
import { PART_TEMPLATES } from './parts';
import { SKILL_TEMPLATES } from './skills';
import { MATERIAL_TEMPLATES } from './materials';

export const LAB_MATERIAL_TEMPLATES: LabMaterialTemplate[] = [
  {
    id: 'lab_synthesis_dust',
    name: '合成粉尘',
    description: '基础的合成材料，用于部件合成。',
    emoji: '✨',
    rarity: 1,
    type: 'synthesis',
  },
  {
    id: 'lab_synthesis_crystal',
    name: '合成晶体',
    description: '精炼的合成材料，提高合成成功率。',
    emoji: '💎',
    rarity: 2,
    type: 'synthesis',
  },
  {
    id: 'lab_synthesis_core',
    name: '合成核心',
    description: '稀有的合成核心，用于高级部件合成。',
    emoji: '🔮',
    rarity: 3,
    type: 'synthesis',
  },
  {
    id: 'lab_synthesis_prism',
    name: '合成棱镜',
    description: '传说级合成材料，大幅提高合成成功率。',
    emoji: '🌈',
    rarity: 4,
    type: 'synthesis',
  },
  {
    id: 'lab_modify_chip',
    name: '改造芯片',
    description: '基础的技能改造材料。',
    emoji: '💾',
    rarity: 1,
    type: 'modification',
  },
  {
    id: 'lab_modify_processor',
    name: '改造处理器',
    description: '中级技能改造材料，提升改造效果。',
    emoji: '⚙️',
    rarity: 2,
    type: 'modification',
  },
  {
    id: 'lab_modify_ai',
    name: '改造AI核心',
    description: '高级技能改造材料，解锁特殊改造。',
    emoji: '🤖',
    rarity: 3,
    type: 'modification',
  },
  {
    id: 'lab_modify_quantum',
    name: '量子改造器',
    description: '传说级改造材料，实现极限改造。',
    emoji: '⚛️',
    rarity: 4,
    type: 'modification',
  },
  {
    id: 'lab_experiment_flask',
    name: '实验烧瓶',
    description: '基础实验材料，用于概率试验。',
    emoji: '🧪',
    rarity: 1,
    type: 'experiment',
  },
  {
    id: 'lab_experiment_catalyst',
    name: '催化剂',
    description: '实验催化剂，提高稀有奖励概率。',
    emoji: '⚗️',
    rarity: 2,
    type: 'experiment',
  },
  {
    id: 'lab_experiment_reactor',
    name: '实验反应堆',
    description: '高级实验设备，解锁稀有试验。',
    emoji: '☢️',
    rarity: 3,
    type: 'experiment',
  },
  {
    id: 'lab_rare_essence',
    name: '稀有精华',
    description: '极其稀有的材料，用于顶级研发。',
    emoji: '🌟',
    rarity: 5,
    type: 'rare',
  },
];

export const getLabMaterialTemplate = (id: string): LabMaterialTemplate | undefined => {
  return LAB_MATERIAL_TEMPLATES.find(m => m.id === id);
};

export const PART_SYNTHESIS_RECIPES: PartSynthesisRecipe[] = [
  {
    id: 'synth_head_visor',
    name: '光学护目镜合成',
    description: '合成基础的光学护目镜部件。',
    targetPartTemplateId: 'head_visor',
    targetRarity: 2,
    materials: [
      { templateId: 'lab_synthesis_dust', count: 5 },
      { templateId: 'mat_star_shard_1', count: 2 },
    ],
    coinCost: 100,
    successRate: 80,
    failureReturnRate: 50,
  },
  {
    id: 'synth_head_mohawk',
    name: '霓虹莫霍克合成',
    description: '合成稀有的霓虹莫霍克部件。',
    targetPartTemplateId: 'head_mohawk',
    targetRarity: 3,
    materials: [
      { templateId: 'lab_synthesis_dust', count: 10 },
      { templateId: 'lab_synthesis_crystal', count: 3 },
      { templateId: 'mat_star_shard_2', count: 2 },
    ],
    coinCost: 300,
    successRate: 65,
    failureReturnRate: 40,
  },
  {
    id: 'synth_head_helmet',
    name: '战术头盔合成',
    description: '合成坚固的战术头盔部件。',
    targetPartTemplateId: 'head_helmet',
    targetRarity: 3,
    materials: [
      { templateId: 'lab_synthesis_dust', count: 12 },
      { templateId: 'lab_synthesis_crystal', count: 4 },
      { templateId: 'mat_star_shard_2', count: 3 },
    ],
    coinCost: 350,
    successRate: 60,
    failureReturnRate: 40,
  },
  {
    id: 'synth_head_horn',
    name: '等离子角合成',
    description: '合成强力的等离子角部件。',
    targetPartTemplateId: 'head_horn',
    targetRarity: 4,
    materials: [
      { templateId: 'lab_synthesis_crystal', count: 8 },
      { templateId: 'lab_synthesis_core', count: 3 },
      { templateId: 'mat_star_shard_3', count: 2 },
    ],
    coinCost: 800,
    successRate: 45,
    failureReturnRate: 30,
  },
  {
    id: 'synth_body_armor',
    name: '防弹背心合成',
    description: '合成基础的防弹背心部件。',
    targetPartTemplateId: 'body_armor',
    targetRarity: 2,
    materials: [
      { templateId: 'lab_synthesis_dust', count: 6 },
      { templateId: 'mat_star_shard_1', count: 3 },
    ],
    coinCost: 120,
    successRate: 75,
    failureReturnRate: 50,
  },
  {
    id: 'synth_body_plate',
    name: '碳纤维装甲合成',
    description: '合成稀有的碳纤维装甲部件。',
    targetPartTemplateId: 'body_plate',
    targetRarity: 3,
    materials: [
      { templateId: 'lab_synthesis_dust', count: 15 },
      { templateId: 'lab_synthesis_crystal', count: 5 },
      { templateId: 'mat_star_shard_2', count: 3 },
    ],
    coinCost: 400,
    successRate: 55,
    failureReturnRate: 35,
  },
  {
    id: 'synth_body_reactor',
    name: '微型反应堆合成',
    description: '合成强大的微型反应堆部件。',
    targetPartTemplateId: 'body_reactor',
    targetRarity: 4,
    materials: [
      { templateId: 'lab_synthesis_crystal', count: 10 },
      { templateId: 'lab_synthesis_core', count: 4 },
      { templateId: 'mat_star_shard_3', count: 3 },
    ],
    coinCost: 900,
    successRate: 40,
    failureReturnRate: 30,
  },
  {
    id: 'synth_limbs_blades',
    name: '折叠利刃合成',
    description: '合成锋利的折叠利刃部件。',
    targetPartTemplateId: 'limbs_blades',
    targetRarity: 3,
    materials: [
      { templateId: 'lab_synthesis_dust', count: 10 },
      { templateId: 'lab_synthesis_crystal', count: 3 },
      { templateId: 'mat_star_shard_2', count: 2 },
    ],
    coinCost: 300,
    successRate: 60,
    failureReturnRate: 40,
  },
  {
    id: 'synth_limbs_boost',
    name: '推进器合成',
    description: '合成高速推进器部件。',
    targetPartTemplateId: 'limbs_boost',
    targetRarity: 3,
    materials: [
      { templateId: 'lab_synthesis_dust', count: 8 },
      { templateId: 'lab_synthesis_crystal', count: 4 },
      { templateId: 'mat_star_shard_2', count: 2 },
    ],
    coinCost: 320,
    successRate: 58,
    failureReturnRate: 40,
  },
  {
    id: 'synth_weapon_claw',
    name: '热能爪合成',
    description: '合成灼热的热能爪武器。',
    targetPartTemplateId: 'weapon_claw',
    targetRarity: 3,
    materials: [
      { templateId: 'lab_synthesis_dust', count: 12 },
      { templateId: 'lab_synthesis_crystal', count: 4 },
      { templateId: 'mat_star_shard_2', count: 3 },
    ],
    coinCost: 400,
    successRate: 55,
    failureReturnRate: 35,
  },
  {
    id: 'synth_weapon_laser',
    name: '激光眼合成',
    description: '合成强力的激光眼武器。',
    targetPartTemplateId: 'weapon_laser',
    targetRarity: 4,
    materials: [
      { templateId: 'lab_synthesis_crystal', count: 10 },
      { templateId: 'lab_synthesis_core', count: 5 },
      { templateId: 'mat_star_shard_3', count: 3 },
    ],
    coinCost: 1000,
    successRate: 35,
    failureReturnRate: 25,
  },
  {
    id: 'synth_core_cpu',
    name: '战斗CPU合成',
    description: '合成平衡的战斗CPU核心部件。',
    targetPartTemplateId: 'core_cpu',
    targetRarity: 3,
    materials: [
      { templateId: 'lab_synthesis_dust', count: 10 },
      { templateId: 'lab_synthesis_crystal', count: 5 },
      { templateId: 'mat_star_shard_2', count: 3 },
    ],
    coinCost: 450,
    successRate: 50,
    failureReturnRate: 35,
  },
  {
    id: 'synth_core_ai',
    name: 'AI芯片合成',
    description: '合成智能AI芯片核心部件。',
    targetPartTemplateId: 'core_ai',
    targetRarity: 4,
    materials: [
      { templateId: 'lab_synthesis_crystal', count: 12 },
      { templateId: 'lab_synthesis_core', count: 5 },
      { templateId: 'mat_star_shard_3', count: 3 },
    ],
    coinCost: 1100,
    successRate: 38,
    failureReturnRate: 25,
  },
  {
    id: 'synth_head_crown',
    name: '电子王冠合成',
    description: '合成传说级的电子王冠部件。',
    targetPartTemplateId: 'head_crown',
    targetRarity: 5,
    materials: [
      { templateId: 'lab_synthesis_core', count: 8 },
      { templateId: 'lab_synthesis_prism', count: 3 },
      { templateId: 'lab_rare_essence', count: 1 },
      { templateId: 'mat_star_shard_4', count: 2 },
    ],
    coinCost: 2000,
    successRate: 20,
    failureReturnRate: 20,
  },
  {
    id: 'synth_body_titanium',
    name: '钛合金骨架合成',
    description: '合成传说级的钛合金骨架部件。',
    targetPartTemplateId: 'body_titanium',
    targetRarity: 5,
    materials: [
      { templateId: 'lab_synthesis_core', count: 10 },
      { templateId: 'lab_synthesis_prism', count: 4 },
      { templateId: 'lab_rare_essence', count: 1 },
      { templateId: 'mat_star_shard_4', count: 3 },
    ],
    coinCost: 2500,
    successRate: 18,
    failureReturnRate: 20,
  },
  {
    id: 'synth_weapon_plasma',
    name: '等离子炮合成',
    description: '合成传说级的等离子炮武器。',
    targetPartTemplateId: 'weapon_plasma',
    targetRarity: 5,
    materials: [
      { templateId: 'lab_synthesis_core', count: 10 },
      { templateId: 'lab_synthesis_prism', count: 5 },
      { templateId: 'lab_rare_essence', count: 2 },
      { templateId: 'mat_star_shard_4', count: 3 },
    ],
    coinCost: 3000,
    successRate: 15,
    failureReturnRate: 15,
  },
  {
    id: 'synth_core_quantum',
    name: '量子核心合成',
    description: '合成传说级的量子核心部件。',
    targetPartTemplateId: 'core_quantum',
    targetRarity: 5,
    materials: [
      { templateId: 'lab_synthesis_core', count: 12 },
      { templateId: 'lab_synthesis_prism', count: 6 },
      { templateId: 'lab_rare_essence', count: 2 },
      { templateId: 'mat_star_shard_4', count: 4 },
    ],
    coinCost: 3500,
    successRate: 12,
    failureReturnRate: 15,
  },
];

export const getPartSynthesisRecipe = (id: string): PartSynthesisRecipe | undefined => {
  return PART_SYNTHESIS_RECIPES.find(r => r.id === id);
};

export const getSynthesisRecipesByRarity = (rarity: Rarity): PartSynthesisRecipe[] => {
  return PART_SYNTHESIS_RECIPES.filter(r => r.targetRarity === rarity);
};

export const SKILL_MODIFICATION_RECIPES: SkillModificationRecipe[] = [
  {
    id: 'mod_damage_1',
    name: '伤害强化I型',
    description: '提升技能伤害10%。',
    targetSkillTemplateId: 'skill_bite',
    materials: [
      { templateId: 'lab_modify_chip', count: 5 },
      { templateId: 'lab_synthesis_dust', count: 3 },
    ],
    coinCost: 200,
    successRate: 70,
    effects: {
      damageBonus: 10,
    },
  },
  {
    id: 'mod_damage_2',
    name: '伤害强化II型',
    description: '提升技能伤害20%。',
    targetSkillTemplateId: 'skill_claw',
    materials: [
      { templateId: 'lab_modify_chip', count: 10 },
      { templateId: 'lab_modify_processor', count: 3 },
    ],
    coinCost: 500,
    successRate: 55,
    effects: {
      damageBonus: 20,
    },
  },
  {
    id: 'mod_cd_1',
    name: '冷却缩减I型',
    description: '减少技能冷却1回合。',
    targetSkillTemplateId: 'skill_heal',
    materials: [
      { templateId: 'lab_modify_chip', count: 8 },
      { templateId: 'lab_modify_processor', count: 2 },
    ],
    coinCost: 400,
    successRate: 60,
    effects: {
      cooldownReduction: 1,
    },
  },
  {
    id: 'mod_cd_2',
    name: '冷却缩减II型',
    description: '减少技能冷却2回合。',
    targetSkillTemplateId: 'skill_thunder',
    materials: [
      { templateId: 'lab_modify_processor', count: 8 },
      { templateId: 'lab_modify_ai', count: 2 },
    ],
    coinCost: 1000,
    successRate: 40,
    effects: {
      cooldownReduction: 2,
    },
  },
  {
    id: 'mod_status_fire',
    name: '灼烧附加',
    description: '为技能附加灼烧效果。',
    targetSkillTemplateId: 'skill_bite',
    materials: [
      { templateId: 'lab_modify_chip', count: 10 },
      { templateId: 'lab_modify_processor', count: 5 },
      { templateId: 'mat_bt_fire_2', count: 3 },
    ],
    coinCost: 600,
    successRate: 45,
    effects: {
      addStatusEffect: {
        type: 'burn',
        chance: 30,
        duration: 2,
        damage: 8,
      },
    },
  },
  {
    id: 'mod_status_ice',
    name: '冰冻附加',
    description: '为技能附加冰冻效果。',
    targetSkillTemplateId: 'skill_claw',
    materials: [
      { templateId: 'lab_modify_chip', count: 10 },
      { templateId: 'lab_modify_processor', count: 5 },
      { templateId: 'mat_bt_ice_2', count: 3 },
    ],
    coinCost: 650,
    successRate: 40,
    effects: {
      addStatusEffect: {
        type: 'freeze',
        chance: 25,
        duration: 2,
        damage: 0,
      },
    },
  },
  {
    id: 'mod_status_thunder',
    name: '麻痹附加',
    description: '为技能附加麻痹效果。',
    targetSkillTemplateId: 'skill_thunder',
    materials: [
      { templateId: 'lab_modify_processor', count: 8 },
      { templateId: 'lab_modify_ai', count: 3 },
      { templateId: 'mat_bt_thunder_3', count: 2 },
    ],
    coinCost: 1200,
    successRate: 35,
    effects: {
      addStatusEffect: {
        type: 'paralysis',
        chance: 35,
        duration: 2,
        damage: 0,
      },
    },
  },
  {
    id: 'mod_status_poison',
    name: '剧毒附加',
    description: '为技能附加剧毒效果。',
    targetSkillTemplateId: 'skill_poison_fang',
    materials: [
      { templateId: 'lab_modify_chip', count: 12 },
      { templateId: 'lab_modify_processor', count: 6 },
      { templateId: 'mat_bt_nature_2', count: 4 },
    ],
    coinCost: 700,
    successRate: 50,
    effects: {
      statusEffectChanceBonus: 20,
    },
  },
  {
    id: 'mod_ultimate_damage',
    name: '极限伤害改造',
    description: '大幅提升技能伤害35%。',
    targetSkillTemplateId: 'skill_thunder_wave',
    materials: [
      { templateId: 'lab_modify_ai', count: 5 },
      { templateId: 'lab_modify_quantum', count: 2 },
      { templateId: 'lab_rare_essence', count: 1 },
    ],
    coinCost: 2500,
    successRate: 25,
    effects: {
      damageBonus: 35,
    },
  },
  {
    id: 'mod_combo_enhance',
    name: '连击强化',
    description: '提升技能连击伤害和触发率。',
    targetSkillTemplateId: 'skill_double_strike',
    materials: [
      { templateId: 'lab_modify_processor', count: 10 },
      { templateId: 'lab_modify_ai', count: 4 },
      { templateId: 'lab_synthesis_prism', count: 2 },
    ],
    coinCost: 1500,
    successRate: 30,
    effects: {
      damageBonus: 15,
      statusEffectChanceBonus: 15,
    },
  },
];

export const getSkillModificationRecipe = (id: string): SkillModificationRecipe | undefined => {
  return SKILL_MODIFICATION_RECIPES.find(r => r.id === id);
};

export const getModificationRecipesBySkill = (skillTemplateId: string): SkillModificationRecipe[] => {
  return SKILL_MODIFICATION_RECIPES.filter(r => r.targetSkillTemplateId === skillTemplateId);
};

export const PROBABILITY_EXPERIMENTS: ProbabilityExperiment[] = [
  {
    id: 'exp_basic',
    name: '基础试验',
    description: '基础的概率试验，有机会获得各种材料和部件。',
    emoji: '🧪',
    materials: [
      { templateId: 'lab_experiment_flask', count: 3 },
    ],
    coinCost: 100,
    rewards: [
      { type: 'coins', amount: 50, weight: 30 },
      { type: 'material', templateId: 'lab_synthesis_dust', amount: 2, weight: 25 },
      { type: 'material', templateId: 'lab_modify_chip', amount: 2, weight: 20 },
      { type: 'material', templateId: 'lab_experiment_flask', amount: 2, weight: 15 },
      { type: 'part', rarity: 2, weight: 7 },
      { type: 'skill', rarity: 2, weight: 3 },
    ],
    guaranteedRarity: 1,
  },
  {
    id: 'exp_standard',
    name: '标准试验',
    description: '标准概率试验，稀有物品概率提升。',
    emoji: '⚗️',
    materials: [
      { templateId: 'lab_experiment_flask', count: 5 },
      { templateId: 'lab_experiment_catalyst', count: 2 },
    ],
    coinCost: 300,
    rewards: [
      { type: 'coins', amount: 150, weight: 20 },
      { type: 'material', templateId: 'lab_synthesis_crystal', amount: 2, weight: 20 },
      { type: 'material', templateId: 'lab_modify_processor', amount: 2, weight: 18 },
      { type: 'material', templateId: 'lab_experiment_catalyst', amount: 2, weight: 12 },
      { type: 'part', rarity: 3, weight: 15 },
      { type: 'skill', rarity: 3, weight: 10 },
      { type: 'part', rarity: 4, weight: 4 },
      { type: 'skill', rarity: 4, weight: 1 },
    ],
    guaranteedRarity: 2,
  },
  {
    id: 'exp_advanced',
    name: '高级试验',
    description: '高级概率试验，高价值奖励概率大幅提升。',
    emoji: '🔬',
    materials: [
      { templateId: 'lab_experiment_catalyst', count: 5 },
      { templateId: 'lab_experiment_reactor', count: 2 },
    ],
    coinCost: 800,
    rewards: [
      { type: 'coins', amount: 400, weight: 15 },
      { type: 'gems', amount: 2, weight: 10 },
      { type: 'material', templateId: 'lab_synthesis_core', amount: 2, weight: 18 },
      { type: 'material', templateId: 'lab_modify_ai', amount: 2, weight: 15 },
      { type: 'part', rarity: 3, weight: 15 },
      { type: 'skill', rarity: 3, weight: 12 },
      { type: 'part', rarity: 4, weight: 10 },
      { type: 'skill', rarity: 4, weight: 4 },
      { type: 'part', rarity: 5, weight: 1 },
    ],
    guaranteedRarity: 3,
  },
  {
    id: 'exp_legendary',
    name: '传说试验',
    description: '顶级概率试验，有机会获得传说级物品。',
    emoji: '🌟',
    materials: [
      { templateId: 'lab_experiment_reactor', count: 5 },
      { templateId: 'lab_rare_essence', count: 1 },
    ],
    coinCost: 2000,
    rewards: [
      { type: 'coins', amount: 1000, weight: 10 },
      { type: 'gems', amount: 5, weight: 8 },
      { type: 'material', templateId: 'lab_synthesis_prism', amount: 2, weight: 15 },
      { type: 'material', templateId: 'lab_modify_quantum', amount: 2, weight: 12 },
      { type: 'part', rarity: 4, weight: 20 },
      { type: 'skill', rarity: 4, weight: 15 },
      { type: 'part', rarity: 5, weight: 12 },
      { type: 'skill', rarity: 5, weight: 8 },
    ],
    guaranteedRarity: 4,
  },
  {
    id: 'exp_part_special',
    name: '部件专精试验',
    description: '专注于部件的概率试验，获得部件概率大幅提升。',
    emoji: '🔩',
    materials: [
      { templateId: 'lab_experiment_flask', count: 8 },
      { templateId: 'lab_synthesis_dust', count: 5 },
    ],
    coinCost: 400,
    rewards: [
      { type: 'material', templateId: 'lab_synthesis_dust', amount: 3, weight: 20 },
      { type: 'material', templateId: 'lab_synthesis_crystal', amount: 2, weight: 18 },
      { type: 'part', rarity: 2, weight: 20 },
      { type: 'part', rarity: 3, weight: 22 },
      { type: 'part', rarity: 4, weight: 15 },
      { type: 'part', rarity: 5, weight: 5 },
    ],
    guaranteedRarity: 2,
  },
  {
    id: 'exp_skill_special',
    name: '技能专精试验',
    description: '专注于技能的概率试验，获得技能概率大幅提升。',
    emoji: '⚡',
    materials: [
      { templateId: 'lab_experiment_flask', count: 8 },
      { templateId: 'lab_modify_chip', count: 5 },
    ],
    coinCost: 450,
    rewards: [
      { type: 'material', templateId: 'lab_modify_chip', amount: 3, weight: 20 },
      { type: 'material', templateId: 'lab_modify_processor', amount: 2, weight: 18 },
      { type: 'skill', rarity: 2, weight: 22 },
      { type: 'skill', rarity: 3, weight: 22 },
      { type: 'skill', rarity: 4, weight: 13 },
      { type: 'skill', rarity: 5, weight: 5 },
    ],
    guaranteedRarity: 2,
  },
];

export const getProbabilityExperiment = (id: string): ProbabilityExperiment | undefined => {
  return PROBABILITY_EXPERIMENTS.find(e => e.id === id);
};

export const getMaterialTemplate = (id: string): unknown => {
  const labMat = LAB_MATERIAL_TEMPLATES.find(m => m.id === id);
  if (labMat) return labMat;
  return MATERIAL_TEMPLATES.find(m => m.id === id);
};

export const isLabMaterial = (id: string): boolean => {
  return LAB_MATERIAL_TEMPLATES.some(m => m.id === id);
};

export const isStandardMaterial = (id: string): boolean => {
  return MATERIAL_TEMPLATES.some(m => m.id === id);
};
