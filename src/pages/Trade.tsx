import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Trash2,
  RefreshCw,
  ShoppingBag,
  Coins,
  Diamond,
  Package,
  BookOpen,
  Sparkles,
  History,
  Star,
  X,
  Check,
  ChevronDown,
  Clock,
  Info,
  ArrowRight,
} from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { PartSlot } from '@/components/PartSlot';
import { SkillIcon } from '@/components/SkillIcon';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import { useTradeStore, EXCHANGE_ITEMS } from '@/store/useTradeStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { getRarityColor, getRarityStars, getRarityName, formatNumber, formatTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import { QUALITY_NAMES, QUALITY_COLORS, getPartSet } from '@/data/parts';
import type { Part, Skill, Material, Rarity, InventoryItem, TradeRecord, ExchangeItem } from '@/types';

type TabType = 'recycle' | 'exchange';

export default function Trade() {
  const navigate = useNavigate();
  const { player, ownedParts, ownedSkills, ownedMaterials } = useGameStore();
  const {
    initialize: initTrade,
    activeTab,
    setActiveTab,
    recycleItems,
    exchangeItem,
    canExchange,
    recycleHistory,
    exchangeHistory,
    dailyExchanges,
    isInitialized,
    showRecycleConfirm,
    setShowRecycleConfirm,
    showExchangeConfirm,
    setShowExchangeConfirm,
    selectedExchangeItem,
    setSelectedExchangeItem,
  } = useTradeStore();

  const {
    initialize: initInventory,
    getFilteredItems,
    setFilter,
    filters,
  } = useInventoryStore();

  const [recycleSelectedIds, setRecycleSelectedIds] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'recycle' | 'exchange'>('recycle');
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [exchangeCount, setExchangeCount] = useState(1);

  useEffect(() => {
    if (!isInitialized) {
      initTrade();
    }
    initInventory();
  }, [initTrade, initInventory, isInitialized]);

  useEffect(() => {
    setFilter('itemType', 'all');
    setFilter('rarity', 0);
    setFilter('onlyFavorites', false);
    setFilter('onlyLocked', false);
  }, []);

  const inventoryItems = useMemo(() => {
    return getFilteredItems();
  }, [getFilteredItems]);

  const recyclePreview = useMemo(() => {
    const selected = inventoryItems.filter(({ inventoryItem }) =>
      recycleSelectedIds.includes(inventoryItem.id) && !inventoryItem.isLocked
    );

    let totalCoins = 0;
    const rarityCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    const coinRewards: Record<number, number> = {
      1: 10,
      2: 30,
      3: 80,
      4: 200,
      5: 500,
    };

    selected.forEach(({ item }) => {
      const coins = coinRewards[item.rarity] || 0;
      totalCoins += coins;
      rarityCounts[item.rarity] = (rarityCounts[item.rarity] || 0) + 1;
    });

    return {
      totalCoins,
      count: selected.length,
      rarityCounts,
    };
  }, [recycleSelectedIds, inventoryItems]);

  const handleToggleSelect = (inventoryId: string) => {
    setRecycleSelectedIds(prev =>
      prev.includes(inventoryId)
        ? prev.filter(id => id !== inventoryId)
        : [...prev, inventoryId]
    );
  };

  const handleSelectAll = () => {
    const unlockIds = inventoryItems
      .filter(({ inventoryItem }) => !inventoryItem.isLocked)
      .map(({ inventoryItem }) => inventoryItem.id);
    setRecycleSelectedIds(unlockIds);
  };

  const handleClearSelection = () => {
    setRecycleSelectedIds([]);
  };

  const handleRecycle = () => {
    const result = recycleItems(recycleSelectedIds);
    if (result.success) {
      setResultMessage({
        type: 'success',
        message: `成功回收 ${result.itemsRecycled} 件物品，获得 ${result.totalCoins} 金币`,
      });
      setRecycleSelectedIds([]);
      setShowRecycleConfirm(false);
      setTimeout(() => setResultMessage(null), 3000);
    } else {
      setResultMessage({
        type: 'error',
        message: '回收失败，请重试',
      });
      setTimeout(() => setResultMessage(null), 3000);
    }
  };

  const handleExchange = (item: ExchangeItem, count: number = 1) => {
    const result = exchangeItem(item.id, count);
    if (result.success) {
      setResultMessage({
        type: 'success',
        message: result.message,
      });
      setShowExchangeConfirm(false);
      setSelectedExchangeItem(null);
      setTimeout(() => setResultMessage(null), 3000);
    } else {
      setResultMessage({
        type: 'error',
        message: result.message,
      });
      setTimeout(() => setResultMessage(null), 3000);
    }
  };

  const getDailyRemaining = (itemId: string, dailyLimit?: number) => {
    if (!dailyLimit) return null;
    const purchased = dailyExchanges[itemId] || 0;
    return dailyLimit - purchased;
  };

  const renderRecycleItem = (item: Part | Skill | Material, invItem: InventoryItem) => {
    const isSelected = recycleSelectedIds.includes(invItem.id);
    const isPart = 'slot' in item && 'quality' in item;
    const isSkill = 'type' in item && 'damage' in item;
    const rarityColor = getRarityColor(item.rarity);

    return (
      <div
        key={invItem.id}
        className={cn(
          'relative flex flex-col items-center p-3 rounded-xl border-2 transition-all cursor-pointer',
          isSelected
            ? 'border-cyber-red bg-cyber-red/10 scale-105'
            : invItem.isLocked
              ? 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
              : 'border-gray-800 hover:border-gray-600 bg-gray-900/50'
        )}
        onClick={() => {
          if (invItem.isLocked) return;
          handleToggleSelect(invItem.id);
        }}
      >
        <div
          className={cn(
            'absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10',
            isSelected ? 'bg-cyber-red border-cyber-red' : 'border-gray-600 bg-gray-900/80'
          )}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>

        {invItem.isLocked && (
          <div className="absolute top-2 right-2 z-10">
            <div className="w-5 h-5 rounded-full bg-cyber-yellow/20 flex items-center justify-center">
              <span className="text-xs">🔒</span>
            </div>
          </div>
        )}

        <div className="w-12 h-12 mb-2 flex items-center justify-center">
          {isPart ? (
            <div className="w-10 h-10">
              <PartSlot slot={item.slot} part={item as any} />
            </div>
          ) : isSkill ? (
            <SkillIcon skill={item as any} size="md" />
          ) : (
            <div className="text-3xl">{item.emoji}</div>
          )}
        </div>

        <div className="text-center w-full">
          <div className="text-[10px] mb-0.5" style={{ color: rarityColor }}>
            {getRarityStars(item.rarity)}
          </div>
          <div className="text-xs font-medium truncate" style={{ color: rarityColor }}>
            {item.name}
          </div>
        </div>
      </div>
    );
  };

  const renderExchangeItem = (item: ExchangeItem) => {
    const canBuy = canExchange(item.id);
    const remaining = getDailyRemaining(item.id, item.dailyLimit);
    const rarityColor = getRarityColor(item.rarity);

    return (
      <NeonCard
        key={item.id}
        className={cn(
          'relative overflow-hidden transition-all',
          canBuy ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-60'
        )}
        style={{ borderColor: `${rarityColor}40` }}
        onClick={() => {
          if (canBuy) {
            setSelectedExchangeItem(item);
            setExchangeCount(1);
            setShowExchangeConfirm(true);
          }
        }}
      >
        {item.dailyLimit && remaining !== null && remaining <= 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-gray-700 text-gray-400 text-[10px] rounded-full">
            已售罄
          </div>
        )}

        {item.dailyLimit && remaining !== null && remaining > 0 && remaining < item.dailyLimit && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-cyber-cyan/20 text-cyber-cyan text-[10px] rounded-full">
            剩余 {remaining}
          </div>
        )}

        <div className="text-center">
          <div className="text-4xl mb-3">{item.emoji}</div>
          <div className="text-[10px] mb-1" style={{ color: rarityColor }}>
            {getRarityStars(item.rarity)}
          </div>
          <div className="font-cyber font-bold" style={{ color: rarityColor }}>
            {item.name}
          </div>
          <p className="text-xs text-gray-500 mt-1 mb-3 h-8 overflow-hidden">
            {item.description}
          </p>

          <div className="flex items-center justify-center gap-1 mb-3">
            {item.cost.type === 'coins' && (
              <>
                <Coins className="w-4 h-4 text-cyber-yellow" />
                <span className="font-cyber font-bold text-cyber-yellow">{item.cost.amount}</span>
              </>
            )}
            {item.cost.type === 'gems' && (
              <>
                <Diamond className="w-4 h-4 text-cyber-cyan" />
                <span className="font-cyber font-bold text-cyber-cyan">{item.cost.amount}</span>
              </>
            )}
          </div>

          <NeonButton
            size="sm"
            variant={item.rarity >= 4 ? 'purple' : 'cyan'}
            className="w-full"
            disabled={!canBuy}
            onClick={(e) => {
              e.stopPropagation();
              if (canBuy) {
                setSelectedExchangeItem(item);
                setExchangeCount(1);
                setShowExchangeConfirm(true);
              }
            }}
          >
            兑换
          </NeonButton>
        </div>
      </NeonCard>
    );
  };

  const renderHistoryItem = (record: TradeRecord) => {
    const rarityColor = getRarityColor(record.rarity);

    return (
      <div
        key={record.id}
        className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900/50"
      >
        <span className="text-2xl">{record.itemEmoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-cyber text-sm truncate" style={{ color: rarityColor }}>
              {record.itemName}
            </span>
            <span className="text-[10px]" style={{ color: rarityColor }}>
              {getRarityStars(record.rarity)}
            </span>
          </div>
          <p className="text-xs text-gray-500">{formatTime(record.timestamp)}</p>
        </div>
        <div className="text-right">
          {record.type === 'recycle' ? (
            <div className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-cyber-yellow" />
              <span className="text-sm text-cyber-yellow">+{record.cost}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <ShoppingBag className="w-3 h-3 text-cyber-green" />
              <span className="text-xs text-cyber-green">{record.reward}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="sticky top-0 bg-cyber-darker/95 backdrop-blur-sm z-40 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <NeonButton size="sm" variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4" />
              </NeonButton>
              <h1 className="text-2xl font-cyber font-bold text-cyber-green">交易中心</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow/30 rounded-lg">
                <Coins className="w-5 h-5 text-cyber-yellow" />
                <span className="font-cyber font-bold text-cyber-yellow">{formatNumber(player.coins)}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-lg">
                <Diamond className="w-5 h-5 text-cyber-cyan" />
                <span className="font-cyber font-bold text-cyber-cyan">{player.gems}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <NeonButton
            variant={activeTab === 'recycle' ? 'red' : 'ghost'}
            className="flex-1"
            onClick={() => setActiveTab('recycle')}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            资源回收
          </NeonButton>
          <NeonButton
            variant={activeTab === 'exchange' ? 'green' : 'ghost'}
            className="flex-1"
            onClick={() => setActiveTab('exchange')}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            兑换商店
          </NeonButton>
        </div>

        {resultMessage && (
          <div className={cn(
            'mb-4 p-3 rounded-lg border flex items-center gap-2',
            resultMessage.type === 'success'
              ? 'bg-green-900/20 border-green-500/30 text-green-400'
              : 'bg-red-900/20 border-red-500/30 text-red-400'
          )}>
            {resultMessage.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
            <span>{resultMessage.message}</span>
          </div>
        )}

        {activeTab === 'recycle' && (
          <div>
            <NeonCard variant="red" className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-cyber font-bold text-cyber-red flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  回收预览
                </h3>
                <span className="text-sm text-gray-400">
                  已选 {recyclePreview.count} 件
                </span>
              </div>

              {recyclePreview.count === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  选择要回收的物品
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">预计获得金币</span>
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-cyber-yellow" />
                      <span className="font-cyber font-bold text-cyber-yellow text-lg">
                        {recyclePreview.totalCoins}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                    {(Object.entries(recyclePreview.rarityCounts) as [string, number][])
                      .filter(([_, count]) => count > 0)
                      .sort((a, b) => Number(b[0]) - Number(a[0]))
                      .map(([rarity, count]) => (
                        <span
                          key={rarity}
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            color: getRarityColor(Number(rarity) as Rarity),
                            background: `${getRarityColor(Number(rarity) as Rarity)}15`,
                          }}
                        >
                          {getRarityStars(Number(rarity) as Rarity)} x{count}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <NeonButton
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={handleClearSelection}
                  disabled={recycleSelectedIds.length === 0}
                >
                  清空
                </NeonButton>
                <NeonButton
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={handleSelectAll}
                >
                  全选
                </NeonButton>
                <NeonButton
                  variant="red"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowRecycleConfirm(true)}
                  disabled={recyclePreview.count === 0}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  回收
                </NeonButton>
              </div>
            </NeonCard>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-cyber font-bold text-gray-300">
                可回收物品
                <span className="text-sm text-gray-500 ml-2">({inventoryItems.length})</span>
              </h3>
              <NeonButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setHistoryTab('recycle');
                  setShowHistory(true);
                }}
              >
                <History className="w-4 h-4 mr-1" />
                记录
              </NeonButton>
            </div>

            {inventoryItems.length === 0 ? (
              <Empty
                icon={Package}
                title="没有可回收的物品"
                description="去获取更多物品吧"
              />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {inventoryItems.map(({ item, inventoryItem }) =>
                  renderRecycleItem(item, inventoryItem)
                )}
              </div>
            )}

            <NeonCard className="mt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-cyber-cyan flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-400 space-y-1">
                  <p className="text-cyber-cyan font-medium">回收说明</p>
                  <p>• 回收物品可获得金币和材料奖励</p>
                  <p>• 已锁定的物品不会被回收</p>
                  <p>• 稀有度越高，回收奖励越丰厚</p>
                  <p>• 回收后物品将永久消失，请谨慎操作</p>
                </div>
              </div>
            </NeonCard>
          </div>
        )}

        {activeTab === 'exchange' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-cyber font-bold text-gray-300">
                兑换商品
              </h3>
              <NeonButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setHistoryTab('exchange');
                  setShowHistory(true);
                }}
              >
                <History className="w-4 h-4 mr-1" />
                记录
              </NeonButton>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {EXCHANGE_ITEMS.map(item => renderExchangeItem(item))}
            </div>

            <NeonCard className="mt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-cyber-green flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-400 space-y-1">
                  <p className="text-cyber-green font-medium">兑换说明</p>
                  <p>• 使用金币或宝石兑换各种物品</p>
                  <p>• 每日有兑换次数限制，次日重置</p>
                  <p>• 礼包内容为随机，稀有度固定</p>
                  <p>• 珍稀物品限时上架，不要错过</p>
                </div>
              </div>
            </NeonCard>
          </div>
        )}
      </div>

      {showRecycleConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border border-cyber-red/50 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-cyber font-bold text-cyber-red mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              确认回收
            </h2>
            <p className="text-gray-300 mb-4">
              确定要回收选中的 <span className="text-cyber-red font-bold">{recyclePreview.count}</span> 件物品吗？
            </p>
            <div className="p-3 bg-gray-900/50 rounded-lg mb-4">
              <p className="text-sm text-gray-400 mb-2">回收将获得：</p>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-cyber-yellow" />
                <span className="text-cyber-yellow font-bold">{recyclePreview.totalCoins} 金币</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                已锁定的物品不会被回收
              </p>
            </div>
            <div className="flex gap-3">
              <NeonButton variant="ghost" className="flex-1" onClick={() => setShowRecycleConfirm(false)}>
                取消
              </NeonButton>
              <NeonButton variant="red" className="flex-1" onClick={handleRecycle}>
                确认回收
              </NeonButton>
            </div>
          </div>
        </div>
      )}

      {showExchangeConfirm && selectedExchangeItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border border-cyber-green/50 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-cyber font-bold text-cyber-green mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              确认兑换
            </h2>

            <div className="text-center mb-6">
              <div className="text-5xl mb-3">{selectedExchangeItem.emoji}</div>
              <div className="text-sm mb-1" style={{ color: getRarityColor(selectedExchangeItem.rarity) }}>
                {getRarityStars(selectedExchangeItem.rarity)}
              </div>
              <div className="font-cyber font-bold text-lg" style={{ color: getRarityColor(selectedExchangeItem.rarity) }}>
                {selectedExchangeItem.name}
              </div>
              <p className="text-sm text-gray-500 mt-1">{selectedExchangeItem.description}</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                className="w-8 h-8 rounded-lg border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
                onClick={() => setExchangeCount(Math.max(1, exchangeCount - 1))}
              >
                -
              </button>
              <span className="w-12 text-center font-cyber font-bold text-xl text-white">
                {exchangeCount}
              </span>
              <button
                className="w-8 h-8 rounded-lg border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
                onClick={() => {
                  const max = selectedExchangeItem.dailyLimit
                    ? (getDailyRemaining(selectedExchangeItem.id, selectedExchangeItem.dailyLimit) || 1)
                    : 99;
                  setExchangeCount(Math.min(max, exchangeCount + 1));
                }}
              >
                +
              </button>
            </div>

            <div className="p-3 bg-gray-900/50 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">总计</span>
                <div className="flex items-center gap-1">
                  {selectedExchangeItem.cost.type === 'coins' ? (
                    <>
                      <Coins className="w-4 h-4 text-cyber-yellow" />
                      <span className="font-cyber font-bold text-cyber-yellow">
                        {selectedExchangeItem.cost.amount * exchangeCount}
                      </span>
                    </>
                  ) : (
                    <>
                      <Diamond className="w-4 h-4 text-cyber-cyan" />
                      <span className="font-cyber font-bold text-cyber-cyan">
                        {selectedExchangeItem.cost.amount * exchangeCount}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <NeonButton variant="ghost" className="flex-1" onClick={() => {
                setShowExchangeConfirm(false);
                setSelectedExchangeItem(null);
              }}>
                取消
              </NeonButton>
              <NeonButton
                variant="green"
                className="flex-1"
                onClick={() => handleExchange(selectedExchangeItem, exchangeCount)}
                disabled={!canExchange(selectedExchangeItem.id, exchangeCount)}
              >
                确认兑换
              </NeonButton>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border border-gray-700 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-xl font-cyber font-bold text-gray-300">
                {historyTab === 'recycle' ? '回收记录' : '兑换记录'}
              </h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 p-4 border-b border-gray-800">
              <button
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  historyTab === 'recycle'
                    ? 'bg-cyber-red/20 text-cyber-red'
                    : 'text-gray-500 hover:text-gray-300'
                )}
                onClick={() => setHistoryTab('recycle')}
              >
                回收记录
              </button>
              <button
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  historyTab === 'exchange'
                    ? 'bg-cyber-green/20 text-cyber-green'
                    : 'text-gray-500 hover:text-gray-300'
                )}
                onClick={() => setHistoryTab('exchange')}
              >
                兑换记录
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {historyTab === 'recycle' ? (
                recycleHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">暂无回收记录</p>
                ) : (
                  <div className="space-y-2">
                    {recycleHistory.map(record => renderHistoryItem(record))}
                  </div>
                )
              ) : (
                exchangeHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">暂无兑换记录</p>
                ) : (
                  <div className="space-y-2">
                    {exchangeHistory.map(record => renderHistoryItem(record))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
