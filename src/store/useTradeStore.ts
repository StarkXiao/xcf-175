import { create } from 'zustand';
import type {
  Part,
  Skill,
  Material,
  Rarity,
  TradeRecord,
  TradeSaveData,
  ExchangeItem,
  InventoryItem,
} from '@/types';
import { useGameStore } from './useGameStore';
import { loadFromLocalStorage, throttledSave } from '@/utils/save';
import { generateId } from '@/utils/id';
import { generateId as genInventoryId } from '@/utils/id';
import { getMaterialTemplate } from '@/data/materials';
import { getPartTemplate } from '@/data/parts';
import { getSkillTemplate } from '@/data/skills';

const RECYCLE_COIN_REWARDS: Record<Rarity, number> = {
  1: 10,
  2: 30,
  3: 80,
  4: 200,
  5: 500,
};

const RECYCLE_MATERIAL_REWARDS: Record<Rarity, { templateId: string; count: number } | undefined> = {
  1: undefined,
  2: { templateId: 'lab_synthesis_dust', count: 1 },
  3: { templateId: 'lab_synthesis_crystal', count: 1 },
  4: { templateId: 'lab_synthesis_core', count: 1 },
  5: { templateId: 'lab_synthesis_core', count: 3 },
};

export const EXCHANGE_ITEMS: ExchangeItem[] = [
  {
    id: 'exchange_part_r3',
    name: '稀有部件礼包',
    emoji: '🎁',
    rarity: 3,
    itemType: 'part',
    cost: { type: 'coins', amount: 500 },
    description: '随机获得一件3星部件',
    dailyLimit: 5,
  },
  {
    id: 'exchange_skill_r3',
    name: '稀有技能礼包',
    emoji: '📘',
    rarity: 3,
    itemType: 'skill',
    cost: { type: 'coins', amount: 500 },
    description: '随机获得一个3星技能',
    dailyLimit: 5,
  },
  {
    id: 'exchange_gems_1',
    name: '宝石 x10',
    emoji: '💎',
    rarity: 4,
    itemType: 'gems',
    cost: { type: 'coins', amount: 1000 },
    description: '兑换10颗宝石',
    dailyLimit: 3,
  },
  {
    id: 'exchange_material_dust',
    name: '合成粉尘 x10',
    emoji: '✨',
    rarity: 2,
    itemType: 'material',
    templateId: 'lab_synthesis_dust',
    amount: 10,
    cost: { type: 'coins', amount: 200 },
    description: '获得10个合成粉尘材料',
    dailyLimit: 10,
  },
  {
    id: 'exchange_material_crystal',
    name: '合成水晶 x5',
    emoji: '💠',
    rarity: 3,
    itemType: 'material',
    templateId: 'lab_synthesis_crystal',
    amount: 5,
    cost: { type: 'coins', amount: 500 },
    description: '获得5个合成水晶材料',
    dailyLimit: 5,
  },
  {
    id: 'exchange_gacha_10',
    name: '十连召唤券',
    emoji: '🎟️',
    rarity: 4,
    itemType: 'part',
    cost: { type: 'gems', amount: 20 },
    description: '可用于一次十连召唤',
    dailyLimit: 1,
  },
];

interface TradeState {
  isInitialized: boolean;
  activeTab: 'recycle' | 'exchange';
  recycleHistory: TradeRecord[];
  exchangeHistory: TradeRecord[];
  dailyExchanges: Record<string, number>;
  lastDailyReset: number;
  recycleSelectedIds: string[];
  showRecycleConfirm: boolean;
  showExchangeConfirm: boolean;
  selectedExchangeItem: ExchangeItem | null;

  initialize: () => void;
  setActiveTab: (tab: 'recycle' | 'exchange') => void;
  toggleRecycleSelect: (id: string) => void;
  clearRecycleSelection: () => void;
  setShowRecycleConfirm: (show: boolean) => void;
  setShowExchangeConfirm: (show: boolean) => void;
  setSelectedExchangeItem: (item: ExchangeItem | null) => void;

  recycleItems: (inventoryItemIds: string[]) => {
    success: boolean;
    totalCoins: number;
    materialsGained: { templateId: string; count: number }[];
    itemsRecycled: number;
  };

  exchangeItem: (exchangeId: string, count?: number) => {
    success: boolean;
    message: string;
    items?: (Part | Skill | Material)[];
  };

  canExchange: (exchangeId: string, count?: number) => boolean;

  checkAndResetDaily: () => void;

  saveTrade: () => void;
}

const isToday = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

export const useTradeStore = create<TradeState>((set, get) => ({
  isInitialized: false,
  activeTab: 'recycle',
  recycleHistory: [],
  exchangeHistory: [],
  dailyExchanges: {},
  lastDailyReset: Date.now(),
  recycleSelectedIds: [],
  showRecycleConfirm: false,
  showExchangeConfirm: false,
  selectedExchangeItem: null,

  initialize: () => {
    if (get().isInitialized) return;

    const data = loadFromLocalStorage();
    const tradeData = data?.tradeData;

    if (tradeData) {
      set({
        recycleHistory: tradeData.recycleHistory || [],
        exchangeHistory: tradeData.exchangeHistory || [],
        dailyExchanges: tradeData.dailyExchanges || {},
        lastDailyReset: tradeData.lastDailyReset || Date.now(),
      });
    }

    get().checkAndResetDaily();
    set({ isInitialized: true });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  toggleRecycleSelect: (id) => {
    set(state => {
      const selected = state.recycleSelectedIds.includes(id)
        ? state.recycleSelectedIds.filter(i => i !== id)
        : [...state.recycleSelectedIds, id];
      return { recycleSelectedIds: selected };
    });
  },

  clearRecycleSelection: () => {
    set({ recycleSelectedIds: [] });
  },

  setShowRecycleConfirm: (show) => {
    set({ showRecycleConfirm: show });
  },

  setShowExchangeConfirm: (show) => {
    set({ showExchangeConfirm: show });
  },

  setSelectedExchangeItem: (item) => {
    set({ selectedExchangeItem: item });
  },

  checkAndResetDaily: () => {
    const state = get();
    if (!isToday(state.lastDailyReset)) {
      set({
        dailyExchanges: {},
        lastDailyReset: Date.now(),
      });
      get().saveTrade();
    }
  },

  canExchange: (exchangeId, count = 1) => {
    const item = EXCHANGE_ITEMS.find(i => i.id === exchangeId);
    if (!item) return false;

    const state = get();
    state.checkAndResetDaily();

    if (item.dailyLimit) {
      const purchased = state.dailyExchanges[exchangeId] || 0;
      if (purchased + count > item.dailyLimit) {
        return false;
      }
    }

    const gameState = useGameStore.getState();

    if (item.cost.type === 'coins') {
      return gameState.player.coins >= item.cost.amount * count;
    } else if (item.cost.type === 'gems') {
      return gameState.player.gems >= item.cost.amount * count;
    }

    return false;
  },

  recycleItems: (inventoryItemIds) => {
    const gameState = useGameStore.getState();
    const data = loadFromLocalStorage();
    if (!data?.inventoryData) {
      return { success: false, totalCoins: 0, materialsGained: [], itemsRecycled: 0 };
    }

    const inventoryItems = data.inventoryData.items;
    const selectedInventoryItems = inventoryItems.filter(i => inventoryItemIds.includes(i.id) && !i.isLocked);

    if (selectedInventoryItems.length === 0) {
      return { success: false, totalCoins: 0, materialsGained: [], itemsRecycled: 0 };
    }

    let totalCoins = 0;
    const materialRewards: Record<string, number> = {};
    const newHistory: TradeRecord[] = [...get().recycleHistory];
    const partsToRemove: string[] = [];
    const skillsToRemove: string[] = [];
    const materialsToRemove: string[] = [];

    selectedInventoryItems.forEach(invItem => {
      let itemData: Part | Skill | Material | undefined;
      let itemType: 'part' | 'skill' | 'material' = invItem.itemType;

      if (invItem.itemType === 'part') {
        itemData = gameState.ownedParts.find(p => p.id === invItem.itemId);
        if (itemData) partsToRemove.push(itemData.id);
      } else if (invItem.itemType === 'skill') {
        itemData = gameState.ownedSkills.find(s => s.id === invItem.itemId);
        if (itemData) skillsToRemove.push(itemData.id);
      } else {
        itemData = gameState.ownedMaterials.find(m => m.id === invItem.itemId);
        if (itemData) materialsToRemove.push(itemData.id);
      }

      if (!itemData) return;

      const coinReward = RECYCLE_COIN_REWARDS[itemData.rarity] || 0;
      totalCoins += coinReward;

      const matReward = RECYCLE_MATERIAL_REWARDS[itemData.rarity];
      if (matReward) {
        materialRewards[matReward.templateId] = (materialRewards[matReward.templateId] || 0) + matReward.count;
      }

      newHistory.push({
        id: generateId('trade'),
        type: 'recycle',
        itemName: itemData.name,
        itemEmoji: itemData.emoji,
        rarity: itemData.rarity,
        cost: coinReward,
        reward: `${coinReward} 金币${matReward ? ` + ${matReward.count} 材料` : ''}`,
        timestamp: Date.now(),
      });
    });

    if (partsToRemove.length > 0) {
      useGameStore.setState(state => ({
        ownedParts: state.ownedParts.filter(p => !partsToRemove.includes(p.id)),
      }));
    }

    if (skillsToRemove.length > 0) {
      useGameStore.setState(state => ({
        ownedSkills: state.ownedSkills.filter(s => !skillsToRemove.includes(s.id)),
      }));
    }

    if (materialsToRemove.length > 0) {
      useGameStore.setState(state => ({
        ownedMaterials: state.ownedMaterials.filter(m => !materialsToRemove.includes(m.id)),
      }));
    }

    if (totalCoins > 0) {
      useGameStore.getState().addCoins(totalCoins);
    }

    const materialsGained = Object.entries(materialRewards).map(([templateId, count]) => ({
      templateId,
      count,
    }));

    if (materialsGained.length > 0) {
      useGameStore.getState().addMaterials(materialsGained);
    }

    const newInventoryItems = inventoryItems.filter(i => !inventoryItemIds.includes(i.id) || i.isLocked);
    const newData = {
      ...data,
      inventoryData: { ...data.inventoryData, items: newInventoryItems },
    };
    throttledSave(newData);

    set({
      recycleHistory: newHistory.slice(-50),
      recycleSelectedIds: [],
      showRecycleConfirm: false,
    });

    gameState.saveGame();
    get().saveTrade();

    return {
      success: true,
      totalCoins,
      materialsGained,
      itemsRecycled: selectedInventoryItems.length,
    };
  },

  exchangeItem: (exchangeId, count = 1) => {
    if (!get().canExchange(exchangeId, count)) {
      return { success: false, message: '无法兑换：条件不满足' };
    }

    const item = EXCHANGE_ITEMS.find(i => i.id === exchangeId);
    if (!item) return { success: false, message: '兑换物品不存在' };

    const gameState = useGameStore.getState();
    const totalCost = item.cost.amount * count;

    if (item.cost.type === 'coins') {
      if (!gameState.spendCoins(totalCost)) {
        return { success: false, message: '金币不足' };
      }
    } else if (item.cost.type === 'gems') {
      if (!gameState.spendGems(totalCost)) {
        return { success: false, message: '宝石不足' };
      }
    }

    const items: (Part | Skill | Material)[] = [];

    for (let i = 0; i < count; i++) {
      if (item.itemType === 'part') {
        const templates = require('@/data/parts').PART_TEMPLATES.filter(
          (p: any) => p.rarity === item.rarity
        );
        if (templates.length > 0) {
          const template = templates[Math.floor(Math.random() * templates.length)];
          const quality = item.rarity >= 3 ? 2 : 1;
          const newPart: Part = {
            ...template,
            id: generateId('part'),
            templateId: template.id,
            quality: quality as any,
            setId: template.setId,
          };
          items.push(newPart);
          gameState.addPart(newPart);
        }
      } else if (item.itemType === 'skill') {
        const templates = require('@/data/skills').SKILL_TEMPLATES.filter(
          (s: any) => s.rarity === item.rarity
        );
        if (templates.length > 0) {
          const template = templates[Math.floor(Math.random() * templates.length)];
          const newSkill: Skill = {
            ...template,
            id: generateId('skill'),
            templateId: template.id,
          };
          items.push(newSkill);
          gameState.addSkill(newSkill);
        }
      } else if (item.itemType === 'material') {
        const templateId = item.templateId;
        const amount = item.amount || 1;
        if (templateId) {
          gameState.addMaterials([{ templateId, count: amount }]);
        }
      } else if (item.itemType === 'gems') {
        gameState.addGems(10);
      }
    }

    set(state => {
      const newRecord: TradeRecord = {
        id: generateId('trade'),
        type: 'exchange',
        itemName: item.name,
        itemEmoji: item.emoji,
        rarity: item.rarity,
        cost: totalCost,
        reward: `${item.name} x${count}`,
        timestamp: Date.now(),
      };

      return {
        dailyExchanges: {
          ...state.dailyExchanges,
          [exchangeId]: (state.dailyExchanges[exchangeId] || 0) + count,
        },
        exchangeHistory: [
          ...state.exchangeHistory,
          newRecord,
        ].slice(-50),
        showExchangeConfirm: false,
        selectedExchangeItem: null,
      };
    });

    get().saveTrade();
    gameState.saveGame();

    return {
      success: true,
      message: `成功兑换 ${item.name} x${count}`,
      items: items.length > 0 ? items : undefined,
    };
  },

  saveTrade: () => {
    const state = get();
    const data = loadFromLocalStorage();
    if (!data) return;

    const tradeData: TradeSaveData = {
      recycleHistory: state.recycleHistory,
      exchangeHistory: state.exchangeHistory,
      dailyExchanges: state.dailyExchanges,
      lastDailyReset: state.lastDailyReset,
    };

    const newData = { ...data, tradeData };
    throttledSave(newData);
  },
}));
