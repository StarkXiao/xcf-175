import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  X, Clock, Zap, Shield, Swords, ShoppingBag, Bell, BellRing,
  ChevronRight, Trophy, Star, Coins, Gem, AlertTriangle, RefreshCw,
  Eye, Package, ScrollText,
} from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { Empty } from '@/components/Empty';
import { useWorldEventStore } from '@/store/useWorldEventStore';
import { useGameStore } from '@/store/useGameStore';
import {
  WORLD_EVENT_RARITY_CONFIG,
  getBattleRuleConfig,
  getWorldEventTemplate,
} from '@/data/worldEvent';
import { createEventEnemyAnimal } from '@/engine/battleEngine';
import { getRarityColor } from '@/utils/format';
import type {
  WorldEventInstance,
  WorldEventTemplate,
  WorldEventAnnouncement,
  WorldEventSpecialEnemy,
  WorldEventBattleRuleConfig,
} from '@/types';

type EventTab = 'overview' | 'enemies' | 'shop' | 'announcements';

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}小时${minutes % 60}分`;
  if (minutes > 0) return `${minutes}分${seconds % 60}秒`;
  return `${seconds}秒`;
};

export default function WorldEvent() {
  const navigate = useNavigate();
  const {
    activeEvents, announcements, eventTokens, nextCycleTime,
    isInitialized, initWorldEvent, checkCycleRefresh,
    getActiveEventTemplates, getActiveBattleRules, getEventShopItems,
    purchaseEventShopItem, markAnnouncementRead,
    getUnreadAnnouncements, getTimeToNextCycle,
    getEventTimeRemaining, recordBattleResult,
  } = useWorldEventStore();
  const { startEventBattle, lineup, player, addCoins, addGems } = useGameStore();

  const [activeTab, setActiveTab] = useState<EventTab>('overview');
  const [countdown, setCountdown] = useState('');
  const [eventCountdowns, setEventCountdowns] = useState<Record<string, string>>({});
  const [purchaseResult, setPurchaseResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<WorldEventAnnouncement | null>(null);

  useEffect(() => {
    if (!isInitialized) initWorldEvent();
  }, [isInitialized, initWorldEvent]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkCycleRefresh();
      const timeToNext = getTimeToNextCycle();
      if (timeToNext <= 0) {
        setCountdown('刷新中...');
      } else {
        setCountdown(formatDuration(timeToNext));
      }
      const countdowns: Record<string, string> = {};
      activeEvents.forEach(e => {
        const remaining = getEventTimeRemaining(e);
        countdowns[e.templateId] = remaining <= 0 ? '已结束' : formatDuration(remaining);
      });
      setEventCountdowns(countdowns);
    }, 1000);
    return () => clearInterval(interval);
  }, [checkCycleRefresh, getTimeToNextCycle, getEventTimeRemaining, activeEvents]);

  const activeEventList = useMemo(() => getActiveEventTemplates(), [activeEvents, getActiveEventTemplates]);
  const shopItems = useMemo(() => getEventShopItems(), [activeEvents, getEventShopItems]);
  const unreadAnnouncements = useMemo(() => getUnreadAnnouncements(), [announcements, getUnreadAnnouncements]);

  const tabs: { key: EventTab; label: string; icon: typeof Bell; badge?: number }[] = [
    { key: 'overview', label: '事件总览', icon: Zap },
    { key: 'enemies', label: '特殊敌人', icon: Swords },
    { key: 'shop', label: '事件商店', icon: ShoppingBag },
    { key: 'announcements', label: '公告', icon: Bell, badge: unreadAnnouncements.length || undefined },
  ];

  const handleBattleSpecialEnemy = useCallback((enemy: WorldEventSpecialEnemy, template: WorldEventTemplate) => {
    if (lineup.length === 0) return;
    const enemyAnimal = createEventEnemyAnimal(enemy);
    const battleRules = getActiveBattleRules();
    const result = startEventBattle(
      [enemyAnimal],
      battleRules,
      enemy.name,
      enemy.emoji,
      template.bonusRewardMultiplier,
      0,
    );
    if (result.success) {
      const eventResult = recordBattleResult(result.isWin ?? false, enemy.id);
      if (result.isWin) {
        addCoins(enemy.rewardCoins);
        addGems(enemy.rewardGems);
      }
      navigate(`/battle/${result.battleRecord!.id}`);
    }
  }, [lineup, startEventBattle, getActiveBattleRules, recordBattleResult, addCoins, addGems, navigate]);

  const handlePurchase = useCallback((itemId: string) => {
    const result = purchaseEventShopItem(itemId);
    setPurchaseResult(result);
    setTimeout(() => setPurchaseResult(null), 3000);
  }, [purchaseEventShopItem]);

  const handleReadAnnouncement = useCallback((announcement: WorldEventAnnouncement) => {
    markAnnouncementRead(announcement.id);
    setSelectedAnnouncement(announcement);
  }, [markAnnouncementRead]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-white text-lg">加载世界事件...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-7 h-7 text-cyber-yellow" />
            世界事件
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow/30 rounded-lg">
              <Coins className="w-4 h-4 text-cyber-yellow" />
              <span className="font-bold text-cyber-yellow text-sm">{eventTokens}</span>
              <span className="text-xs text-cyber-yellow/70">代币</span>
            </div>
          </div>
        </div>

        <NeonCard className="mb-6 p-4 border-2 border-cyber-cyan/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6 text-cyber-cyan animate-spin" style={{ animationDuration: '3s' }} />
              <div>
                <div className="text-sm text-white/50">下一周期刷新</div>
                <div className="text-xl font-bold text-cyber-cyan">{countdown}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/50">活跃事件</div>
              <div className="text-xl font-bold text-cyber-yellow">{activeEventList.length}</div>
            </div>
          </div>
        </NeonCard>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
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
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div>
            {activeEventList.length === 0 ? (
              <Empty title="当前无活跃事件" description="等待下一周期刷新..." icon={Clock} />
            ) : (
              <div className="space-y-4">
                {activeEventList.map(({ instance, template }) => (
                  <NeonCard key={instance.templateId} className="p-4" style={{ borderColor: template.color }}>
                    <div className="flex items-start gap-4">
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl shrink-0"
                        style={{ backgroundColor: `${template.color}20`, border: `2px solid ${template.color}` }}
                      >
                        {template.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl font-bold text-white">{template.name}</span>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{
                              backgroundColor: `${WORLD_EVENT_RARITY_CONFIG[template.rarity]?.color}30`,
                              color: WORLD_EVENT_RARITY_CONFIG[template.rarity]?.color,
                            }}
                          >
                            {WORLD_EVENT_RARITY_CONFIG[template.rarity]?.name}
                          </span>
                        </div>
                        <div className="text-sm text-white/50 mb-2">{template.subtitle}</div>
                        <p className="text-sm text-white/70 mb-3 line-clamp-2">{template.description}</p>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {template.battleRules.map(ruleId => {
                            const rule = getBattleRuleConfig(ruleId);
                            if (!rule) return null;
                            return (
                              <span
                                key={ruleId}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                                style={{ backgroundColor: `${rule.color}20`, color: rule.color, border: `1px solid ${rule.color}40` }}
                              >
                                {rule.emoji} {rule.name}
                              </span>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="text-center p-2 bg-black/30 rounded-lg">
                            <div className="text-lg font-bold text-cyber-yellow">{template.bonusRewardMultiplier}×</div>
                            <div className="text-xs text-white/50">奖励倍率</div>
                          </div>
                          <div className="text-center p-2 bg-black/30 rounded-lg">
                            <div className="text-lg font-bold text-cyber-cyan">{instance.battlesWon}/{instance.battlesFought}</div>
                            <div className="text-xs text-white/50">战斗胜率</div>
                          </div>
                          <div className="text-center p-2 bg-black/30 rounded-lg">
                            <div className="text-lg font-bold text-cyber-pink">{instance.totalEventTokensEarned}</div>
                            <div className="text-xs text-white/50">获得代币</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-cyber-cyan" />
                            <span className="text-cyber-cyan font-bold">
                              {eventCountdowns[instance.templateId] || '计算中...'}
                            </span>
                          </div>
                          <NeonButton size="sm" onClick={() => navigate('/battle')}>
                            <Swords className="w-4 h-4 mr-2" />
                            参战
                          </NeonButton>
                        </div>
                      </div>
                    </div>
                  </NeonCard>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'enemies' && (
          <div>
            {activeEventList.length === 0 ? (
              <Empty title="当前无特殊敌人" description="等待事件刷新..." icon={Swords} />
            ) : (
              <div className="space-y-4">
                {activeEventList.map(({ instance, template }) => (
                  <div key={instance.templateId}>
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <span className="text-2xl">{template.emoji}</span>
                      {template.name} - 特殊敌人
                    </h3>
                    <div className="space-y-3">
                      {template.specialEnemies.map(enemy => {
                        const defeated = instance.enemiesDefeated[enemy.id] || 0;
                        const rarityConfig = WORLD_EVENT_RARITY_CONFIG[enemy.rarity];
                        return (
                          <NeonCard key={enemy.id} className="p-4" style={{ borderColor: rarityConfig?.color }}>
                            <div className="flex items-start gap-4">
                              <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                                style={{ backgroundColor: `${rarityConfig?.color}20`, border: `2px solid ${rarityConfig?.color}` }}
                              >
                                {enemy.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg font-bold text-white">{enemy.name}</span>
                                  <span
                                    className="px-2 py-0.5 rounded text-xs font-bold"
                                    style={{ backgroundColor: `${rarityConfig?.color}30`, color: rarityConfig?.color }}
                                  >
                                    {rarityConfig?.name}
                                  </span>
                                  <span className="text-xs text-white/30">击杀: {defeated}</span>
                                </div>
                                <p className="text-sm text-white/60 mb-3">{enemy.description}</p>

                                <div className="grid grid-cols-4 gap-2 mb-3">
                                  <div className="text-center p-1.5 bg-black/30 rounded">
                                    <div className="text-sm font-bold text-red-400">{enemy.baseHp}</div>
                                    <div className="text-[10px] text-white/40">HP</div>
                                  </div>
                                  <div className="text-center p-1.5 bg-black/30 rounded">
                                    <div className="text-sm font-bold text-orange-400">{enemy.baseAtk}</div>
                                    <div className="text-[10px] text-white/40">ATK</div>
                                  </div>
                                  <div className="text-center p-1.5 bg-black/30 rounded">
                                    <div className="text-sm font-bold text-blue-400">{enemy.baseDef}</div>
                                    <div className="text-[10px] text-white/40">DEF</div>
                                  </div>
                                  <div className="text-center p-1.5 bg-black/30 rounded">
                                    <div className="text-sm font-bold text-green-400">{enemy.baseSpd}</div>
                                    <div className="text-[10px] text-white/40">SPD</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 mb-3 text-sm">
                                  <span className="text-cyber-yellow flex items-center gap-1">
                                    <Coins className="w-3 h-3" /> {enemy.rewardCoins}
                                  </span>
                                  <span className="text-cyber-cyan flex items-center gap-1">
                                    <Gem className="w-3 h-3" /> {enemy.rewardGems}
                                  </span>
                                  <span className="text-cyber-pink flex items-center gap-1">
                                    ×{enemy.rewardMultiplier} 倍率
                                  </span>
                                </div>

                                <NeonButton
                                  size="sm"
                                  onClick={() => handleBattleSpecialEnemy(enemy, template)}
                                  disabled={lineup.length === 0}
                                >
                                  <Swords className="w-4 h-4 mr-2" />
                                  挑战
                                </NeonButton>
                              </div>
                            </div>
                          </NeonCard>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'shop' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-cyber-purple" />
                限时事件商店
              </h3>
              <div className="flex items-center gap-1 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow/30 rounded-lg">
                <Coins className="w-4 h-4 text-cyber-yellow" />
                <span className="font-bold text-cyber-yellow text-sm">{eventTokens}</span>
                <span className="text-xs text-cyber-yellow/70">代币</span>
              </div>
            </div>

            {purchaseResult && (
              <div className={`mb-4 p-3 rounded-lg border ${
                purchaseResult.success
                  ? 'bg-green-900/20 border-green-500/30 text-green-400'
                  : 'bg-red-900/20 border-red-500/30 text-red-400'
              }`}>
                {purchaseResult.message}
              </div>
            )}

            {shopItems.length === 0 ? (
              <Empty title="商店暂无商品" description="等待事件刷新..." icon={Package} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shopItems.map(({ item, purchased, template }) => {
                  const remaining = item.stock - purchased;
                  const rarityColor = getRarityColor(item.rarity);
                  return (
                    <NeonCard key={item.id} className="p-4" style={{ borderColor: `${rarityColor}60` }}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{item.name}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: rarityColor, backgroundColor: `${rarityColor}15` }}>
                              {item.rarity}★
                            </span>
                          </div>
                          <div className="text-xs text-white/50">{item.description}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm">
                          <span className={remaining > 0 ? 'text-cyber-cyan' : 'text-red-400'}>
                            库存: {remaining}/{item.stock}
                          </span>
                          <span className="text-white/70 flex items-center gap-1">
                            {item.currency === 'eventTokens' && <><Coins className="w-3 h-3 text-cyber-yellow" /> {item.cost} 代币</>}
                            {item.currency === 'coins' && <><Coins className="w-3 h-3 text-cyber-yellow" /> {item.cost} 金币</>}
                            {item.currency === 'gems' && <><Gem className="w-3 h-3 text-cyber-cyan" /> {item.cost} 宝石</>}
                          </span>
                        </div>
                        <NeonButton
                          size="sm"
                          onClick={() => handlePurchase(item.id)}
                          disabled={remaining <= 0}
                        >
                          购买
                        </NeonButton>
                      </div>

                      <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(purchased / item.stock) * 100}%`,
                            background: `linear-gradient(90deg, ${rarityColor}80, ${rarityColor})`,
                          }}
                        />
                      </div>
                    </NeonCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-cyber-purple" />
              事件公告
              {unreadAnnouncements.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                  {unreadAnnouncements.length} 条未读
                </span>
              )}
            </h3>

            {announcements.length === 0 ? (
              <Empty title="暂无公告" icon={ScrollText} />
            ) : (
              <div className="space-y-3">
                {announcements.map(ann => (
                  <NeonCard
                    key={ann.id}
                    className={`p-3 cursor-pointer transition-all ${!ann.isRead ? 'border-2' : 'opacity-70'}`}
                    style={!ann.isRead ? { borderColor: ann.eventColor } : undefined}
                    onClick={() => handleReadAnnouncement(ann)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: `${ann.eventColor}20` }}
                      >
                        {ann.eventEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold" style={{ color: ann.eventColor }}>{ann.eventName}</span>
                          {!ann.isRead && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm text-white/70 line-clamp-2">{ann.message}</p>
                        <div className="text-xs text-white/30 mt-1">
                          {new Date(ann.timestamp).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                    </div>
                  </NeonCard>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <NeonCard className="max-w-md w-full p-6" style={{ borderColor: selectedAnnouncement.eventColor }}>
            <div className="text-center mb-4">
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl mb-3"
                style={{ backgroundColor: `${selectedAnnouncement.eventColor}20`, border: `2px solid ${selectedAnnouncement.eventColor}` }}
              >
                {selectedAnnouncement.eventEmoji}
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: selectedAnnouncement.eventColor }}>
                {selectedAnnouncement.eventName}
              </h2>
            </div>
            <p className="text-white/80 text-center mb-4 leading-relaxed">{selectedAnnouncement.message}</p>
            <div className="text-xs text-white/30 text-center mb-4">
              {new Date(selectedAnnouncement.timestamp).toLocaleString('zh-CN')}
            </div>
            <NeonButton className="w-full" onClick={() => setSelectedAnnouncement(null)}>
              确定
            </NeonButton>
          </NeonCard>
        </div>
      )}
    </div>
  );
}
