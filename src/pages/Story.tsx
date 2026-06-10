import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  MapPin,
  Lock,
  CheckCircle,
  Star,
  ChevronRight,
  ArrowLeft,
  X,
  Swords,
  Gift,
  Coins,
  Gem,
  Sparkles,
  Crown,
  Zap,
  Clock,
  Shield,
  Heart,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { AnimalCard } from '@/components/AnimalCard';
import { SkillIcon } from '@/components/SkillIcon';
import { useStoryStore } from '@/store/useStoryStore';
import { useGameStore } from '@/store/useGameStore';
import {
  CHAPTER_TEMPLATES,
  getChapterTemplate,
  getStageTemplate,
  getDifficultyColor,
  getDifficultyName,
  getDifficultyEmoji,
  STORY_CONSTANTS,
} from '@/data/story';
import { getAnimalTemplate } from '@/data/animals';
import { getSkillTemplate } from '@/data/skills';
import { getMaterialTemplate } from '@/data/materials';
import { getPartTemplate } from '@/data/parts';
import {
  ELEMENT_EMOJIS,
  ELEMENT_COLORS,
  STAR_LEVEL_NAMES,
  BREAKTHROUGH_TIER_NAMES,
} from '@/engine/constants';
import { getRarityColor, formatNumber } from '@/utils/format';
import type { StageDrop, StageFirstClearReward } from '@/types';

const TYPE_EMOJIS: Record<string, string> = {
  coins: '💰',
  gems: '💎',
  material: '📦',
  animal: '🐾',
  part: '🔧',
  skill: '⚡',
};

const TYPE_NAMES: Record<string, string> = {
  coins: '金币',
  gems: '宝石',
  material: '材料',
  animal: '动物',
  part: '部件',
  skill: '技能',
};

export default function Story() {
  const navigate = useNavigate();
  const {
    storyData,
    isInitialized,
    selectedChapterId,
    selectedStageId,
    showStageDetail,
    battleResult,
    showBattleResult,
    initStory,
    setSelectedChapter,
    setSelectedStage,
    setShowStageDetail,
    setShowBattleResult,
    isChapterUnlocked,
    isStageUnlocked,
    isStageCompleted,
    isStageFirstCleared,
    getChapterProgress,
    getStageProgress,
    getTotalCompletedStages,
    getTotalCompletedStagesInChapter,
    getCurrentStamina,
    startStageBattle,
  } = useStoryStore();

  const { lineup, getLineupAnimals, player } = useGameStore();

  const [stamina, setStamina] = useState(0);
  const [nextStaminaTime, setNextStaminaTime] = useState(0);
  const [battleLoading, setBattleLoading] = useState(false);
  const [battleMessage, setBattleMessage] = useState('');

  useEffect(() => {
    initStory();
  }, [initStory]);

  useEffect(() => {
    if (isInitialized) {
      setStamina(getCurrentStamina());
      const interval = setInterval(() => {
        setStamina(getCurrentStamina());
        if (storyData && storyData.totalStamina < storyData.maxStamina) {
          const now = Date.now();
          const timeSinceLastRegen = now - storyData.lastStaminaRegenTime;
          const nextRegenTime = STORY_CONSTANTS.STAMINA_REGEN_INTERVAL_MS - (timeSinceLastRegen % STORY_CONSTANTS.STAMINA_REGEN_INTERVAL_MS);
          setNextStaminaTime(Math.ceil(nextRegenTime / 1000));
        } else {
          setNextStaminaTime(0);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isInitialized, getCurrentStamina, storyData]);

  const currentChapter = useMemo(() => getChapterTemplate(selectedChapterId), [selectedChapterId]);
  const selectedStage = useMemo(() => selectedStageId ? getStageTemplate(selectedStageId) : null, [selectedStageId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStageClick = (stageId: string) => {
    if (!isStageUnlocked(stageId)) return;
    setSelectedStage(stageId);
    setShowStageDetail(true);
  };

  const handleStartBattle = async () => {
    if (!selectedStageId || battleLoading) return;
    if (lineup.length === 0) {
      setBattleMessage('请先在「阵容编辑」中选择出战动物');
      setTimeout(() => setBattleMessage(''), 3000);
      return;
    }

    setBattleLoading(true);
    setBattleMessage('');

    await new Promise(resolve => setTimeout(resolve, 500));

    const result = startStageBattle(selectedStageId);
    if (!result.success) {
      setBattleMessage(result.message || '战斗启动失败');
      setTimeout(() => setBattleMessage(''), 3000);
    }
    setBattleLoading(false);
  };

  const getStagePosition = (stageNumber: number, totalStages: number) => {
    const angle = (stageNumber - 1) * (360 / totalStages) * (Math.PI / 180);
    const radius = 35;
    const centerX = 50;
    const centerY = 50;
    const x = centerX + radius * Math.cos(angle - Math.PI / 2);
    const y = centerY + radius * Math.sin(angle - Math.PI / 2);
    return { x, y };
  };

  const renderRewardItem = (reward: StageDrop | StageFirstClearReward, isFirstClear: boolean = false) => {
    let emoji = TYPE_EMOJIS[reward.type] || '🎁';
    let name = TYPE_NAMES[reward.type] || '奖励';
    let color = '#ffffff';

    if (reward.templateId) {
      switch (reward.type) {
        case 'material': {
          const template = getMaterialTemplate(reward.templateId);
          if (template) {
            emoji = template.emoji;
            name = template.name;
            color = getRarityColor(template.rarity);
          }
          break;
        }
        case 'animal': {
          const template = getAnimalTemplate(reward.templateId);
          if (template) {
            emoji = template.emoji;
            name = template.name;
            color = getRarityColor(template.rarity);
          }
          break;
        }
        case 'part': {
          const template = getPartTemplate(reward.templateId);
          if (template) {
            emoji = template.emoji;
            name = template.name;
            color = getRarityColor(template.rarity);
          }
          break;
        }
        case 'skill': {
          const template = getSkillTemplate(reward.templateId);
          if (template) {
            emoji = template.emoji;
            name = template.name;
            color = getRarityColor(template.rarity);
          }
          break;
        }
      }
    }

    return (
      <div
        key={`${reward.type}-${reward.templateId || 'default'}-${isFirstClear}`}
        className={`flex items-center gap-2 p-2 rounded-lg border ${
          isFirstClear
            ? 'bg-cyber-yellow/10 border-cyber-yellow/30'
            : 'bg-cyber-dark/50 border-gray-700/50'
        }`}
      >
        <span className="text-xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate" style={{ color }}>
            {name}
          </div>
          <div className="text-[10px] text-gray-500">
            ×{reward.amount}
            {isFirstClear && (
              <span className="ml-1 text-cyber-yellow">首通</span>
            )}
            {'dropRate' in reward && (
              <span className="ml-1 text-gray-400">({reward.dropRate}%)</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStageNode = (stageId: string, stageNumber: number, totalStages: number) => {
    const stage = getStageTemplate(stageId);
    if (!stage) return null;

    const unlocked = isStageUnlocked(stageId);
    const completed = isStageCompleted(stageId);
    const firstCleared = isStageFirstCleared(stageId);
    const isSelected = selectedStageId === stageId;
    const isBoss = stage.difficulty === 'boss';

    const pos = getStagePosition(stageNumber, totalStages);

    const diffColor = getDifficultyColor(stage.difficulty);

    return (
      <div
        key={stageId}
        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${
          isSelected ? 'scale-125 z-20' : 'hover:scale-110 z-10'
        }`}
        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        onClick={() => handleStageClick(stageId)}
      >
        <div
          className={`relative w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
            isBoss ? 'w-16 h-16' : ''
          } ${
            !unlocked
              ? 'bg-gray-800/80 border-gray-700 opacity-50 cursor-not-allowed'
              : completed
              ? 'bg-gradient-to-br from-cyber-green/20 to-cyber-cyan/20 border-cyber-green/50 shadow-lg shadow-cyber-green/20'
              : isSelected
              ? 'bg-gradient-to-br from-cyber-purple/30 to-cyber-pink/30 border-cyber-purple shadow-lg shadow-cyber-purple/30'
              : 'bg-gradient-to-br from-cyber-dark to-gray-800 border-gray-600 hover:border-cyber-cyan/50'
          }`}
        >
          {!unlocked ? (
            <Lock className="w-5 h-5 text-gray-500" />
          ) : completed ? (
            <div className="relative">
              <span>{stage.emoji}</span>
              <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 text-cyber-green" />
            </div>
          ) : (
            <span>{stage.emoji}</span>
          )}

          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold"
            style={{ backgroundColor: `${diffColor}30`, color: diffColor }}
          >
            {stageNumber}
          </div>

          {isBoss && (
            <Crown className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 text-cyber-yellow" />
          )}

          {firstCleared && (
            <Star className="absolute -top-1 -left-1 w-3 h-3 text-cyber-yellow fill-cyber-yellow" />
          )}
        </div>
      </div>
    );
  };

  if (!isInitialized || !storyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-darker">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-cyber-cyan/30 animate-ping" />
            <div className="absolute inset-4 rounded-full border-4 border-cyber-purple animate-spin" />
          </div>
          <h2 className="text-2xl font-cyber font-bold text-cyber-cyan animate-pulse">
            加载中...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="sticky top-0 bg-cyber-darker/95 backdrop-blur-sm z-40 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <NeonButton size="sm" variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4" />
              </NeonButton>
              <div>
                <h1 className="text-2xl font-cyber font-bold text-cyber-pink">
                  剧情闯关
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  已通关 {getTotalCompletedStages()} / {CHAPTER_TEMPLATES.reduce((s, c) => s + c.stages.length, 0)} 关
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-dark/50 rounded-lg border border-cyber-yellow/30">
                <Zap className="w-4 h-4 text-cyber-yellow" />
                <span className="font-cyber font-bold text-cyber-yellow text-sm">
                  {stamina}/{storyData.maxStamina}
                </span>
                {nextStaminaTime > 0 && (
                  <span className="text-[10px] text-gray-500">
                    +1 ({formatTime(nextStaminaTime)})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-dark/50 rounded-lg border border-cyber-yellow/30">
                <Coins className="w-4 h-4 text-cyber-yellow" />
                <span className="font-cyber font-bold text-cyber-yellow text-sm">
                  {formatNumber(player.coins)}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-dark/50 rounded-lg border border-cyber-purple/30">
                <Gem className="w-4 h-4 text-cyber-purple" />
                <span className="font-cyber font-bold text-cyber-purple text-sm">
                  {formatNumber(player.gems)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {CHAPTER_TEMPLATES.map(chapter => {
            const unlocked = isChapterUnlocked(chapter.id);
            const isSelected = selectedChapterId === chapter.id;
            const progress = getChapterProgress(chapter.id);
            const completed = progress ? getTotalCompletedStagesInChapter(chapter.id) : 0;
            const total = chapter.stages.length;

            return (
              <button
                key={chapter.id}
                onClick={() => unlocked && setSelectedChapter(chapter.id)}
                disabled={!unlocked}
                className={`shrink-0 px-4 py-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'bg-cyber-cyan/20 border-cyber-cyan shadow-lg shadow-cyber-cyan/20'
                    : unlocked
                    ? 'bg-cyber-dark/50 border-gray-700 hover:border-cyber-cyan/50'
                    : 'bg-gray-900/50 border-gray-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{chapter.emoji}</span>
                  <div className="text-left">
                    <div className={`font-cyber font-bold text-sm ${isSelected ? 'text-cyber-cyan' : 'text-gray-300'}`}>
                      第{chapter.chapterNumber}章 {chapter.name}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {unlocked ? `${completed}/${total}关` : `需通关${chapter.requiredCompletedStages || 0}关解锁`}
                    </div>
                  </div>
                  {!unlocked && <Lock className="w-4 h-4 text-gray-500 ml-2" />}
                </div>
                {unlocked && (
                  <div className="h-1.5 bg-gray-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${isSelected ? 'bg-cyber-cyan' : 'bg-gray-600'}`}
                      style={{ width: `${(completed / total) * 100}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {currentChapter && (
          <div
            className="relative rounded-2xl border-2 border-gray-700/50 overflow-hidden mb-8"
            style={{ background: currentChapter.backgroundImage }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-cyber-darker/80" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">{currentChapter.emoji}</span>
                    <div>
                      <h2 className="text-2xl font-cyber font-bold text-white">
                        第{currentChapter.chapterNumber}章 {currentChapter.name}
                      </h2>
                      <p className="text-cyber-pink font-cyber text-sm mt-0.5">
                        {currentChapter.subtitle}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm max-w-xl">
                    {currentChapter.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-cyber font-bold text-white">
                    {getTotalCompletedStagesInChapter(currentChapter.id)}/{currentChapter.stages.length}
                  </div>
                  <div className="text-xs text-gray-500">关卡进度</div>
                </div>
              </div>

              <div className="relative h-80">
                {currentChapter.stages.map((stage, index) => (
                  renderStageNode(stage.id, stage.stageNumber, currentChapter.stages.length)
                ))}

                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {currentChapter.stages.map((stage, index) => {
                    if (index === 0) return null;
                    const pos1 = getStagePosition(index, currentChapter.stages.length);
                    const pos2 = getStagePosition(index + 1, currentChapter.stages.length);
                    const prevStageId = currentChapter.stages[index - 1].id;
                    const currentStageId = stage.id;
                    const prevCompleted = isStageCompleted(prevStageId);
                    const currentUnlocked = isStageUnlocked(currentStageId);

                    return (
                      <line
                        key={`line-${index}`}
                        x1={`${pos1.x}%`}
                        y1={`${pos1.y}%`}
                        x2={`${pos2.x}%`}
                        y2={`${pos2.y}%`}
                        stroke={prevCompleted ? '#00ffff' : currentUnlocked ? '#666' : '#333'}
                        strokeWidth="2"
                        strokeDasharray={prevCompleted ? 'none' : '4,4'}
                        opacity={prevCompleted ? 0.8 : 0.5}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        )}

        {selectedStage && showStageDetail && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-cyber-dark border-2 border-cyber-purple rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedStage.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-cyber font-bold text-lg text-white">
                        {selectedStage.name}
                      </h3>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-bold"
                        style={{
                          backgroundColor: `${getDifficultyColor(selectedStage.difficulty)}20`,
                          color: getDifficultyColor(selectedStage.difficulty),
                        }}
                      >
                        {getDifficultyEmoji(selectedStage.difficulty)} {getDifficultyName(selectedStage.difficulty)}
                      </span>
                      {isStageFirstCleared(selectedStage.id) && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-yellow/20 text-cyber-yellow font-bold">
                          ⭐ 已首通
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedStage.description}
                    </p>
                  </div>
                </div>
                <NeonButton size="sm" variant="ghost" onClick={() => setShowStageDetail(false)}>
                  <X className="w-4 h-4" />
                </NeonButton>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
                {selectedStage.narrative && (
                  <NeonCard variant="purple" className="mb-4 p-4">
                    <p className="text-sm text-gray-300 italic leading-relaxed">
                      "{selectedStage.narrative}"
                    </p>
                  </NeonCard>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-cyber font-bold text-sm mb-3 text-cyber-cyan flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      敌方阵容
                    </h4>
                    <div className="space-y-3">
                      {selectedStage.enemies.map((enemy, index) => {
                        const template = getAnimalTemplate(enemy.animalTemplateId);
                        if (!template) return null;
                        const formationPos = selectedStage.formationPosition[index] || 'mid';
                        const posNames = { front: '前排', mid: '中排', back: '后排' };

                        return (
                          <div
                            key={index}
                            className="p-3 bg-cyber-darker/80 rounded-xl border border-gray-700/50"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                                style={{
                                  border: `1px solid ${getRarityColor(template.rarity)}40`,
                                  background: `${ELEMENT_COLORS[template.element]}10`,
                                }}
                              >
                                {template.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-cyber font-bold text-sm" style={{ color: getRarityColor(template.rarity) }}>
                                    {template.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                                    Lv.{enemy.level}
                                  </span>
                                  <span className="text-[10px]" style={{ color: ELEMENT_COLORS[template.element] }}>
                                    {ELEMENT_EMOJIS[template.element]}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-yellow/10 text-cyber-yellow">
                                    ⭐{STAR_LEVEL_NAMES[enemy.starLevel]}
                                  </span>
                                  {enemy.breakthroughTier > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-purple/10 text-cyber-purple">
                                      🔮{BREAKTHROUGH_TIER_NAMES[enemy.breakthroughTier]}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-gray-500">
                                    {posNames[formationPos]}
                                  </span>
                                  <span className="text-[10px] text-gray-600">•</span>
                                  <span className="text-[10px] text-gray-500">
                                    {enemy.skills.length}个技能
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {enemy.skills.map(skillId => {
                                const skill = getSkillTemplate(skillId);
                                if (!skill) return null;
                                return (
                                  <div
                                    key={skillId}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyber-dark/50 border border-gray-700/30"
                                  >
                                    <SkillIcon skill={skill} size="sm" />
                                    <span className="text-[10px] text-gray-400">{skill.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-4">
                      <h4 className="font-cyber font-bold text-sm mb-3 text-cyber-yellow flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        关卡掉落
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedStage.drops.map((drop, i) => renderRewardItem(drop, false))}
                      </div>
                    </div>

                    {!isStageFirstCleared(selectedStage.id) && (
                      <div>
                        <h4 className="font-cyber font-bold text-sm mb-3 text-cyber-pink flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          首通奖励
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedStage.firstClearRewards.map((reward, i) => renderRewardItem(reward, true))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-cyber-darker/80 rounded-xl border border-gray-700/50">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Zap className="w-4 h-4 text-cyber-yellow" />
                          <span>体力消耗</span>
                        </div>
                        <span className="font-cyber font-bold text-cyber-yellow">
                          {selectedStage.staminaCost}
                        </span>
                      </div>
                      {getStageProgress(selectedStage.id) && (
                        <>
                          <div className="flex items-center justify-between text-sm mt-2">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Target className="w-4 h-4 text-cyber-cyan" />
                              <span>挑战次数</span>
                            </div>
                            <span className="font-cyber font-bold text-cyber-cyan">
                              {getStageProgress(selectedStage.id)?.attempts || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-2">
                            <div className="flex items-center gap-2 text-gray-400">
                              <CheckCircle className="w-4 h-4 text-cyber-green" />
                              <span>通关次数</span>
                            </div>
                            <span className="font-cyber font-bold text-cyber-green">
                              {getStageProgress(selectedStage.id)?.totalClears || 0}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-800 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  当前阵容: {lineup.length}/3 只动物
                </div>
                <div className="flex gap-3">
                  <NeonButton variant="ghost" onClick={() => setShowStageDetail(false)}>
                    取消
                  </NeonButton>
                  <NeonButton
                    variant="pink"
                    onClick={handleStartBattle}
                    disabled={battleLoading || stamina < selectedStage.staminaCost}
                  >
                    {battleLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>战斗中...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Swords className="w-4 h-4" />
                        <span>开始战斗</span>
                        <span className="text-cyber-yellow ml-1">
                          ⚡{selectedStage.staminaCost}
                        </span>
                      </div>
                    )}
                  </NeonButton>
                </div>
              </div>

              {battleMessage && (
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-cyber-red/10 border border-cyber-red/30">
                    <AlertTriangle className="w-4 h-4 text-cyber-red shrink-0" />
                    <span className="text-sm text-cyber-red">{battleMessage}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showBattleResult && battleResult && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-cyber-dark border-2 border-cyber-purple rounded-2xl max-w-lg w-full overflow-hidden animate-bounce-in">
              <div className={`p-8 text-center ${
                battleResult.isWin
                  ? 'bg-gradient-to-b from-cyber-green/20 to-transparent'
                  : 'bg-gradient-to-b from-cyber-red/20 to-transparent'
              }`}>
                <div className="text-6xl mb-4">
                  {battleResult.isWin ? '🎉' : '💔'}
                </div>
                <h2 className={`text-3xl font-cyber font-black mb-2 ${
                  battleResult.isWin ? 'text-cyber-green' : 'text-cyber-red'
                }`}>
                  {battleResult.isWin ? '战斗胜利！' : '战斗失败'}
                </h2>
                <p className="text-gray-400">
                  {battleResult.isWin
                    ? '恭喜你击败了对手！'
                    : '别灰心，再接再厉！'}
                </p>
              </div>

              {battleResult.rewards.length > 0 && (
                <div className="p-6 border-t border-gray-800">
                  <h3 className="font-cyber font-bold text-center text-lg mb-4 text-cyber-yellow flex items-center justify-center gap-2">
                    <Gift className="w-5 h-5" />
                    获得奖励
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {battleResult.rewards.map((reward, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border-2 flex items-center gap-3 ${
                          reward.isFirstClear
                            ? 'bg-cyber-yellow/10 border-cyber-yellow/50 animate-pulse'
                            : 'bg-cyber-darker/80 border-gray-700/50'
                        }`}
                      >
                        <span className="text-2xl">{TYPE_EMOJIS[reward.type] || '🎁'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-cyber font-bold text-sm text-white truncate">
                            {reward.type === 'coins' ? '金币' :
                             reward.type === 'gems' ? '宝石' :
                             reward.templateId ? (
                               getMaterialTemplate(reward.templateId)?.name ||
                               getAnimalTemplate(reward.templateId)?.name ||
                               getPartTemplate(reward.templateId)?.name ||
                               getSkillTemplate(reward.templateId)?.name ||
                               TYPE_NAMES[reward.type]
                             ) : TYPE_NAMES[reward.type]}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            ×{reward.amount}
                            {reward.isFirstClear && (
                              <span className="ml-1 text-cyber-yellow">首通奖励！</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-6 border-t border-gray-800">
                <NeonButton
                  variant="cyan"
                  className="w-full"
                  onClick={() => {
                    setShowBattleResult(false);
                    setShowStageDetail(false);
                    setSelectedStage(null);
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    {battleResult.isWin ? (
                      <ChevronRight className="w-5 h-5" />
                    ) : (
                      <ArrowLeft className="w-5 h-5" />
                    )}
                    <span>
                      {battleResult.isWin ? '继续冒险' : '返回地图'}
                    </span>
                  </div>
                </NeonButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
