import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Package,
  BookOpen,
  Search,
  Filter,
  Star,
  Lock,
  Unlock,
  Heart,
  HeartOff,
  Layers,
  List,
  Grid,
  Trash2,
  ArrowUpDown,
  ChevronDown,
  Check,
  X,
  Sparkles,
  Coins,
  RefreshCw,
  Info,
} from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { PartSlot } from '@/components/PartSlot';
import { SkillIcon } from '@/components/SkillIcon';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useTradeStore } from '@/store/useTradeStore';
import { getRarityColor, getRarityStars, getRarityName, formatNumber } from '@/utils/format';
import { cn } from '@/lib/utils';
import { QUALITY_NAMES, QUALITY_COLORS, getPartSet } from '@/data/parts';
import type { Part, Skill, Material, PartSlot as PartSlotType, SkillType, Rarity, InventoryItem } from '@/types';

type TabType = 'all' | 'part' | 'skill' | 'material';

export default function Inventory() {
  const navigate = useNavigate();
  const { player, ownedParts, ownedSkills, ownedMaterials } = useGameStore();
  const {
    initialize,
    filters,
    setFilter,
    bulkMode,
    selectedIds,
    toggleBulkMode,
    toggleSelectItem,
    selectAll,
    clearSelection,
    toggleLock,
    toggleFavorite,
    bulkLock,
    bulkUnlock,
    bulkFavorite,
    bulkUnfavorite,
    sortItems,
    getFilteredItems,
    isInitialized,
  } = useInventoryStore();

  const {
    recycleItems,
    toggleRecycleSelect,
    clearRecycleSelection,
    recycleSelectedIds,
    setShowRecycleConfirm,
    showRecycleConfirm,
  } = useTradeStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDetail, setSelectedDetail] = useState<{ item: Part | Skill | Material; inventoryItem: InventoryItem } | null>(null);
  const [recycleResult, setRecycleResult] = useState<{ totalCoins: number; materialsGained: any[]; itemsRecycled: number } | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  useEffect(() => {
    setFilter('itemType', activeTab);
  }, [activeTab, setFilter]);

  const filteredItems = useMemo(() => {
    if (!isInitialized) return [];
    return getFilteredItems();
  }, [isInitialized, getFilteredItems, filters]);

  const stats = useMemo(() => {
    return {
      total: ownedParts.length + ownedSkills.length + ownedMaterials.length,
      parts: ownedParts.length,
      skills: ownedSkills.length,
      materials: ownedMaterials.length,
    };
  }, [ownedParts.length, ownedSkills.length, ownedMaterials.length]);

  const tabs = [
    { type: 'all' as TabType, label: '全部', icon: Layers, count: stats.total },
    { type: 'part' as TabType, label: '部件', icon: Package, count: stats.parts },
    { type: 'skill' as TabType, label: '技能', icon: BookOpen, count: stats.skills },
    { type: 'material' as TabType, label: '材料', icon: Sparkles, count: stats.materials },
  ];

  const rarityOptions = [
    { value: 0, label: '全部稀有度' },
    { value: 1, label: '★ 普通' },
    { value: 2, label: '★★ 稀有' },
    { value: 3, label: '★★★ 史诗' },
    { value: 4, label: '★★★★ 传说' },
    { value: 5, label: '★★★★★ 神话' },
  ];

  const slotOptions: { value: PartSlotType | 'all'; label: string }[] = [
    { value: 'all', label: '全部部位' },
    { value: 'head', label: '头部' },
    { value: 'body', label: '躯干' },
    { value: 'limbs', label: '肢体' },
    { value: 'weapon', label: '武器' },
    { value: 'core', label: '核心' },
    { value: 'special', label: '特殊' },
  ];

  const skillTypeOptions: { value: SkillType | 'all'; label: string }[] = [
    { value: 'all', label: '全部类型' },
    { value: 'attack', label: '攻击' },
    { value: 'heal', label: '治疗' },
    { value: 'buff', label: '增益' },
    { value: 'debuff', label: '减益' },
    { value: 'special', label: '特殊' },
    { value: 'passive', label: '被动' },
  ];

  const sortOptions = [
    { value: 'rarity', label: '稀有度' },
    { value: 'name', label: '名称' },
    { value: 'acquiredAt', label: '获取时间' },
    { value: 'quality', label: '品质' },
  ];

  const handleRecycle = () => {
    const result = recycleItems(selectedIds);
    if (result.success) {
      setRecycleResult(result);
      clearSelection();
      setShowRecycleConfirm(false);
      setTimeout(() => setRecycleResult(null), 3000);
    }
  };

  const renderItemGrid = (itemData: Part | Skill | Material, invItem: InventoryItem) => {
    const rarityColor = getRarityColor(itemData.rarity);
    const isSelected = selectedIds.includes(invItem.id);
    const isPart = 'slot' in itemData && 'quality' in itemData;
    const isSkill = 'type' in itemData && 'damage' in itemData;

    const partSet = isPart && 'setId' in itemData && itemData.setId ? getPartSet(itemData.setId) : null;
    const quality = isPart && 'quality' in itemData ? itemData.quality : null;

    return (
      <div
        key={invItem.id}
        className={cn(
          'relative flex flex-col items-center p-3 rounded-xl border-2 transition-all cursor-pointer',
          isSelected
            ? 'border-cyber-cyan bg-cyber-cyan/10 scale-105'
            : 'border-gray-800 hover:border-gray-600 bg-gray-900/50',
          invItem.isFavorite && 'ring-2 ring-cyber-pink/50'
        )}
        onClick={() => {
          if (bulkMode) {
            toggleSelectItem(invItem.id);
          } else {
            setSelectedDetail({ item: itemData, inventoryItem: invItem });
          }
        }}
      >
        {bulkMode && (
          <div
            className={cn(
              'absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10',
              isSelected ? 'bg-cyber-cyan border-cyber-cyan' : 'border-gray-600 bg-gray-900/80'
            )}
          >
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        )}

        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          {invItem.isFavorite && (
            <Heart className="w-4 h-4 text-cyber-pink fill-cyber-pink" />
          )}
          {invItem.isLocked && (
            <Lock className="w-4 h-4 text-cyber-yellow" />
          )}
        </div>

        <div className="w-16 h-16 mb-2 flex items-center justify-center">
          {isPart ? (
            <div className="w-14 h-14">
              <PartSlot slot={itemData.slot} part={itemData as any} />
            </div>
          ) : isSkill ? (
            <SkillIcon skill={itemData as any} size="lg" />
          ) : (
            <div className="text-4xl">{itemData.emoji}</div>
          )}
        </div>

        <div className="text-center w-full">
          <div className="text-[10px] mb-0.5" style={{ color: rarityColor }}>
            {getRarityStars(itemData.rarity)}
          </div>
          <div className="text-xs font-medium truncate" style={{ color: rarityColor }}>
            {itemData.name}
          </div>
          {quality && quality > 1 && (
            <span
              className="text-[10px] font-cyber mt-0.5 px-1 rounded inline-block"
              style={{ color: QUALITY_COLORS[quality as keyof typeof QUALITY_COLORS], background: `${QUALITY_COLORS[quality as keyof typeof QUALITY_COLORS]}15` }}
            >
              {QUALITY_NAMES[quality as keyof typeof QUALITY_NAMES]}
            </span>
          )}
          {partSet && (
            <div className="text-[10px] mt-0.5 px-1 rounded" style={{ color: partSet.color, background: `${partSet.color}15` }}>
              {partSet.emoji} {partSet.name}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderItemList = (itemData: Part | Skill | Material, invItem: InventoryItem) => {
    const rarityColor = getRarityColor(itemData.rarity);
    const isSelected = selectedIds.includes(invItem.id);
    const isPart = 'slot' in itemData && 'quality' in itemData;
    const isSkill = 'type' in itemData && 'damage' in itemData;

    const partSet = isPart && 'setId' in itemData && itemData.setId ? getPartSet(itemData.setId) : null;
    const quality = isPart && 'quality' in itemData ? itemData.quality : null;

    return (
      <div
        key={invItem.id}
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer',
          isSelected
            ? 'border-cyber-cyan bg-cyber-cyan/10'
            : 'border-gray-800 hover:border-gray-600 bg-gray-900/50',
          invItem.isFavorite && 'ring-2 ring-cyber-pink/50'
        )}
        onClick={() => {
          if (bulkMode) {
            toggleSelectItem(invItem.id);
          } else {
            setSelectedDetail({ item: itemData, inventoryItem: invItem });
          }
        }}
      >
        {bulkMode && (
          <div
            className={cn(
              'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
              isSelected ? 'bg-cyber-cyan border-cyber-cyan' : 'border-gray-600 bg-gray-900/80'
            )}
          >
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        )}

        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
          {isPart ? (
            <PartSlot slot={itemData.slot} part={itemData as any} />
          ) : isSkill ? (
            <SkillIcon skill={itemData as any} />
          ) : (
            <div className="text-3xl">{itemData.emoji}</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: rarityColor }}>
              {getRarityStars(itemData.rarity)}
            </span>
            <span className="font-medium truncate" style={{ color: rarityColor }}>
              {itemData.name}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {isPart ? `${itemData.slot}部位` : isSkill ? itemData.type : itemData.type}
          </p>
          {partSet && (
            <span className="text-[10px] mt-0.5 px-1 rounded inline-block" style={{ color: partSet.color, background: `${partSet.color}15` }}>
              {partSet.emoji} {partSet.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {invItem.isFavorite && <Heart className="w-4 h-4 text-cyber-pink fill-cyber-pink" />}
          {invItem.isLocked && <Lock className="w-4 h-4 text-cyber-yellow" />}
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
              <h1 className="text-2xl font-cyber font-bold text-cyber-purple">仓库</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow/30 rounded-lg">
                <Coins className="w-5 h-5 text-cyber-yellow" />
                <span className="font-cyber font-bold text-cyber-yellow">{formatNumber(player.coins)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {tabs.map(tab => (
            <NeonCard
              key={tab.type}
              variant={tab.type === 'all' ? 'purple' : tab.type === 'part' ? 'cyan' : tab.type === 'skill' ? 'pink' : 'yellow'}
              className={cn(
                'cursor-pointer transition-all text-center',
                activeTab === tab.type ? 'ring-2 ring-white/30' : 'opacity-70 hover:opacity-100'
              )}
              onClick={() => setActiveTab(tab.type)}
            >
              <tab.icon className="w-6 h-6 mx-auto mb-2" style={{ color: getRarityColor(tab.type === 'all' ? 5 : tab.type === 'part' ? 4 : tab.type === 'skill' ? 4 : 3) }} />
              <div className="font-cyber font-bold text-lg">{tab.count}</div>
              <div className="text-xs text-gray-400">{tab.label}</div>
            </NeonCard>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="搜索物品..."
              value={filters.search || ''}
              onChange={(e) => setFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyber-cyan/50"
            />
          </div>

          <NeonButton
            size="sm"
            variant="ghost"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
          >
            <Filter className="w-4 h-4 mr-1" />
            筛选
          </NeonButton>

          <NeonButton
            size="sm"
            variant={bulkMode ? 'cyan' : 'ghost'}
            onClick={() => {
              toggleBulkMode();
              clearSelection();
            }}
          >
            <Check className="w-4 h-4 mr-1" />
            批量
          </NeonButton>

          <div className="flex border border-gray-700 rounded-lg overflow-hidden">
            <button
              className={cn(
                'px-3 py-2 transition-colors',
                viewMode === 'grid' ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'text-gray-500 hover:text-gray-300'
              )}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              className={cn(
                'px-3 py-2 transition-colors',
                viewMode === 'list' ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'text-gray-500 hover:text-gray-300'
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showFilterPanel && (
          <NeonCard className="mb-4 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">稀有度</label>
                <select
                  value={filters.rarity}
                  onChange={(e) => setFilter('rarity', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyber-cyan/50"
                >
                  {rarityOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {(activeTab === 'all' || activeTab === 'part') && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">部件部位</label>
                  <select
                    value={filters.slot || 'all'}
                    onChange={(e) => setFilter('slot', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyber-cyan/50"
                  >
                    {slotOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {(activeTab === 'all' || activeTab === 'skill') && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">技能类型</label>
                  <select
                    value={filters.skillType || 'all'}
                    onChange={(e) => setFilter('skillType', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyber-cyan/50"
                  >
                    {skillTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 mb-1 block">排序方式</label>
                <div className="flex gap-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => sortItems(e.target.value as any)}
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyber-cyan/50"
                  >
                    {sortOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => sortItems(filters.sortBy, filters.sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.onlyFavorites}
                    onChange={(e) => setFilter('onlyFavorites', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-cyber-pink focus:ring-cyber-pink/50"
                  />
                  <span className="text-sm text-gray-300">仅收藏</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.onlyLocked}
                    onChange={(e) => setFilter('onlyLocked', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-cyber-yellow focus:ring-cyber-yellow/50"
                  />
                  <span className="text-sm text-gray-300">仅锁定</span>
                </label>
              </div>
            </div>
          </NeonCard>
        )}

        {bulkMode && (
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-xl">
            <span className="text-cyber-cyan font-cyber text-sm">
              已选择 {selectedIds.length} 项
            </span>
            <div className="flex-1" />
            <NeonButton size="sm" variant="ghost" onClick={selectAll}>
              <Check className="w-4 h-4 mr-1" />
              全选
            </NeonButton>
            <NeonButton size="sm" variant="ghost" onClick={clearSelection}>
              <X className="w-4 h-4 mr-1" />
              清空
            </NeonButton>
            <NeonButton size="sm" variant="pink" onClick={() => { bulkFavorite(); }}>
              <Heart className="w-4 h-4 mr-1" />
              收藏
            </NeonButton>
            <NeonButton size="sm" variant="ghost" onClick={() => { bulkUnfavorite(); }}>
              <HeartOff className="w-4 h-4 mr-1" />
              取消收藏
            </NeonButton>
            <NeonButton size="sm" variant="yellow" onClick={() => { bulkLock(); }}>
              <Lock className="w-4 h-4 mr-1" />
              锁定
            </NeonButton>
            <NeonButton size="sm" variant="ghost" onClick={() => { bulkUnlock(); }}>
              <Unlock className="w-4 h-4 mr-1" />
              解锁
            </NeonButton>
            <NeonButton size="sm" variant="red" onClick={() => setShowRecycleConfirm(true)}>
              <Trash2 className="w-4 h-4 mr-1" />
              回收
            </NeonButton>
          </div>
        )}

        {recycleResult && (
          <div className="mb-4 p-4 bg-green-900/20 border border-green-500/30 rounded-xl flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-green-400 animate-spin" />
            <div>
              <p className="text-green-400 font-medium">回收成功！</p>
              <p className="text-sm text-green-300/80">
                回收了 {recycleResult.itemsRecycled} 件物品，获得 {recycleResult.totalCoins} 金币
                {recycleResult.materialsGained.length > 0 && ' 和材料奖励'}
              </p>
            </div>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <Empty
            icon={Package}
            title="没有找到物品"
            description="尝试调整筛选条件或抽取新的物品吧"
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filteredItems.map(({ item, inventoryItem }) => renderItemGrid(item, inventoryItem))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map(({ item, inventoryItem }) => renderItemList(item, inventoryItem))}
          </div>
        )}
      </div>

      {selectedDetail && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDetail(null)}>
          <div
            className="bg-cyber-dark border border-gray-700 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-cyber font-bold" style={{ color: getRarityColor(selectedDetail.item.rarity) }}>
                  {selectedDetail.item.name}
                </h2>
                <button onClick={() => setSelectedDetail(null)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center mb-6">
                <div
                  className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-3"
                  style={{
                    border: `3px solid ${getRarityColor(selectedDetail.item.rarity)}`,
                    boxShadow: `0 0 20px ${getRarityColor(selectedDetail.item.rarity)}40`,
                    background: `linear-gradient(135deg, ${getRarityColor(selectedDetail.item.rarity)}10, ${getRarityColor(selectedDetail.item.rarity)}20)`,
                  }}
                >
                  {'slot' in selectedDetail.item ? (
                    <span className="text-5xl">{selectedDetail.item.emoji}</span>
                  ) : 'damage' in selectedDetail.item ? (
                    <span className="text-5xl">{selectedDetail.item.emoji}</span>
                  ) : (
                    <span className="text-5xl">{selectedDetail.item.emoji}</span>
                  )}
                </div>
                <div className="text-sm mb-1" style={{ color: getRarityColor(selectedDetail.item.rarity) }}>
                  {getRarityStars(selectedDetail.item.rarity)} {getRarityName(selectedDetail.item.rarity)}
                </div>
                <p className="text-gray-400 text-sm">
                  {'slot' in selectedDetail.item ? `${selectedDetail.item.slot}部位` :
                    'damage' in selectedDetail.item ? `${selectedDetail.item.type}技能` :
                      selectedDetail.item.type}
                </p>
              </div>

              <NeonCard className="mb-4">
                <h3 className="font-cyber font-bold text-sm text-gray-400 mb-2">描述</h3>
                <p className="text-sm text-gray-300">
                  {'description' in selectedDetail.item ? selectedDetail.item.description : '一件珍贵的物品。'}
                </p>
              </NeonCard>

              {'stats' in selectedDetail.item && selectedDetail.item.stats && (
                <NeonCard className="mb-4">
                  <h3 className="font-cyber font-bold text-sm text-gray-400 mb-2">属性</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedDetail.item.stats.hp && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">生命</span>
                        <span className="text-green-400">+{selectedDetail.item.stats.hp}</span>
                      </div>
                    )}
                    {selectedDetail.item.stats.atk && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">攻击</span>
                        <span className="text-red-400">+{selectedDetail.item.stats.atk}</span>
                      </div>
                    )}
                    {selectedDetail.item.stats.def && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">防御</span>
                        <span className="text-blue-400">+{selectedDetail.item.stats.def}</span>
                      </div>
                    )}
                    {selectedDetail.item.stats.spd && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">速度</span>
                        <span className="text-yellow-400">+{selectedDetail.item.stats.spd}</span>
                      </div>
                    )}
                  </div>
                </NeonCard>
              )}

              {'quality' in selectedDetail.item && selectedDetail.item.quality > 1 && (
                <div className="mb-4 text-center">
                  <span
                    className="text-sm font-cyber px-3 py-1 rounded-full"
                    style={{
                      color: QUALITY_COLORS[selectedDetail.item.quality as keyof typeof QUALITY_COLORS],
                      background: `${QUALITY_COLORS[selectedDetail.item.quality as keyof typeof QUALITY_COLORS]}15`,
                      border: `1px solid ${QUALITY_COLORS[selectedDetail.item.quality as keyof typeof QUALITY_COLORS]}30`,
                    }}
                  >
                    品质: {QUALITY_NAMES[selectedDetail.item.quality as keyof typeof QUALITY_NAMES]}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <NeonButton
                  variant={selectedDetail.inventoryItem.isFavorite ? 'pink' : 'ghost'}
                  className="flex-1"
                  onClick={() => toggleFavorite(selectedDetail.inventoryItem.id)}
                >
                  {selectedDetail.inventoryItem.isFavorite ? (
                    <><Heart className="w-4 h-4 mr-1 fill-cyber-pink" /> 取消收藏</>
                  ) : (
                    <><Heart className="w-4 h-4 mr-1" /> 收藏</>
                  )}
                </NeonButton>
                <NeonButton
                  variant={selectedDetail.inventoryItem.isLocked ? 'yellow' : 'ghost'}
                  className="flex-1"
                  onClick={() => toggleLock(selectedDetail.inventoryItem.id)}
                >
                  {selectedDetail.inventoryItem.isLocked ? (
                    <><Unlock className="w-4 h-4 mr-1" /> 解锁</>
                  ) : (
                    <><Lock className="w-4 h-4 mr-1" /> 锁定</>
                  )}
                </NeonButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRecycleConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border border-cyber-red/50 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-cyber font-bold text-cyber-red mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              确认回收
            </h2>
            <p className="text-gray-300 mb-4">
              确定要回收选中的 <span className="text-cyber-red font-bold">{selectedIds.length}</span> 件物品吗？
            </p>
            <div className="p-3 bg-gray-900/50 rounded-lg mb-4">
              <p className="text-sm text-gray-400 mb-2">回收将获得：</p>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-cyber-yellow" />
                <span className="text-cyber-yellow font-medium">金币奖励</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                锁定的物品不会被回收
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
    </div>
  );
}
