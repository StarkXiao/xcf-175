import { useState, useEffect, useMemo } from 'react';
import {
  Gavel,
  Clock,
  Coins,
  Filter,
  Search,
  ArrowLeft,
  Plus,
  X,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Package,
  History,
  Award,
  ListOrdered,
  Eye,
  Hammer,
  Zap,
  User,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { Empty } from '@/components/Empty';
import { SkillIcon } from '@/components/SkillIcon';
import { useAuctionStore } from '@/store/useAuctionStore';
import { useGameStore } from '@/store/useGameStore';
import type { AuctionItem, Rarity, Part, Skill, BidRecord } from '@/types';
import { getRarityColor, getRarityName, getRarityStars, formatNumber } from '@/utils/format';
import { QUALITY_NAMES, QUALITY_COLORS, getPartSet } from '@/data/parts';
import { ELEMENT_EMOJIS, ELEMENT_NAMES, ELEMENT_COLORS, STATUS_EFFECT_CONFIG } from '@/engine/constants';

type TabKey = 'market' | 'bids' | 'listed' | 'won' | 'transactions';

const RARITY_OPTIONS: { value: 0 | Rarity; label: string }[] = [
  { value: 0, label: '全部' },
  { value: 2, label: '★★ 稀有' },
  { value: 3, label: '★★★ 史诗' },
  { value: 4, label: '★★★★ 传说' },
  { value: 5, label: '★★★★★ 神话' },
];

const formatCountdown = (ms: number): string => {
  if (ms <= 0) return '已结束';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getBuyoutPrice = (auction: AuctionItem): number => {
  return Math.floor(auction.startingPrice * 3 + auction.currentPrice * 0.5);
};

interface AuctionCardProps {
  auction: AuctionItem;
  onClick: () => void;
}

const AuctionCard = ({ auction, onClick }: AuctionCardProps) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = auction.endsAt - now;
  const isUrgent = remaining > 0 && remaining < 60000;
  const isHot = auction.bids.length >= 5;
  const priceChange = auction.priceFluctuationHistory.length >= 2
    ? ((auction.currentPrice - auction.priceFluctuationHistory[auction.priceFluctuationHistory.length - 2].price) / auction.priceFluctuationHistory[auction.priceFluctuationHistory.length - 2].price) * 100
    : 0;

  const variant = auction.itemData.rarity >= 5 ? 'yellow' : auction.itemData.rarity >= 4 ? 'purple' : auction.itemData.rarity >= 3 ? 'cyan' : 'default';

  return (
    <NeonCard variant={variant} className="cursor-pointer hover:scale-[1.02] transition-all duration-200" onClick={onClick} glow={auction.itemData.rarity >= 4}>
      <div className="flex items-start gap-3">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 border-2"
          style={{
            backgroundColor: `${getRarityColor(auction.itemData.rarity)}15`,
            borderColor: `${getRarityColor(auction.itemData.rarity)}40`,
          }}
        >
          {auction.itemType === 'skill' ? (
            <SkillIcon skill={auction.itemData as Skill} size="md" />
          ) : (
            <span>{(auction.itemData as Part).emoji}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-cyber font-bold text-white truncate">{auction.itemData.name}</span>
                {isHot && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-red/20 text-cyber-red font-bold animate-pulse">
                    🔥 热门
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold" style={{ color: getRarityColor(auction.itemData.rarity) }}>
                  {getRarityStars(auction.itemData.rarity as Rarity)} {getRarityName(auction.itemData.rarity as Rarity)}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">
                  {auction.itemType === 'part' ? '部件' : '技能'}
                </span>
                {auction.itemType === 'part' && 'quality' in auction.itemData && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{
                      backgroundColor: `${QUALITY_COLORS[(auction.itemData as Part).quality]}20`,
                      color: QUALITY_COLORS[(auction.itemData as Part).quality],
                    }}
                  >
                    {QUALITY_NAMES[(auction.itemData as Part).quality]}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                <Coins className="w-3 h-3" />
                <span>当前价</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-cyber font-bold text-cyber-yellow text-lg">
                  {formatNumber(auction.currentPrice)}
                </span>
                {priceChange !== 0 && (
                  <span className={`flex items-center text-[10px] font-bold ${priceChange > 0 ? 'text-cyber-green' : 'text-cyber-red'}`}>
                    {priceChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(priceChange).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className={`flex items-center gap-1 text-xs mb-0.5 ${isUrgent ? 'text-cyber-red' : 'text-gray-500'}`}>
                <Clock className="w-3 h-3" />
                <span>{isUrgent ? '即将结束' : '剩余'}</span>
              </div>
              <span className={`font-cyber font-bold ${isUrgent ? 'text-cyber-red animate-pulse' : remaining <= 0 ? 'text-gray-600' : 'text-gray-300'}`}>
                {formatCountdown(remaining)}
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <Hammer className="w-3 h-3" />
              {auction.bids.length} 次出价
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              卖家: {auction.sellerName}
            </span>
          </div>
        </div>
      </div>
    </NeonCard>
  );
};

interface BidDialogProps {
  auction: AuctionItem;
  onClose: () => void;
}

const BidDialog = ({ auction, onClose }: BidDialogProps) => {
  const player = useGameStore(state => state.player);
  const placeBid = useAuctionStore(state => state.placeBid);
  const buyout = useAuctionStore(state => state.buyout);
  const [bidAmount, setBidAmount] = useState(auction.currentPrice + auction.minBidIncrement);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = auction.endsAt - now;
  const minBid = auction.currentPrice + auction.minBidIncrement;
  const buyoutPrice = getBuyoutPrice(auction);

  const handlePlaceBid = () => {
    const result = placeBid(auction.id, bidAmount);
    setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    if (result.success) {
      setTimeout(() => {
        setBidAmount(bidAmount + auction.minBidIncrement);
        setMessage(null);
      }, 1000);
    }
  };

  const handleBuyout = () => {
    const result = buyout(auction.id);
    setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    if (result.success) {
      setTimeout(onClose, 1500);
    }
  };

  const chartData = auction.priceFluctuationHistory.slice(-20);
  const maxPrice = Math.max(...chartData.map(p => p.price));
  const minPrice = Math.min(...chartData.map(p => p.price));
  const priceRange = maxPrice - minPrice || 1;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-cyber-dark border-2 border-cyber-pink rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-cyber-dark">
          <div className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-cyber-pink" />
            <h3 className="font-cyber font-bold text-lg text-cyber-pink">拍卖详情</h3>
          </div>
          <NeonButton size="sm" variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </NeonButton>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shrink-0 border-2"
                  style={{
                    backgroundColor: `${getRarityColor(auction.itemData.rarity)}15`,
                    borderColor: `${getRarityColor(auction.itemData.rarity)}50`,
                  }}
                >
                  {auction.itemType === 'skill' ? (
                    <SkillIcon skill={auction.itemData as Skill} size="lg" />
                  ) : (
                    <span>{(auction.itemData as Part).emoji}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-cyber font-bold text-xl text-white">{auction.itemData.name}</h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm font-bold" style={{ color: getRarityColor(auction.itemData.rarity as Rarity) }}>
                      {getRarityStars(auction.itemData.rarity as Rarity)} {getRarityName(auction.itemData.rarity as Rarity)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-gray-400">
                      {auction.itemType === 'part' ? '部件' : '技能'}
                    </span>
                    {auction.itemType === 'part' && 'slot' in auction.itemData && (
                      <span className="text-xs px-2 py-0.5 rounded bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30">
                        {(auction.itemData as Part).slot}
                      </span>
                    )}
                    {auction.itemType === 'part' && 'quality' in auction.itemData && (
                      <span
                        className="text-xs px-2 py-0.5 rounded font-bold border"
                        style={{
                          backgroundColor: `${QUALITY_COLORS[(auction.itemData as Part).quality]}15`,
                          color: QUALITY_COLORS[(auction.itemData as Part).quality],
                          borderColor: `${QUALITY_COLORS[(auction.itemData as Part).quality]}40`,
                        }}
                      >
                        {QUALITY_NAMES[(auction.itemData as Part).quality]}品质
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{auction.itemData.description}</p>
                </div>
              </div>

              <NeonCard variant="default" size="sm" className="mb-4">
                <h5 className="font-cyber font-bold text-sm text-gray-300 mb-2 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyber-cyan" /> 属性
                </h5>
                <div className="space-y-1">
                  {auction.itemType === 'part' && 'stats' in auction.itemData && (
                    <div className="flex flex-wrap gap-2">
                      {(auction.itemData as Part).stats.hp && (
                        <span className="text-xs px-2 py-1 rounded bg-cyber-green/10 text-cyber-green">HP +{(auction.itemData as Part).stats.hp}</span>
                      )}
                      {(auction.itemData as Part).stats.atk && (
                        <span className="text-xs px-2 py-1 rounded bg-cyber-red/10 text-cyber-red">ATK +{(auction.itemData as Part).stats.atk}</span>
                      )}
                      {(auction.itemData as Part).stats.def && (
                        <span className="text-xs px-2 py-1 rounded bg-cyber-cyan/10 text-cyber-cyan">DEF +{(auction.itemData as Part).stats.def}</span>
                      )}
                      {(auction.itemData as Part).stats.spd && (
                        <span className="text-xs px-2 py-1 rounded bg-cyber-yellow/10 text-cyber-yellow">SPD +{(auction.itemData as Part).stats.spd}</span>
                      )}
                      {(auction.itemData as Part).setId && (
                        <span className="text-xs px-2 py-1 rounded bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/30">
                          {getPartSet((auction.itemData as Part).setId!)?.emoji} {getPartSet((auction.itemData as Part).setId!)?.name}套装
                        </span>
                      )}
                    </div>
                  )}
                  {auction.itemType === 'skill' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-cyber-red/10 text-cyber-red">伤害: {(auction.itemData as Skill).damage}</span>
                        <span className="text-xs px-2 py-1 rounded bg-cyber-cyan/10 text-cyber-cyan">CD: {(auction.itemData as Skill).cooldown}回合</span>
                        {'element' in auction.itemData && auction.itemData.element && (
                          <span
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              backgroundColor: `${ELEMENT_COLORS[auction.itemData.element]}15`,
                              color: ELEMENT_COLORS[auction.itemData.element],
                              border: `1px solid ${ELEMENT_COLORS[auction.itemData.element]}40`,
                            }}
                          >
                            {ELEMENT_EMOJIS[auction.itemData.element]} {ELEMENT_NAMES[auction.itemData.element]}系
                          </span>
                        )}
                      </div>
                      {'statusEffect' in auction.itemData && auction.itemData.statusEffect && (
                        <span
                          className="inline-block text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: `${STATUS_EFFECT_CONFIG[(auction.itemData as Skill).statusEffect!.type].color}15`,
                            color: STATUS_EFFECT_CONFIG[(auction.itemData as Skill).statusEffect!.type].color,
                          }}
                        >
                          {STATUS_EFFECT_CONFIG[(auction.itemData as Skill).statusEffect!.type].emoji}{' '}
                          {STATUS_EFFECT_CONFIG[(auction.itemData as Skill).statusEffect!.type].name} {(auction.itemData as Skill).statusEffect!.chance}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </NeonCard>

              <NeonCard variant="pink" size="sm">
                <h5 className="font-cyber font-bold text-sm text-gray-300 mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyber-pink" /> 价格走势
                </h5>
                <div className="h-24 flex items-end gap-0.5">
                  {chartData.map((p, i) => {
                    const height = ((p.price - minPrice) / priceRange) * 100;
                    const isLast = i === chartData.length - 1;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t transition-all"
                        style={{
                          height: `${Math.max(5, height)}%`,
                          backgroundColor: isLast ? '#f472b6' : `${getRarityColor(auction.itemData.rarity as Rarity)}60`,
                          minWidth: '4px',
                        }}
                        title={`${formatNumber(p.price)} 💰`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>最低 {formatNumber(minPrice)}</span>
                  <span>最高 {formatNumber(maxPrice)}</span>
                </div>
              </NeonCard>
            </div>

            <div>
              <NeonCard variant="cyan" size="sm" className="mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">起拍价</div>
                    <div className="font-cyber font-bold text-gray-300">{formatNumber(auction.startingPrice)} 💰</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">当前价</div>
                    <div className="font-cyber font-bold text-cyber-yellow text-lg">{formatNumber(auction.currentPrice)} 💰</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">最小加价</div>
                    <div className="font-cyber font-bold text-gray-300">+{formatNumber(auction.minBidIncrement)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">剩余时间</div>
                    <div className={`font-cyber font-bold ${remaining < 60000 ? 'text-cyber-red animate-pulse' : 'text-cyber-cyan'}`}>
                      {formatCountdown(remaining)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">一口价</div>
                    <div className="font-cyber font-bold text-cyber-green">{formatNumber(buyoutPrice)} 💰</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">出价次数</div>
                    <div className="font-cyber font-bold text-gray-300">{auction.bids.length} 次</div>
                  </div>
                </div>
                {auction.highestBidderName && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs">
                    <span className="text-gray-500">当前最高出价者</span>
                    <span className={`font-cyber font-bold ${auction.highestBidderName === '你' ? 'text-cyber-pink' : 'text-gray-300'}`}>
                      {auction.highestBidderName}
                    </span>
                  </div>
                )}
              </NeonCard>

              {auction.status === 'active' && remaining > 0 && (
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-gray-500">你的金币</label>
                      <span className="text-xs font-cyber font-bold text-cyber-yellow">{formatNumber(player.coins)} 💰</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={bidAmount}
                        min={minBid}
                        step={auction.minBidIncrement}
                        onChange={e => setBidAmount(Math.max(minBid, parseInt(e.target.value) || minBid))}
                        className="flex-1 bg-cyber-darker border border-gray-700 rounded-lg px-4 py-2.5 text-white font-cyber focus:outline-none focus:border-cyber-cyan transition-colors"
                      />
                      <NeonButton
                        size="sm"
                        variant="cyan"
                        onClick={() => setBidAmount(bidAmount + auction.minBidIncrement)}
                      >
                        +{formatNumber(auction.minBidIncrement)}
                      </NeonButton>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">最低出价: {formatNumber(minBid)} 💰</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <NeonButton
                      variant="pink"
                      fullWidth
                      disabled={bidAmount < minBid || player.coins < bidAmount}
                      onClick={handlePlaceBid}
                    >
                      <Gavel className="w-4 h-4 mr-1.5" />
                      出价竞拍
                    </NeonButton>
                    <NeonButton
                      variant="green"
                      fullWidth
                      disabled={player.coins < buyoutPrice}
                      onClick={handleBuyout}
                    >
                      <Zap className="w-4 h-4 mr-1.5" />
                      一口价
                    </NeonButton>
                  </div>

                  {message && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-cyber-green/15 text-cyber-green border border-cyber-green/30' : 'bg-cyber-red/15 text-cyber-red border border-cyber-red/30'}`}>
                      {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {message.text}
                    </div>
                  )}
                </div>
              )}

              <NeonCard variant="default" size="sm">
                <h5 className="font-cyber font-bold text-sm text-gray-300 mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-cyber-purple" /> 出价记录
                </h5>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {auction.bids.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">暂无出价</p>
                  ) : (
                    [...auction.bids].reverse().map((bid, i) => (
                      <div
                        key={bid.id}
                        className={`flex items-center justify-between p-2 rounded-lg ${i === 0 ? 'bg-cyber-pink/10 border border-cyber-pink/30' : 'bg-gray-800/30'}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${bid.bidderName === '你' ? 'bg-cyber-pink/20 text-cyber-pink' : 'bg-gray-700 text-gray-400'}`}>
                            {bid.bidderName.charAt(0)}
                          </div>
                          <div>
                            <div className={`text-xs font-bold ${bid.bidderName === '你' ? 'text-cyber-pink' : 'text-gray-300'}`}>
                              {bid.bidderName}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {new Date(bid.timestamp).toLocaleTimeString('zh-CN')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-cyber font-bold text-cyber-yellow">{formatNumber(bid.amount)} 💰</div>
                          {i === 0 && <div className="text-[10px] text-cyber-pink">最高</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </NeonCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ListItemDialogProps {
  onClose: () => void;
}

const ListItemDialog = ({ onClose }: ListItemDialogProps) => {
  const { ownedParts, ownedSkills, player, spendCoins } = useGameStore();
  const listItemForAuction = useAuctionStore(state => state.listItemForAuction);
  const [itemType, setItemType] = useState<'part' | 'skill'>('part');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startingPrice, setStartingPrice] = useState(500);
  const [duration, setDuration] = useState(15);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const items = itemType === 'part' ? ownedParts : ownedSkills;
  const selectedItem = items.find(i => i.id === selectedId);
  const fee = Math.floor(startingPrice * 0.05);

  const handleSubmit = () => {
    if (!selectedId) {
      setMessage({ type: 'error', text: '请选择要上架的物品' });
      return;
    }
    if (startingPrice < 100) {
      setMessage({ type: 'error', text: '起拍价最低 100 💰' });
      return;
    }
    if (player.coins < fee) {
      setMessage({ type: 'error', text: `上架手续费不足（需要 ${fee} 💰）` });
      return;
    }
    const result = listItemForAuction(itemType, selectedId, startingPrice, duration);
    setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    if (result.success) {
      setTimeout(onClose, 1500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-cyber-dark border-2 border-cyber-purple rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-cyber-purple" />
            <h3 className="font-cyber font-bold text-lg text-cyber-purple">上架拍卖</h3>
          </div>
          <NeonButton size="sm" variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </NeonButton>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="flex gap-2">
            <NeonButton
              size="sm"
              variant={itemType === 'part' ? 'cyan' : 'ghost'}
              fullWidth
              onClick={() => { setItemType('part'); setSelectedId(null); }}
            >
              部件 ({ownedParts.length})
            </NeonButton>
            <NeonButton
              size="sm"
              variant={itemType === 'skill' ? 'pink' : 'ghost'}
              fullWidth
              onClick={() => { setItemType('skill'); setSelectedId(null); }}
            >
              技能 ({ownedSkills.length})
            </NeonButton>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-2">选择物品</label>
            {items.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-gray-700 rounded-xl text-center">
                <p className="text-sm text-gray-500">背包中没有可上架的{itemType === 'part' ? '部件' : '技能'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                {items.map(item => {
                  const isSelected = selectedId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-cyber-purple/15 border-cyber-purple/50' : 'bg-cyber-darker border-gray-700 hover:border-gray-600'}`}
                      onClick={() => {
                        setSelectedId(item.id);
                        const baseMult = { 1: 1, 2: 2.5, 3: 6, 4: 15, 5: 40 }[item.rarity] || 1;
                        const basePrice = ('price' in item && item.price) || 100;
                        setStartingPrice(Math.max(100, Math.floor(basePrice * baseMult * 0.8)));
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                          style={{
                            backgroundColor: `${getRarityColor(item.rarity as Rarity)}15`,
                            border: `1px solid ${getRarityColor(item.rarity as Rarity)}40`,
                          }}
                        >
                          {itemType === 'skill' ? <SkillIcon skill={item as Skill} size="sm" /> : (item as Part).emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-cyber font-bold text-white text-sm">{item.name}</span>
                            <span className="text-[10px]" style={{ color: getRarityColor(item.rarity as Rarity) }}>
                              {getRarityStars(item.rarity as Rarity)}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate">{item.description}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-cyber-purple shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedItem && (
            <div className="p-3 rounded-xl bg-cyber-darker border border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">起拍价 (💰)</label>
                  <input
                    type="number"
                    value={startingPrice}
                    min={100}
                    step={50}
                    onChange={e => setStartingPrice(Math.max(100, parseInt(e.target.value) || 100))}
                    className="w-full bg-cyber-dark border border-gray-700 rounded-lg px-3 py-2 text-white font-cyber focus:outline-none focus:border-cyber-purple transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">拍卖时长</label>
                  <select
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value))}
                    className="w-full bg-cyber-dark border border-gray-700 rounded-lg px-3 py-2 text-white font-cyber focus:outline-none focus:border-cyber-purple transition-colors"
                  >
                    <option value={5}>5 分钟</option>
                    <option value={10}>10 分钟</option>
                    <option value={15}>15 分钟</option>
                    <option value={30}>30 分钟</option>
                    <option value={60}>1 小时</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  上架手续费 (5%): <span className="font-cyber font-bold text-cyber-red">{fee} 💰</span>
                </span>
                <span className="text-gray-500">
                  你的余额: <span className="font-cyber font-bold text-cyber-yellow">{formatNumber(player.coins)} 💰</span>
                </span>
              </div>
            </div>
          )}

          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-cyber-green/15 text-cyber-green border border-cyber-green/30' : 'bg-cyber-red/15 text-cyber-red border border-cyber-red/30'}`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          <div className="flex gap-2">
            <NeonButton size="sm" variant="ghost" fullWidth onClick={onClose}>
              取消
            </NeonButton>
            <NeonButton
              size="sm"
              variant="purple"
              fullWidth
              disabled={!selectedId || player.coins < fee}
              onClick={handleSubmit}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              确认上架
            </NeonButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Auction() {
  const {
    initialize,
    filter,
    setFilter,
    getFilteredAuctions,
    getPlayerActiveBids,
    getPlayerWonAuctions,
    getPlayerListedAuctions,
    transactions,
    refreshAuctions,
    processEndedAuctions,
    claimWonItem,
    cancelAuction,
  } = useAuctionStore();

  const player = useGameStore(state => state.player);

  const [activeTab, setActiveTab] = useState<TabKey>('market');
  const [selectedAuction, setSelectedAuction] = useState<AuctionItem | null>(null);
  const [showListDialog, setShowListDialog] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    initialize();
    const t = setInterval(() => {
      setNow(Date.now());
      processEndedAuctions();
    }, 1000);
    return () => clearInterval(t);
  }, [initialize, processEndedAuctions]);

  const filteredAuctions = useMemo(() => getFilteredAuctions(), [getFilteredAuctions, now, filter]);
  const activeBids = useMemo(() => getPlayerActiveBids(), [getPlayerActiveBids, now]);
  const wonAuctions = useMemo(() => getPlayerWonAuctions(), [getPlayerWonAuctions, now]);
  const listedAuctions = useMemo(() => getPlayerListedAuctions(), [getPlayerListedAuctions]);

  const tabs: { key: TabKey; label: string; icon: typeof Gavel; badge?: number }[] = [
    { key: 'market', label: '拍卖市场', icon: Gavel, badge: filteredAuctions.length },
    { key: 'bids', label: '我的出价', icon: Eye, badge: activeBids.length },
    { key: 'listed', label: '我上架的', icon: ListOrdered, badge: listedAuctions.filter(a => a.status === 'active').length },
    { key: 'won', label: '已赢得', icon: Award, badge: wonAuctions.length },
    { key: 'transactions', label: '资产流水', icon: History },
  ];

  const handleClaim = (auctionId: string) => {
    const result = claimWonItem(auctionId);
    setClaimMessage({ type: result.success ? 'success' : 'error', text: result.message });
    setTimeout(() => setClaimMessage(null), 2000);
  };

  const handleCancel = (auctionId: string) => {
    const result = cancelAuction(auctionId);
    setClaimMessage({ type: result.success ? 'success' : 'error', text: result.message });
    setTimeout(() => setClaimMessage(null), 2000);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 pt-20">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyber-purple/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyber-pink/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Gavel className="w-8 h-8 text-cyber-pink" />
              <h1 className="text-3xl font-cyber font-bold bg-gradient-to-r from-cyber-pink via-cyber-purple to-cyber-cyan bg-clip-text text-transparent">
                黑市拍卖
              </h1>
            </div>
            <p className="text-sm text-gray-500 ml-11">稀有部件与技能的地下交易市场，价格实时波动</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-dark border border-cyber-yellow/30">
              <Coins className="w-5 h-5 text-cyber-yellow" />
              <span className="font-cyber font-bold text-cyber-yellow">{formatNumber(player.coins)}</span>
            </div>
            <NeonButton
              size="sm"
              variant="ghost"
              onClick={() => refreshAuctions()}
              title="刷新拍卖"
            >
              <RefreshCw className="w-4 h-4" />
            </NeonButton>
            <NeonButton
              size="sm"
              variant="purple"
              onClick={() => setShowListDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              上架物品
            </NeonButton>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-cyber font-bold text-sm transition-all ${isActive
                  ? 'bg-cyber-pink/20 text-cyber-pink border border-cyber-pink/50 shadow-lg shadow-cyber-pink/10'
                  : 'bg-cyber-dark/50 text-gray-400 border border-gray-700 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-cyber-pink text-white' : 'bg-gray-700 text-gray-300'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {claimMessage && (
          <div className={`mb-4 flex items-center gap-2 p-3 rounded-xl ${claimMessage.type === 'success' ? 'bg-cyber-green/15 text-cyber-green border border-cyber-green/30' : 'bg-cyber-red/15 text-cyber-red border border-cyber-red/30'}`}>
            {claimMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {claimMessage.text}
          </div>
        )}

        {activeTab === 'market' && (
          <>
            <NeonCard variant="default" size="sm" className="mb-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="搜索物品..."
                      value={filter.search || ''}
                      onChange={e => setFilter({ search: e.target.value })}
                      className="w-full bg-cyber-darker border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-cyan transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                    <Filter className="w-3 h-3" /> 类型
                  </label>
                  <select
                    value={filter.type}
                    onChange={e => setFilter({ type: e.target.value as any })}
                    className="w-full bg-cyber-darker border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyber-cyan transition-colors"
                  >
                    <option value="all">全部</option>
                    <option value="part">部件</option>
                    <option value="skill">技能</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                    <Filter className="w-3 h-3" /> 稀有度
                  </label>
                  <select
                    value={filter.rarity}
                    onChange={e => setFilter({ rarity: parseInt(e.target.value) as any })}
                    className="w-full bg-cyber-darker border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyber-cyan transition-colors"
                  >
                    {RARITY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                    <ChevronUp className="w-3 h-3" /> 排序
                  </label>
                  <select
                    value={filter.sortBy}
                    onChange={e => setFilter({ sortBy: e.target.value as any })}
                    className="w-full bg-cyber-darker border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyber-cyan transition-colors"
                  >
                    <option value="time">⏱️ 即将结束</option>
                    <option value="bids">🔥 出价最多</option>
                    <option value="price_asc">💰 价格最低</option>
                    <option value="price_desc">💎 价格最高</option>
                  </select>
                </div>
              </div>
            </NeonCard>

            {filteredAuctions.length === 0 ? (
              <Empty
                icon={Gavel}
                title="暂无拍卖"
                description="当前没有符合条件的拍卖物品，稍后再来看看吧"
                action={
                  <NeonButton variant="cyan" onClick={() => refreshAuctions()}>
                    <RefreshCw className="w-4 h-4 mr-1.5" /> 刷新市场
                  </NeonButton>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAuctions.map(auction => (
                  <AuctionCard
                    key={auction.id}
                    auction={auction}
                    onClick={() => setSelectedAuction(auction)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'bids' && (
          <>
            {activeBids.length === 0 ? (
              <Empty
                icon={Eye}
                title="暂无参与的出价"
                description="去拍卖市场看看有什么好东西吧"
                action={
                  <NeonButton variant="cyan" onClick={() => setActiveTab('market')}>
                    浏览拍卖市场
                  </NeonButton>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeBids.map(auction => (
                  <div key={auction.id} className="relative">
                    <div className="absolute -top-2 -right-2 z-10 px-2 py-0.5 rounded-full bg-cyber-pink text-[10px] font-cyber font-bold text-white animate-pulse">
                      领先中
                    </div>
                    <AuctionCard auction={auction} onClick={() => setSelectedAuction(auction)} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'listed' && (
          <>
            {listedAuctions.length === 0 ? (
              <Empty
                icon={Package}
                title="还没有上架物品"
                description="将你的稀有部件或技能上架到黑市拍卖吧"
                action={
                  <NeonButton variant="purple" onClick={() => setShowListDialog(true)}>
                    <Plus className="w-4 h-4 mr-1.5" /> 上架物品
                  </NeonButton>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {listedAuctions.map(auction => (
                  <div key={auction.id} className="relative">
                    <div className={`absolute -top-2 -right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-cyber font-bold text-white ${auction.status === 'active' ? 'bg-cyber-cyan' : auction.status === 'ended' ? 'bg-gray-600' : 'bg-cyber-green'}`}>
                      {auction.status === 'active' ? '拍卖中' : auction.status === 'ended' ? '已结束' : auction.status === 'won' ? '已成交' : '已流拍'}
                    </div>
                    <AuctionCard auction={auction} onClick={() => setSelectedAuction(auction)} />
                    {auction.status === 'active' && auction.bids.length === 0 && (
                      <div className="mt-2">
                        <NeonButton
                          size="sm"
                          variant="red"
                          fullWidth
                          onClick={() => handleCancel(auction.id)}
                        >
                          <X className="w-4 h-4 mr-1.5" /> 取消拍卖
                        </NeonButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'won' && (
          <>
            {wonAuctions.filter(a => a.status === 'won').length === 0 ? (
              <Empty
                icon={Award}
                title="暂未赢得拍卖"
                description="参与竞拍，赢取稀有物品"
              />
            ) : (
              <div className="space-y-3">
                {wonAuctions.filter(a => a.status === 'won').map(auction => (
                  <NeonCard key={auction.id} variant="green" glow>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 border-2"
                        style={{
                          backgroundColor: `${getRarityColor(auction.itemData.rarity)}15`,
                          borderColor: `${getRarityColor(auction.itemData.rarity)}50`,
                        }}
                      >
                        {auction.itemType === 'skill' ? (
                          <SkillIcon skill={auction.itemData as Skill} size="md" />
                        ) : (
                          <span>{(auction.itemData as Part).emoji}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-5 h-5 text-cyber-green" />
                          <span className="font-cyber font-bold text-cyber-green">竞拍成功!</span>
                        </div>
                        <div className="font-cyber font-bold text-white">{auction.itemData.name}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span style={{ color: getRarityColor(auction.itemData.rarity as Rarity) }}>
                            {getRarityStars(auction.itemData.rarity as Rarity)}
                          </span>
                          <span className="text-gray-400">成交价: <span className="text-cyber-yellow font-bold">{formatNumber(auction.currentPrice)} 💰</span></span>
                        </div>
                      </div>
                      <NeonButton variant="green" size="sm" onClick={() => handleClaim(auction.id)}>
                        <Package className="w-4 h-4 mr-1.5" />
                        领取
                      </NeonButton>
                    </div>
                  </NeonCard>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'transactions' && (
          <NeonCard variant="default">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-cyber font-bold text-lg text-gray-300 flex items-center gap-2">
                <History className="w-5 h-5 text-cyber-purple" />
                资产流水记录
              </h3>
              <span className="text-xs text-gray-500">最近 {transactions.length} 条</span>
            </div>

            {transactions.length === 0 ? (
              <Empty
                title="暂无交易记录"
                description="参与拍卖后，交易记录将在此显示"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-700">
                      <th className="text-left py-3 px-3 font-cyber">时间</th>
                      <th className="text-left py-3 px-3 font-cyber">类型</th>
                      <th className="text-left py-3 px-3 font-cyber">描述</th>
                      <th className="text-right py-3 px-3 font-cyber">金额</th>
                      <th className="text-right py-3 px-3 font-cyber">余额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => {
                      const typeConfig = {
                        bid: { label: '出价', icon: Gavel, color: 'text-cyber-pink' },
                        buyout: { label: '一口价', icon: Zap, color: 'text-cyber-green' },
                        sell: { label: '出售', icon: Package, color: 'text-cyber-cyan' },
                        refund: { label: '退款', icon: ArrowLeft, color: 'text-cyber-yellow' },
                        fee: { label: '手续费', icon: AlertCircle, color: 'text-cyber-red' },
                        reward: { label: '成交收益', icon: Coins, color: 'text-cyber-green' },
                      }[tx.type] || { label: tx.type, icon: History, color: 'text-gray-400' };

                      return (
                        <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-cyber-dark/50 transition-colors">
                          <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(tx.timestamp).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${typeConfig.color} bg-current/10`}>
                              <typeConfig.icon className="w-3 h-3" />
                              {typeConfig.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-sm text-gray-300 max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td className={`py-3 px-3 text-sm text-right font-cyber font-bold ${tx.amount >= 0 ? 'text-cyber-green' : 'text-cyber-red'}`}>
                            {tx.amount >= 0 ? '+' : ''}{formatNumber(tx.amount)} 💰
                          </td>
                          <td className="py-3 px-3 text-sm text-right font-cyber text-cyber-yellow">
                            {formatNumber(tx.balanceAfter)} 💰
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </NeonCard>
        )}
      </div>

      {selectedAuction && (
        <BidDialog auction={selectedAuction} onClose={() => setSelectedAuction(null)} />
      )}

      {showListDialog && (
        <ListItemDialog onClose={() => setShowListDialog(false)} />
      )}
    </div>
  );
}
