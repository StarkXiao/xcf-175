import { create } from 'zustand';
import type {
  AuctionItem,
  BidRecord,
  TransactionRecord,
  AuctionFilter,
  Part,
  Skill,
  Rarity,
  PartQuality,
} from '@/types';
import { PART_TEMPLATES, getPartTemplate, rollPartQuality } from '@/data/parts';
import { SKILL_TEMPLATES, getSkillTemplate } from '@/data/skills';
import { generateId } from '@/utils/id';
import { randomInt, randomFloat, pickRandom, clamp } from '@/utils/random';
import { useGameStore } from '@/store/useGameStore';

const AUCTION_STORAGE_KEY = 'neon_colosseum_auction_v1';
const PLAYER_ID = 'player_self';
const PLAYER_NAME = '你';
const STORAGE_THROTTLE = 2000;

let saveTimeout: NodeJS.Timeout | null = null;

const loadAuctionFromStorage = <T,>(): T | null => {
  try {
    const json = localStorage.getItem(AUCTION_STORAGE_KEY);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Failed to load auction data:', error);
    return null;
  }
};

const saveAuctionToStorage = (data: unknown): void => {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(AUCTION_STORAGE_KEY, json);
  } catch (error) {
    console.error('Failed to save auction data:', error);
  }
};

const throttledSaveAuction = (data: unknown): void => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveAuctionToStorage(data);
  }, STORAGE_THROTTLE);
};

const FAKE_BIDDERS = [
  '黑市商人·刃',
  '地下收藏家·薇',
  '神秘买家·X',
  '机甲技师·铁',
  '暗影掮客·墨',
  '赛博赌徒·闪',
  '废墟猎人·砾',
  '数据走私者·零',
];

interface AuctionState {
  auctions: AuctionItem[];
  transactions: TransactionRecord[];
  filter: AuctionFilter;
  lastRefreshAt: number;
  isInitialized: boolean;

  initialize: () => void;
  loadSave: () => boolean;
  saveAuction: (force?: boolean) => void;

  setFilter: (filter: Partial<AuctionFilter>) => void;

  placeBid: (auctionId: string, amount: number) => { success: boolean; message: string };
  buyout: (auctionId: string) => { success: boolean; message: string };
  listItemForAuction: (itemType: 'part' | 'skill', itemId: string, startingPrice: number, durationMinutes: number) => { success: boolean; message: string };
  cancelAuction: (auctionId: string) => { success: boolean; message: string };
  claimWonItem: (auctionId: string) => { success: boolean; message: string };

  refreshAuctions: () => void;
  tickPriceFluctuation: () => void;
  processEndedAuctions: () => void;
  simulateFakeBids: () => void;

  getFilteredAuctions: () => AuctionItem[];
  getPlayerActiveBids: () => AuctionItem[];
  getPlayerWonAuctions: () => AuctionItem[];
  getPlayerListedAuctions: () => AuctionItem[];
}

const generateAuctionId = () => generateId('auction');
const generateBidId = () => generateId('bid');
const generateTransactionId = () => generateId('tx');

const RARITY_PRICE_MULTIPLIER: Record<Rarity, number> = {
  1: 1,
  2: 2.5,
  3: 6,
  4: 15,
  5: 40,
};

const createPartInstance = (templateId: string, rarity: Rarity): Part => {
  const template = getPartTemplate(templateId);
  if (!template) throw new Error(`Part template not found: ${templateId}`);
  return {
    id: generateId('part'),
    templateId: template.id,
    name: template.name,
    description: template.description,
    slot: template.slot,
    rarity: rarity as Rarity,
    stats: { ...template.stats },
    emoji: template.emoji,
    price: template.price,
    quality: rollPartQuality(Math.max(template.rarity, rarity) as Rarity) as PartQuality,
    setId: template.setId,
  };
};

const createSkillInstance = (templateId: string, rarity: Rarity): Skill => {
  const template = getSkillTemplate(templateId);
  if (!template) throw new Error(`Skill template not found: ${templateId}`);
  return {
    id: generateId('skill'),
    templateId: template.id,
    name: template.name,
    description: template.description,
    type: template.type,
    damage: template.damage,
    cooldown: template.cooldown,
    cost: template.cost,
    emoji: template.emoji,
    rarity: rarity as Rarity,
    element: template.element,
    effect: template.effect ? { ...template.effect } : undefined,
    statusEffect: template.statusEffect ? { ...template.statusEffect } : undefined,
    target: template.target,
    chance: template.chance,
    branches: template.branches ? [...template.branches] : undefined,
    passive: template.passive ? { ...template.passive } : undefined,
    comboTriggers: template.comboTriggers ? [...template.comboTriggers] : undefined,
  };
};

const rollAuctionRarity = (): Rarity => {
  const r = Math.random();
  if (r < 0.45) return 2;
  if (r < 0.75) return 3;
  if (r < 0.92) return 4;
  return 5;
};

const generateRandomAuction = (): AuctionItem => {
  const isPart = Math.random() < 0.55;
  const rarity = rollAuctionRarity();

  let itemData: Part | Skill;
  let itemType: 'part' | 'skill';

  if (isPart) {
    const availableParts = PART_TEMPLATES.filter(p => p.rarity <= rarity && p.rarity >= Math.max(1, rarity - 1));
    const template = pickRandom(availableParts.length > 0 ? availableParts : PART_TEMPLATES);
    itemData = createPartInstance(template.id, Math.max(template.rarity, rarity) as Rarity);
    itemType = 'part';
  } else {
    const availableSkills = SKILL_TEMPLATES.filter(s => s.rarity <= rarity && s.rarity >= Math.max(1, rarity - 1));
    const template = pickRandom(availableSkills.length > 0 ? availableSkills : SKILL_TEMPLATES);
    itemData = createSkillInstance(template.id, Math.max(template.rarity, rarity) as Rarity);
    itemType = 'skill';
  }

  const basePrice = ('price' in itemData && itemData.price) || 100;
  const rarityMult = RARITY_PRICE_MULTIPLIER[itemData.rarity];
  const qualityMult = 'quality' in itemData ? (1 + (itemData.quality - 1) * 0.15) : 1;
  const startingPrice = Math.floor(basePrice * rarityMult * qualityMult * randomFloat(0.8, 1.2));

  const durationMs = randomInt(5, 30) * 60 * 1000;
  const now = Date.now();

  return {
    id: generateAuctionId(),
    itemType,
    itemData,
    sellerId: 'npc_' + Math.floor(Math.random() * 1000),
    sellerName: pickRandom(FAKE_BIDDERS),
    startingPrice,
    currentPrice: startingPrice,
    minBidIncrement: Math.max(10, Math.floor(startingPrice * 0.05)),
    bids: [],
    highestBidderId: null,
    highestBidderName: null,
    createdAt: now,
    endsAt: now + durationMs,
    status: 'active',
    priceFluctuationHistory: [{ time: now, price: startingPrice }],
    isPlayer: false,
  };
};

const createInitialAuctions = (): AuctionItem[] => {
  const auctions: AuctionItem[] = [];
  const count = randomInt(8, 12);
  for (let i = 0; i < count; i++) {
    auctions.push(generateRandomAuction());
  }
  return auctions;
};

export const useAuctionStore = create<AuctionState>((set, get) => ({
  auctions: [],
  transactions: [],
  filter: {
    type: 'all',
    rarity: 0,
    sortBy: 'time',
  },
  lastRefreshAt: 0,
  isInitialized: false,

  initialize: () => {
    if (get().isInitialized) return;
    const loaded = get().loadSave();
    if (!loaded) {
      set({ auctions: createInitialAuctions(), lastRefreshAt: Date.now() });
    }
    set({ isInitialized: true });

    setInterval(() => {
      get().simulateFakeBids();
      get().tickPriceFluctuation();
      get().processEndedAuctions();
    }, 10000);

    setInterval(() => {
      get().refreshAuctions();
    }, 60000);
  },

  loadSave: () => {
    const data = loadAuctionFromStorage<{ auctions: AuctionItem[]; transactions: TransactionRecord[]; filter: AuctionFilter; lastRefreshAt: number }>();
    if (data && data.auctions) {
      set({
        auctions: data.auctions,
        transactions: data.transactions || [],
        filter: data.filter || { type: 'all', rarity: 0, sortBy: 'time' },
        lastRefreshAt: data.lastRefreshAt || Date.now(),
      });
      return true;
    }
    return false;
  },

  saveAuction: (force = false) => {
    const state = get();
    const data = {
      version: 1,
      auctions: state.auctions,
      transactions: state.transactions,
      filter: state.filter,
      lastRefreshAt: state.lastRefreshAt,
    };
    if (force) {
      saveAuctionToStorage(data);
    } else {
      throttledSaveAuction(data);
    }
  },

  setFilter: (filter) => {
    set(state => ({ filter: { ...state.filter, ...filter } }));
  },

  placeBid: (auctionId, amount) => {
    const state = get();
    const auction = state.auctions.find(a => a.id === auctionId);
    if (!auction) return { success: false, message: '拍卖不存在' };
    if (auction.status !== 'active') return { success: false, message: '拍卖已结束' };
    if (Date.now() >= auction.endsAt) return { success: false, message: '拍卖已结束' };

    const minBid = auction.currentPrice + auction.minBidIncrement;
    if (amount < minBid) return { success: false, message: `出价必须不低于 ${minBid} 💰` };
    if (auction.highestBidderId === PLAYER_ID) return { success: false, message: '你已经是最高出价者' };

    const gameStore = useGameStore.getState();
    if (gameStore.player.coins < amount) return { success: false, message: '金币不足' };

    const previousBidderId = auction.highestBidderId;

    const newBid: BidRecord = {
      id: generateBidId(),
      bidderId: PLAYER_ID,
      bidderName: PLAYER_NAME,
      amount,
      timestamp: Date.now(),
    };

    const newTx: TransactionRecord = {
      id: generateTransactionId(),
      timestamp: Date.now(),
      type: 'bid',
      amount: -amount,
      description: `竞拍「${auction.itemData.name}」出价`,
      auctionId: auction.id,
      itemName: auction.itemData.name,
      balanceAfter: gameStore.player.coins - amount,
    };

    gameStore.spendCoins(amount);

    if (previousBidderId && previousBidderId === PLAYER_ID) {
    }

    set(state => ({
      auctions: state.auctions.map(a =>
        a.id === auctionId
          ? {
              ...a,
              currentPrice: amount,
              bids: [...a.bids, newBid],
              highestBidderId: PLAYER_ID,
              highestBidderName: PLAYER_NAME,
              endsAt: auction.endsAt - Date.now() < 60000 ? Date.now() + 60000 : a.endsAt,
              priceFluctuationHistory: [...a.priceFluctuationHistory, { time: Date.now(), price: amount }],
            }
          : a
      ),
      transactions: [newTx, ...state.transactions].slice(0, 200),
    }));

    get().saveAuction();
    return { success: true, message: '出价成功！' };
  },

  buyout: (auctionId) => {
    const state = get();
    const auction = state.auctions.find(a => a.id === auctionId);
    if (!auction) return { success: false, message: '拍卖不存在' };
    if (auction.status !== 'active') return { success: false, message: '拍卖已结束' };

    const buyoutPrice = Math.floor(auction.startingPrice * 3 + auction.currentPrice * 0.5);
    const gameStore = useGameStore.getState();
    if (gameStore.player.coins < buyoutPrice) return { success: false, message: '金币不足' };

    gameStore.spendCoins(buyoutPrice);

    if (auction.itemType === 'part') {
      gameStore.addPart(auction.itemData as Part);
    } else {
      gameStore.addSkill(auction.itemData as Skill);
    }

    const newTx: TransactionRecord = {
      id: generateTransactionId(),
      timestamp: Date.now(),
      type: 'buyout',
      amount: -buyoutPrice,
      description: `一口价购买「${auction.itemData.name}」`,
      auctionId: auction.id,
      itemName: auction.itemData.name,
      balanceAfter: gameStore.player.coins,
    };

    set(state => ({
      auctions: state.auctions.map(a =>
        a.id === auctionId ? { ...a, status: 'won', highestBidderId: PLAYER_ID, highestBidderName: PLAYER_NAME, currentPrice: buyoutPrice, endsAt: Date.now() } : a
      ),
      transactions: [newTx, ...state.transactions].slice(0, 200),
    }));

    get().saveAuction();
    return { success: true, message: `成功购买「${auction.itemData.name}」！已添加到背包。` };
  },

  listItemForAuction: (itemType, itemId, startingPrice, durationMinutes) => {
    const gameStore = useGameStore.getState();
    let item: Part | Skill | undefined;

    if (itemType === 'part') {
      item = gameStore.ownedParts.find(p => p.id === itemId);
      if (!item) return { success: false, message: '部件不存在' };
    } else {
      item = gameStore.ownedSkills.find(s => s.id === itemId);
      if (!item) return { success: false, message: '技能不存在' };
    }

    const now = Date.now();
    const auction: AuctionItem = {
      id: generateAuctionId(),
      itemType,
      itemData: item,
      sellerId: PLAYER_ID,
      sellerName: PLAYER_NAME,
      startingPrice,
      currentPrice: startingPrice,
      minBidIncrement: Math.max(10, Math.floor(startingPrice * 0.05)),
      bids: [],
      highestBidderId: null,
      highestBidderName: null,
      createdAt: now,
      endsAt: now + durationMinutes * 60 * 1000,
      status: 'active',
      priceFluctuationHistory: [{ time: now, price: startingPrice }],
      isPlayer: true,
    };

    const fee = Math.floor(startingPrice * 0.05);
    if (gameStore.player.coins < fee) return { success: false, message: `上架手续费不足（${fee} 💰）` };
    gameStore.spendCoins(fee);

    if (itemType === 'part') {
      gameStore.ownedParts = gameStore.ownedParts.filter(p => p.id !== itemId);
    } else {
      gameStore.ownedSkills = gameStore.ownedSkills.filter(s => s.id !== itemId);
    }

    const newTx: TransactionRecord = {
      id: generateTransactionId(),
      timestamp: now,
      type: 'fee',
      amount: -fee,
      description: `上架「${item.name}」手续费`,
      auctionId: auction.id,
      itemName: item.name,
      balanceAfter: gameStore.player.coins,
    };

    set(state => ({
      auctions: [auction, ...state.auctions],
      transactions: [newTx, ...state.transactions].slice(0, 200),
    }));

    get().saveAuction();
    return { success: true, message: '上架成功！' };
  },

  cancelAuction: (auctionId) => {
    const state = get();
    const auction = state.auctions.find(a => a.id === auctionId);
    if (!auction) return { success: false, message: '拍卖不存在' };
    if (!auction.isPlayer) return { success: false, message: '只能取消自己的拍卖' };
    if (auction.bids.length > 0) return { success: false, message: '已有出价，无法取消' };
    if (auction.status !== 'active') return { success: false, message: '拍卖已结束' };

    const gameStore = useGameStore.getState();
    if (auction.itemType === 'part') {
      gameStore.addPart(auction.itemData as Part);
    } else {
      gameStore.addSkill(auction.itemData as Skill);
    }

    set(state => ({
      auctions: state.auctions.filter(a => a.id !== auctionId),
    }));

    get().saveAuction();
    return { success: true, message: '已取消拍卖，物品已退回' };
  },

  claimWonItem: (auctionId) => {
    const state = get();
    const auction = state.auctions.find(a => a.id === auctionId);
    if (!auction) return { success: false, message: '拍卖不存在' };
    if (auction.status !== 'won') return { success: false, message: '拍卖未结束' };
    if (auction.highestBidderId !== PLAYER_ID) return { success: false, message: '你不是赢家' };

    const gameStore = useGameStore.getState();
    if (auction.itemType === 'part') {
      gameStore.addPart(auction.itemData as Part);
    } else {
      gameStore.addSkill(auction.itemData as Skill);
    }

    set(state => ({
      auctions: state.auctions.map(a =>
        a.id === auctionId ? { ...a, status: 'ended' as const } : a
      ),
    }));

    get().saveAuction();
    return { success: true, message: `「${auction.itemData.name}」已添加到背包！` };
  },

  refreshAuctions: () => {
    const state = get();
    const now = Date.now();
    const activeAuctions = state.auctions.filter(a => a.status === 'active' && a.endsAt > now);
    const endedAuctions = state.auctions.filter(a => a.status !== 'active' || a.endsAt <= now);

    const newAuctions: AuctionItem[] = [];
    const targetCount = randomInt(8, 14);
    const needCount = Math.max(0, targetCount - activeAuctions.length);

    for (let i = 0; i < needCount; i++) {
      newAuctions.push(generateRandomAuction());
    }

    const keptEnded = endedAuctions
      .filter(a => now - a.endsAt < 30 * 60 * 1000 || (a.highestBidderId === PLAYER_ID && a.status === 'won'))
      .slice(0, 20);

    set({
      auctions: [...activeAuctions, ...newAuctions, ...keptEnded],
      lastRefreshAt: now,
    });

    get().saveAuction();
  },

  tickPriceFluctuation: () => {
    const state = get();
    const now = Date.now();

    set(state => ({
      auctions: state.auctions.map(a => {
        if (a.status !== 'active' || a.bids.length === 0) return a;

        const progress = (now - a.createdAt) / (a.endsAt - a.createdAt);
        const hotness = Math.min(1, a.bids.length / 5);
        const fluctuationChance = 0.3 + progress * 0.4 + hotness * 0.3;

        if (Math.random() > fluctuationChance) return a;

        const fluct = randomFloat(-0.02, 0.08);
        const newPrice = Math.max(a.startingPrice, Math.floor(a.currentPrice * (1 + fluct)));
        const newIncrement = Math.max(10, Math.floor(newPrice * 0.05));

        return {
          ...a,
          currentPrice: newPrice,
          minBidIncrement: newIncrement,
          priceFluctuationHistory: [...a.priceFluctuationHistory.slice(-20), { time: now, price: newPrice }],
        };
      }),
    }));
  },

  processEndedAuctions: () => {
    const state = get();
    const now = Date.now();
    const gameStore = useGameStore.getState();
    const newTransactions: TransactionRecord[] = [];

    const updated = state.auctions.map(a => {
      if (a.status !== 'active' || a.endsAt > now) return a;

      if (a.isPlayer && a.highestBidderId) {
        const revenue = Math.floor(a.currentPrice * 0.95);
        gameStore.addCoins(revenue);
        newTransactions.push({
          id: generateTransactionId(),
          timestamp: now,
          type: 'reward',
          amount: revenue,
          description: `「${a.itemData.name}」拍卖成交（扣除5%手续费）`,
          auctionId: a.id,
          itemName: a.itemData.name,
          balanceAfter: gameStore.player.coins,
        });
        return { ...a, status: 'ended' as const };
      }

      if (a.isPlayer && !a.highestBidderId) {
        if (a.itemType === 'part') {
          gameStore.addPart(a.itemData as Part);
        } else {
          gameStore.addSkill(a.itemData as Skill);
        }
        return { ...a, status: 'ended' as const };
      }

      if (a.highestBidderId === PLAYER_ID) {
        return { ...a, status: 'won' as const };
      }

      return { ...a, status: 'ended' as const };
    });

    if (newTransactions.length > 0) {
      set(state => ({
        auctions: updated,
        transactions: [...newTransactions, ...state.transactions].slice(0, 200),
      }));
    } else {
      set({ auctions: updated });
    }

    if (newTransactions.length > 0) {
      get().saveAuction(true);
    }
  },

  simulateFakeBids: () => {
    const state = get();
    const now = Date.now();

    set(state => ({
      auctions: state.auctions.map(a => {
        if (a.status !== 'active' || a.endsAt <= now) return a;
        if (a.isPlayer && a.highestBidderId === PLAYER_ID) return a;

        const progress = clamp((now - a.createdAt) / (a.endsAt - a.createdAt), 0, 1);
        let bidChance = 0.05 + progress * 0.25;
        if (a.bids.length === 0 && progress > 0.3) bidChance += 0.15;
        if (a.itemData.rarity >= 4) bidChance += 0.1;

        if (Math.random() > bidChance) return a;

        const bidderName = pickRandom(FAKE_BIDDERS);
        const bidderId = 'bidder_' + bidderName;
        if (bidderId === a.highestBidderId) return a;

        const incrementMult = 1 + randomFloat(0.5, 2 + progress * 2);
        const newAmount = a.currentPrice + Math.floor(a.minBidIncrement * incrementMult);

        const newBid: BidRecord = {
          id: generateBidId(),
          bidderId,
          bidderName,
          amount: newAmount,
          timestamp: now,
        };

        return {
          ...a,
          currentPrice: newAmount,
          bids: [...a.bids, newBid],
          highestBidderId: bidderId,
          highestBidderName: bidderName,
          endsAt: a.endsAt - now < 60000 && progress > 0.9 ? now + randomInt(15, 45) * 1000 : a.endsAt,
          priceFluctuationHistory: [...a.priceFluctuationHistory.slice(-20), { time: now, price: newAmount }],
        };
      }),
    }));
  },

  getFilteredAuctions: () => {
    const state = get();
    let result = state.auctions.filter(a => a.status === 'active' && a.endsAt > Date.now());

    if (state.filter.type !== 'all') {
      result = result.filter(a => a.itemType === state.filter.type);
    }
    if (state.filter.rarity !== 0) {
      result = result.filter(a => a.itemData.rarity === state.filter.rarity);
    }
    if (state.filter.search) {
      const q = state.filter.search.toLowerCase();
      result = result.filter(a =>
        a.itemData.name.toLowerCase().includes(q) ||
        (a.itemData.description && a.itemData.description.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      switch (state.filter.sortBy) {
        case 'time':
          return a.endsAt - b.endsAt;
        case 'price_asc':
          return a.currentPrice - b.currentPrice;
        case 'price_desc':
          return b.currentPrice - a.currentPrice;
        case 'bids':
          return b.bids.length - a.bids.length;
        default:
          return 0;
      }
    });

    return result;
  },

  getPlayerActiveBids: () => {
    return get().auctions.filter(
      a => a.status === 'active' && a.highestBidderId === PLAYER_ID
    );
  },

  getPlayerWonAuctions: () => {
    return get().auctions.filter(
      a => (a.status === 'won' || (a.status === 'active' && a.endsAt <= Date.now())) && a.highestBidderId === PLAYER_ID
    );
  },

  getPlayerListedAuctions: () => {
    return get().auctions.filter(a => a.isPlayer);
  },
}));
