import { create } from 'zustand';
import type {
  WorldEventInstance,
  WorldEventAnnouncement,
  WorldEventSaveData,
  WorldEventTemplate,
  WorldEventBattleRuleConfig,
  WorldEventShopItem,
  WorldEventSpecialEnemy,
} from '@/types';
import {
  WORLD_EVENT_TEMPLATES,
  CYCLE_DURATION_HOURS,
  pickRandomEvent,
  getWorldEventTemplate,
  getBattleRuleConfig,
  WORLD_EVENT_RARITY_CONFIG,
} from '@/data/worldEvent';
import { generateId } from '@/utils/id';
import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from '@/utils/save';
import { useGameStore } from '@/store/useGameStore';
import { getAnimalTemplate } from '@/data/animals';
import { getPartTemplate, rollPartQuality } from '@/data/parts';
import { getSkillTemplate } from '@/data/skills';
import { getMaterialTemplate } from '@/data/materials';

const SAVE_KEY = 'neon_colosseum_world_event_v1';

const createDefaultSaveData = (): WorldEventSaveData => ({
  activeEvents: [],
  pastEvents: [],
  announcements: [],
  eventTokens: 0,
  totalEventsParticipated: 0,
  lastCycleCheck: Date.now(),
  nextCycleTime: Date.now() + CYCLE_DURATION_HOURS * 3600000,
});

interface WorldEventState {
  isInitialized: boolean;
  activeEvents: WorldEventInstance[];
  pastEvents: WorldEventInstance[];
  announcements: WorldEventAnnouncement[];
  eventTokens: number;
  totalEventsParticipated: number;
  lastCycleCheck: number;
  nextCycleTime: number;

  initWorldEvent: () => void;
  checkCycleRefresh: () => void;
  refreshCycle: () => void;
  getActiveEventTemplates: () => { instance: WorldEventInstance; template: WorldEventTemplate }[];
  getActiveBattleRules: () => WorldEventBattleRuleConfig[];
  getActiveBonusMultiplier: () => number;
  getEventShopItems: () => { item: WorldEventShopItem; purchased: number; instance: WorldEventInstance; template: WorldEventTemplate }[];
  purchaseEventShopItem: (itemId: string) => { success: boolean; message: string };
  recordBattleResult: (isWin: boolean, enemyId?: string) => { tokensEarned: number; bonusMultiplier: number };
  markAnnouncementRead: (announcementId: string) => void;
  getUnreadAnnouncements: () => WorldEventAnnouncement[];
  dismissAnnouncement: (id: string) => void;
  addEventTokens: (amount: number) => void;
  getTimeToNextCycle: () => number;
  getEventTimeRemaining: (instance: WorldEventInstance) => number;
  resetWorldEvent: () => void;
  saveWorldEventData: () => void;
}

export const useWorldEventStore = create<WorldEventState>((set, get) => ({
  isInitialized: false,
  activeEvents: [],
  pastEvents: [],
  announcements: [],
  eventTokens: 0,
  totalEventsParticipated: 0,
  lastCycleCheck: Date.now(),
  nextCycleTime: Date.now() + CYCLE_DURATION_HOURS * 3600000,

  initWorldEvent: () => {
    const raw = loadFromLocalStorage();
    if (raw && (raw as any).worldEventData) {
      const data = (raw as any).worldEventData as WorldEventSaveData;
      set({
        activeEvents: data.activeEvents || [],
        pastEvents: data.pastEvents || [],
        announcements: data.announcements || [],
        eventTokens: data.eventTokens || 0,
        totalEventsParticipated: data.totalEventsParticipated || 0,
        lastCycleCheck: data.lastCycleCheck || Date.now(),
        nextCycleTime: data.nextCycleTime || Date.now() + CYCLE_DURATION_HOURS * 3600000,
        isInitialized: true,
      });
      get().checkCycleRefresh();
      return;
    }
    get().refreshCycle();
    set({ isInitialized: true });
  },

  checkCycleRefresh: () => {
    const now = Date.now();
    const state = get();
    if (now >= state.nextCycleTime) {
      get().refreshCycle();
    }
    const updatedActive = get().activeEvents.filter(e => e.endTime > now).map(e => {
      if (e.status !== 'active') return { ...e, status: 'active' as const };
      return e;
    });
    const endedEvents = get().activeEvents.filter(e => e.endTime <= now);
    if (endedEvents.length > 0) {
      const newAnnouncements: WorldEventAnnouncement[] = endedEvents.map(e => {
        const template = getWorldEventTemplate(e.templateId);
        return {
          id: generateId('ann'),
          eventId: e.templateId,
          eventName: template?.name || '未知事件',
          eventEmoji: template?.emoji || '📅',
          eventColor: template?.color || '#ffffff',
          message: `${template?.emoji || '📅'} ${template?.name || '未知事件'}已结束！感谢参与！`,
          timestamp: Date.now(),
          isRead: false,
          type: 'eventEnd' as const,
        };
      });
      set(state => ({
        activeEvents: updatedActive,
        pastEvents: [...state.pastEvents, ...endedEvents.map(e => ({ ...e, status: 'ended' as const }))],
        announcements: [...newAnnouncements, ...state.announcements].slice(0, 50),
      }));
    }
  },

  refreshCycle: () => {
    const now = Date.now();
    const state = get();
    const endedEvents = state.activeEvents.filter(e => e.endTime <= now);
    const eventTemplate = pickRandomEvent();
    const newInstance: WorldEventInstance = {
      templateId: eventTemplate.id,
      startTime: now,
      endTime: now + eventTemplate.durationHours * 3600000,
      status: 'active',
      enemiesDefeated: {},
      shopPurchased: {},
      totalEventTokensEarned: 0,
      battlesFought: 0,
      battlesWon: 0,
      claimedRewards: [],
    };
    const startAnnouncement: WorldEventAnnouncement = {
      id: generateId('ann'),
      eventId: eventTemplate.id,
      eventName: eventTemplate.name,
      eventEmoji: eventTemplate.emoji,
      eventColor: eventTemplate.color,
      message: eventTemplate.announcement,
      timestamp: Date.now(),
      isRead: false,
      type: 'eventStart',
    };
    const enemyAnnouncements: WorldEventAnnouncement[] = eventTemplate.specialEnemies.map(enemy => ({
      id: generateId('ann'),
      eventId: eventTemplate.id,
      eventName: eventTemplate.name,
      eventEmoji: eventTemplate.emoji,
      eventColor: eventTemplate.color,
      message: `${enemy.emoji} 特殊敌人「${enemy.name}」已出现！${enemy.description}`,
      timestamp: Date.now(),
      isRead: false,
      type: 'specialEnemy' as const,
    }));
    const shopAnnouncements: WorldEventAnnouncement[] = eventTemplate.shopItems.map(item => ({
      id: generateId('ann'),
      eventId: eventTemplate.id,
      eventName: eventTemplate.name,
      eventEmoji: eventTemplate.emoji,
      eventColor: eventTemplate.color,
      message: `${item.emoji} 限时商品「${item.name}」上架！库存${item.stock}件`,
      timestamp: Date.now(),
      isRead: false,
      type: 'newShopItem' as const,
    }));
    set(state => ({
      activeEvents: [
        ...state.activeEvents.filter(e => e.endTime > now),
        newInstance,
      ],
      pastEvents: [...state.pastEvents, ...endedEvents.map(e => ({ ...e, status: 'ended' as const }))],
      announcements: [
        ...shopAnnouncements,
        ...enemyAnnouncements,
        startAnnouncement,
        ...state.announcements,
      ].slice(0, 50),
      totalEventsParticipated: state.totalEventsParticipated + 1,
      lastCycleCheck: now,
      nextCycleTime: now + CYCLE_DURATION_HOURS * 3600000,
    }));
    get().saveWorldEventData();
  },

  getActiveEventTemplates: () => {
    const state = get();
    return state.activeEvents
      .filter(e => e.status === 'active' && e.endTime > Date.now())
      .map(instance => {
        const template = getWorldEventTemplate(instance.templateId);
        return template ? { instance, template } : null;
      })
      .filter(Boolean) as { instance: WorldEventInstance; template: WorldEventTemplate }[];
  },

  getActiveBattleRules: () => {
    const events = get().getActiveEventTemplates();
    const rules: WorldEventBattleRuleConfig[] = [];
    events.forEach(({ template }) => {
      template.battleRules.forEach(ruleId => {
        const config = getBattleRuleConfig(ruleId);
        if (config && !rules.some(r => r.rule === config.rule)) {
          rules.push(config);
        }
      });
    });
    return rules;
  },

  getActiveBonusMultiplier: () => {
    const events = get().getActiveEventTemplates();
    if (events.length === 0) return 1.0;
    return Math.max(...events.map(({ template }) => template.bonusRewardMultiplier));
  },

  getEventShopItems: () => {
    const events = get().getActiveEventTemplates();
    const items: { item: WorldEventShopItem; purchased: number; instance: WorldEventInstance; template: WorldEventTemplate }[] = [];
    events.forEach(({ instance, template }) => {
      template.shopItems.forEach(item => {
        const purchased = instance.shopPurchased[item.id] || 0;
        items.push({ item, purchased, instance, template });
      });
    });
    return items;
  },

  purchaseEventShopItem: (itemId: string) => {
    const shopItems = get().getEventShopItems();
    const entry = shopItems.find(si => si.item.id === itemId);
    if (!entry) return { success: false, message: '商品不存在' };
    const { item, purchased, instance } = entry;
    if (purchased >= item.stock) return { success: false, message: '库存不足' };
    const gameStore = useGameStore.getState();
    if (item.currency === 'eventTokens') {
      if (get().eventTokens < item.cost) return { success: false, message: '事件代币不足' };
      set(state => ({
        eventTokens: state.eventTokens - item.cost,
        activeEvents: state.activeEvents.map(e =>
          e === instance
            ? { ...e, shopPurchased: { ...e.shopPurchased, [itemId]: (e.shopPurchased[itemId] || 0) + 1 } }
            : e
        ),
      }));
    } else if (item.currency === 'coins') {
      if (!gameStore.spendCoins(item.cost)) return { success: false, message: '金币不足' };
      set(state => ({
        activeEvents: state.activeEvents.map(e =>
          e === instance
            ? { ...e, shopPurchased: { ...e.shopPurchased, [itemId]: (e.shopPurchased[itemId] || 0) + 1 } }
            : e
        ),
      }));
    } else if (item.currency === 'gems') {
      if (!gameStore.spendGems(item.cost)) return { success: false, message: '宝石不足' };
      set(state => ({
        activeEvents: state.activeEvents.map(e =>
          e === instance
            ? { ...e, shopPurchased: { ...e.shopPurchased, [itemId]: (e.shopPurchased[itemId] || 0) + 1 } }
            : e
        ),
      }));
    }

    if (item.itemType === 'animal') {
      const template = getAnimalTemplate(item.templateId);
      if (template) {
        const animal = {
          id: generateId('animal'),
          templateId: template.id,
          name: template.name,
          rarity: item.rarity as 1 | 2 | 3 | 4 | 5,
          level: 1,
          starLevel: 1 as any,
          breakthroughTier: 0 as any,
          parts: [],
          skills: [],
          exp: 0,
          expToNext: 100,
        };
        gameStore.addAnimal(animal);
      }
    } else if (item.itemType === 'part') {
      const template = getPartTemplate(item.templateId);
      if (template) {
        const part = {
          ...template,
          id: generateId('part'),
          templateId: template.id,
          quality: rollPartQuality(item.rarity),
          setId: template.setId,
        };
        gameStore.addPart(part);
      }
    } else if (item.itemType === 'skill') {
      const template = getSkillTemplate(item.templateId);
      if (template) {
        const skill = {
          ...template,
          id: generateId('skill'),
          templateId: template.id,
        };
        gameStore.addSkill(skill);
      }
    } else if (item.itemType === 'material') {
      const template = getMaterialTemplate(item.templateId);
      if (template) {
        gameStore.addMaterials([{ templateId: template.id, count: 1 }]);
      }
    }

    get().saveWorldEventData();
    return { success: true, message: `成功购买 ${item.name}` };
  },

  recordBattleResult: (isWin: boolean, enemyId?: string) => {
    const events = get().getActiveEventTemplates();
    if (events.length === 0) return { tokensEarned: 0, bonusMultiplier: 1.0 };
    const { instance, template } = events[0];
    let tokensEarned = isWin ? 20 : 5;
    const bonusMultiplier = template.bonusRewardMultiplier;
    tokensEarned = Math.floor(tokensEarned * bonusMultiplier);
    if (enemyId && isWin) {
      const enemy = template.specialEnemies.find(e => e.id === enemyId);
      if (enemy) {
        tokensEarned += Math.floor(enemy.rewardCoins / 10);
      }
    }
    set(state => ({
      eventTokens: state.eventTokens + tokensEarned,
      activeEvents: state.activeEvents.map(e => {
        if (e !== instance) return e;
        const newEnemiesDefeated = { ...e.enemiesDefeated };
        if (enemyId && isWin) {
          newEnemiesDefeated[enemyId] = (newEnemiesDefeated[enemyId] || 0) + 1;
        }
        return {
          ...e,
          battlesFought: e.battlesFought + 1,
          battlesWon: e.battlesWon + (isWin ? 1 : 0),
          totalEventTokensEarned: e.totalEventTokensEarned + tokensEarned,
          enemiesDefeated: newEnemiesDefeated,
        };
      }),
    }));
    get().saveWorldEventData();
    return { tokensEarned, bonusMultiplier };
  },

  markAnnouncementRead: (announcementId: string) => {
    set(state => ({
      announcements: state.announcements.map(a =>
        a.id === announcementId ? { ...a, isRead: true } : a
      ),
    }));
    get().saveWorldEventData();
  },

  getUnreadAnnouncements: () => {
    return get().announcements.filter(a => !a.isRead);
  },

  dismissAnnouncement: (id: string) => {
    set(state => ({
      announcements: state.announcements.map(a =>
        a.id === id ? { ...a, isRead: true } : a
      ),
    }));
    get().saveWorldEventData();
  },

  addEventTokens: (amount: number) => {
    set(state => ({ eventTokens: state.eventTokens + amount }));
    get().saveWorldEventData();
  },

  getTimeToNextCycle: () => {
    const remaining = get().nextCycleTime - Date.now();
    return Math.max(0, remaining);
  },

  getEventTimeRemaining: (instance: WorldEventInstance) => {
    const remaining = instance.endTime - Date.now();
    return Math.max(0, remaining);
  },

  resetWorldEvent: () => {
    const defaultData = createDefaultSaveData();
    set({
      ...defaultData,
      isInitialized: false,
    });
    get().refreshCycle();
    set({ isInitialized: true });
  },

  saveWorldEventData: () => {
    const state = get();
    const data: WorldEventSaveData = {
      activeEvents: state.activeEvents,
      pastEvents: state.pastEvents.slice(-20),
      announcements: state.announcements,
      eventTokens: state.eventTokens,
      totalEventsParticipated: state.totalEventsParticipated,
      lastCycleCheck: state.lastCycleCheck,
      nextCycleTime: state.nextCycleTime,
    };
    try {
      const existingRaw = loadFromLocalStorage();
      const existing = existingRaw || {};
      saveToLocalStorage({ ...existing, worldEventData: data } as any);
    } catch {
      saveToLocalStorage({ worldEventData: data } as any);
    }
  },
}));
