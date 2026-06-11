import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Trophy, Swords, Sparkles, TrendingUp, Users, Calendar,
  X, CheckCircle, Coins, Gem, Gift, Lock, ChevronRight,
  Star, Award, Target, Zap
} from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { useTaskStore } from '@/store/useTaskStore';
import { getTaskCategoryLabel } from '@/data/tasks';
import type { TaskCategory, TaskTemplate, TaskProgress } from '@/types';

type TaskTab = 'daily' | 'battle' | 'gacha' | 'ascend' | 'lineup' | 'achievement';

const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
};

const TaskItem = ({
  template,
  progress,
  onClaim,
}: {
  template: TaskTemplate;
  progress: TaskProgress;
  onClaim: () => void;
}) => {
  const percent = Math.min(100, (progress.currentValue / progress.targetValue) * 100);

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'coins':
        return <Coins className="w-4 h-4 text-yellow-400" />;
      case 'gems':
        return <Gem className="w-4 h-4 text-purple-400" />;
      default:
        return <Gift className="w-4 h-4 text-green-400" />;
    }
  };

  return (
    <NeonCard
      variant={progress.isCompleted ? (progress.isClaimed ? 'default' : 'yellow') : 'default'}
      className={`p-4 transition-all ${
        progress.isCompleted && !progress.isClaimed
          ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/20'
          : ''
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ${
            progress.isCompleted
              ? progress.isClaimed
                ? 'bg-gray-700/50'
                : 'bg-yellow-500/20 border-2 border-yellow-500/50'
              : 'bg-white/5'
          }`}
        >
          {progress.isCompleted && progress.isClaimed ? (
            <CheckCircle className="w-7 h-7 text-green-400" />
          ) : (
            <span>{template.emoji}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-bold text-white truncate">{template.name}</h3>
            <span className="text-xs text-white/50 flex-shrink-0">
              {progress.currentValue}/{progress.targetValue}
            </span>
          </div>
          <p className="text-sm text-white/60 mb-2 truncate">{template.description}</p>

          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress.isCompleted
                  ? progress.isClaimed
                    ? 'bg-gray-500'
                    : 'bg-gradient-to-r from-yellow-500 to-amber-400'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              {template.rewards.map((reward, i) => (
                <div key={i} className="flex items-center gap-1 text-sm">
                  {getRewardIcon(reward.type)}
                  <span
                    className={
                      reward.type === 'coins'
                        ? 'text-yellow-400'
                        : reward.type === 'gems'
                        ? 'text-purple-400'
                        : 'text-green-400'
                    }
                  >
                    {formatNumber(reward.amount)}
                  </span>
                </div>
              ))}
            </div>

            {progress.isCompleted && !progress.isClaimed ? (
              <NeonButton
                size="sm"
                variant="yellow"
                onClick={onClaim}
                className="flex-shrink-0"
              >
                <Gift className="w-4 h-4 mr-1" />
                领取
              </NeonButton>
            ) : progress.isClaimed ? (
              <span className="text-sm text-green-400 flex items-center gap-1 flex-shrink-0">
                <CheckCircle className="w-4 h-4" />
                已领取
              </span>
            ) : (
              <span className="text-sm text-white/40 flex items-center gap-1 flex-shrink-0">
                <Lock className="w-4 h-4" />
                未完成
              </span>
            )}
          </div>
        </div>
      </div>
    </NeonCard>
  );
};

export default function Tasks() {
  const navigate = useNavigate();
  const {
    isInitialized,
    initTasks,
    getTaskListWithProgress,
    claimReward,
    claimAllAvailable,
    hasUnclaimedRewards,
    getUnclaimedCount,
    checkDailyReset,
  } = useTaskStore();

  const [activeTab, setActiveTab] = useState<TaskTab>('daily');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimedRewards, setClaimedRewards] = useState<
    { type: string; amount: number }[]
  >([]);

  useEffect(() => {
    if (!isInitialized) {
      initTasks();
    } else {
      checkDailyReset();
    }
  }, [isInitialized, initTasks, checkDailyReset]);

  const tabs: { key: TaskTab; label: string; icon: typeof Trophy }[] = [
    { key: 'daily', label: '每日', icon: Calendar },
    { key: 'battle', label: '战斗', icon: Swords },
    { key: 'gacha', label: '抽取', icon: Sparkles },
    { key: 'ascend', label: '养成', icon: TrendingUp },
    { key: 'lineup', label: '编队', icon: Users },
    { key: 'achievement', label: '成就', icon: Trophy },
  ];

  const taskList = useMemo(() => {
    if (!isInitialized) return [];
    return getTaskListWithProgress(activeTab as TaskCategory);
  }, [activeTab, isInitialized, getTaskListWithProgress]);

  const unclaimedCount = useMemo(() => {
    if (!isInitialized) return 0;
    return getUnclaimedCount();
  }, [isInitialized, getUnclaimedCount]);

  const handleClaim = (taskId: string) => {
    const result = claimReward(taskId);
    if (result.success && result.rewards) {
      setClaimedRewards(result.rewards.map(r => ({ type: r.type, amount: r.amount })));
      setShowClaimModal(true);
    }
  };

  const handleClaimAll = () => {
    const result = claimAllAvailable();
    if (result.success && result.totalRewards.length > 0) {
      setClaimedRewards(
        result.totalRewards.map(r => ({ type: r.type, amount: r.amount }))
      );
      setShowClaimModal(true);
    }
  };

  const getCompletedCount = () => {
    return taskList.filter(t => t.progress.isCompleted).length;
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-white text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-7 h-7 text-yellow-400" />
            任务与成就
          </h1>
        </div>

        {/* 总览卡片 */}
        <NeonCard variant="yellow" className="mb-6 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                任务总览
              </div>
              <div className="text-sm text-white/60 mt-1">
                完成任务获取丰厚奖励
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{unclaimedCount}</div>
              <div className="text-xs text-white/50">待领取奖励</div>
            </div>
          </div>
          {hasUnclaimedRewards() && (
            <NeonButton
              variant="yellow"
              size="sm"
              className="w-full mt-3"
              onClick={handleClaimAll}
            >
              <Gift className="w-4 h-4 mr-2" />
              一键领取全部奖励
            </NeonButton>
          )}
        </NeonCard>

        {/* Tab导航 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const categoryTasks = getTaskListWithProgress(tab.key as TaskCategory);
            const categoryUnclaimed = categoryTasks.filter(
              t => t.progress.isCompleted && !t.progress.isClaimed
            ).length;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all relative ${
                  activeTab === tab.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {categoryUnclaimed > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                    {categoryUnclaimed}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 分类标题和进度 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">
              {getTaskCategoryLabel(activeTab as TaskCategory)}
            </span>
            <span className="text-sm text-white/50">
              ({getCompletedCount()}/{taskList.length})
            </span>
          </div>
        </div>

        {/* 任务列表 */}
        <div className="space-y-3">
          {taskList.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无任务</p>
            </div>
          ) : (
            taskList.map(({ template, progress }) => (
              <TaskItem
                key={template.id}
                template={template}
                progress={progress}
                onClaim={() => handleClaim(template.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* 领取奖励弹窗 */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <NeonCard
            className="max-w-sm w-full p-6"
            style={{ borderColor: '#fbbf24' }}
          >
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 mx-auto flex items-center justify-center mb-4">
                <Gift className="w-10 h-10 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-2">
                恭喜获得奖励！
              </h2>
              <p className="text-white/70 mb-6">任务完成奖励已发放</p>

              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {claimedRewards.map((reward, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center p-3 bg-white/5 rounded-lg"
                  >
                    {reward.type === 'coins' ? (
                      <Coins className="w-8 h-8 text-yellow-400 mb-1" />
                    ) : reward.type === 'gems' ? (
                      <Gem className="w-8 h-8 text-purple-400 mb-1" />
                    ) : (
                      <Gift className="w-8 h-8 text-green-400 mb-1" />
                    )}
                    <span
                      className={`text-xl font-bold ${
                        reward.type === 'coins'
                          ? 'text-yellow-400'
                          : reward.type === 'gems'
                          ? 'text-purple-400'
                          : 'text-green-400'
                      }`}
                    >
                      {formatNumber(reward.amount)}
                    </span>
                    <span className="text-xs text-white/50">
                      {reward.type === 'coins'
                        ? '金币'
                        : reward.type === 'gems'
                        ? '宝石'
                        : '道具'}
                    </span>
                  </div>
                ))}
              </div>

              <NeonButton
                variant="yellow"
                className="w-full"
                onClick={() => setShowClaimModal(false)}
              >
                确定
              </NeonButton>
            </div>
          </NeonCard>
        </div>
      )}
    </div>
  );
}
