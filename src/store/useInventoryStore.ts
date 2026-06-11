import { create } from 'zustand';
import type {
  Part,
  Skill,
  Material,
  Rarity,
  PartSlot,
  PartQuality,
  InventoryItem,
  InventoryFilter,
  InventorySortBy,
  InventorySortOrder,
  SkillType,
} from '@/types';
import { useGameStore } from './useGameStore';
import { getPartTemplate, getPartSet, QUALITY_NAMES } from '@/data/parts';
import { getSkillTemplate } from '@/data/skills';
import { getMaterialTemplate } from '@/data/materials';
import { generateId } from '@/utils/id';
import { loadFromLocalStorage, throttledSave } from '@/utils/save';

type InventoryItemData = Part | Skill | Material;

interface InventoryState {
  isInitialized: boolean;
  filters: InventoryFilter;
  selectedItemId: string | null;
  bulkMode: boolean;
  selectedIds: string[];
  showDetail: boolean;

  initialize: () => void;
  setFilter: (key: keyof InventoryFilter, value: any) => void;
  setSelectedItem: (id: string | null) => void;
  toggleShowDetail: (show?: boolean) => void;

  toggleBulkMode: () => void;
  toggleSelectItem: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  toggleLock: (id: string) => void;
  toggleFavorite: (id: string) => void;

  bulkLock: () => void;
  bulkUnlock: () => void;
  bulkFavorite: () => void;
  bulkUnfavorite: () => void;

  sortItems: (sortBy: InventorySortBy, sortOrder?: InventorySortOrder) => void;

  getFilteredItems: () => { item: InventoryItemData; inventoryItem: InventoryItem }[];

  saveInventory: () => void;
}

const DEFAULT_FILTERS: InventoryFilter = {
  itemType: 'all',
  rarity: 0,
  slot: 'all',
  skillType: 'all',
  onlyFavorites: false,
  onlyLocked: false,
  sortBy: 'rarity',
  sortOrder: 'desc',
  search: '',
};

const getItemRarity = (item: InventoryItemData): Rarity => {
  return item.rarity;
};

const getItemName = (item: InventoryItemData): string => {
  return item.name;
};

const isPart = (item: InventoryItemData): item is Part => {
  return 'slot' in item && 'quality' in item;
};

const isSkill = (item: InventoryItemData): item is Skill => {
  return 'type' in item && 'damage' in item && 'cooldown' in item;
};

const isMaterial = (item: InventoryItemData): item is Material => {
  return 'type' in item && 'element' in item && !('slot' in item) && !('damage' in item);
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  isInitialized: false,
  filters: { ...DEFAULT_FILTERS },
  selectedItemId: null,
  bulkMode: false,
  selectedIds: [],
  showDetail: false,

  initialize: () => {
    const state = get();
    if (state.isInitialized) return;

    const data = loadFromLocalStorage();
    const gameState = useGameStore.getState();

    if (data?.inventoryData) {
      set({
        filters: data.inventoryData.filters || { ...DEFAULT_FILTERS },
        selectedItemId: data.inventoryData.selectedItemId || null,
        bulkMode: data.inventoryData.bulkMode || false,
        selectedIds: data.inventoryData.selectedIds || [],
      });
    }

    const existingItems: InventoryItem[] = data?.inventoryData?.items || [];

    const allOwnedParts = gameState.ownedParts;
    const allOwnedSkills = gameState.ownedSkills;
    const allOwnedMaterials = gameState.ownedMaterials;

    const existingItemIds = new Set(existingItems.map(i => i.itemId));

    const newItems: InventoryItem[] = [];

    allOwnedParts.forEach(part => {
      if (!existingItemIds.has(part.id)) {
        newItems.push({
          id: generateId('inv'),
          itemType: 'part',
          itemId: part.id,
          isLocked: false,
          isFavorite: false,
          acquiredAt: Date.now(),
        });
      }
    });

    allOwnedSkills.forEach(skill => {
      if (!existingItemIds.has(skill.id)) {
        newItems.push({
          id: generateId('inv'),
          itemType: 'skill',
          itemId: skill.id,
          isLocked: false,
          isFavorite: false,
          acquiredAt: Date.now(),
        });
      }
    });

    allOwnedMaterials.forEach(material => {
      if (!existingItemIds.has(material.id)) {
        newItems.push({
          id: generateId('inv'),
          itemType: 'material',
          itemId: material.id,
          isLocked: false,
          isFavorite: false,
          acquiredAt: Date.now(),
        });
      }
    });

    if (newItems.length > 0) {
      const allItems = [...existingItems, ...newItems];
      set({ isInitialized: true });
      get().saveInventory();
    } else {
      set({ isInitialized: true });
    }
  },

  setFilter: (key, value) => {
    set(state => ({
      filters: { ...state.filters, [key]: value },
    }));
    get().saveInventory();
  },

  setSelectedItem: (id) => {
    set({ selectedItemId: id });
    get().saveInventory();
  },

  toggleShowDetail: (show) => {
    if (show !== undefined) {
      set({ showDetail: show });
    } else {
      set(state => ({ showDetail: !state.showDetail }));
    }
  },

  toggleBulkMode: () => {
    set(state => ({
      bulkMode: !state.bulkMode,
      selectedIds: [],
    }));
    get().saveInventory();
  },

  toggleSelectItem: (id) => {
    set(state => {
      const selected = state.selectedIds.includes(id)
        ? state.selectedIds.filter(i => i !== id)
        : [...state.selectedIds, id];
      return { selectedIds: selected };
    });
    get().saveInventory();
  },

  selectAll: () => {
    const filtered = get().getFilteredItems();
    const ids = filtered.map(f => f.inventoryItem.id);
    set({ selectedIds: ids });
    get().saveInventory();
  },

  clearSelection: () => {
    set({ selectedIds: [] });
    get().saveInventory();
  },

  toggleLock: (id) => {
    const data = loadFromLocalStorage();
    if (!data?.inventoryData) return;

    const items = data.inventoryData.items.map(item =>
      item.id === id ? { ...item, isLocked: !item.isLocked } : item
    );

    const newData = {
      ...data,
      inventoryData: { ...data.inventoryData, items },
    };
    throttledSave(newData);
  },

  toggleFavorite: (id) => {
    const data = loadFromLocalStorage();
    if (!data?.inventoryData) return;

    const items = data.inventoryData.items.map(item =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );

    const newData = {
      ...data,
      inventoryData: { ...data.inventoryData, items },
    };
    throttledSave(newData);
  },

  bulkLock: () => {
    const data = loadFromLocalStorage();
    if (!data?.inventoryData) return;

    const { selectedIds } = get();
    const selectedSet = new Set(selectedIds);

    const items = data.inventoryData.items.map(item =>
      selectedSet.has(item.id) && !item.isLocked ? { ...item, isLocked: true } : item
    );

    const newData = {
      ...data,
      inventoryData: { ...data.inventoryData, items },
    };
    throttledSave(newData);
  },

  bulkUnlock: () => {
    const data = loadFromLocalStorage();
    if (!data?.inventoryData) return;

    const { selectedIds } = get();
    const selectedSet = new Set(selectedIds);

    const items = data.inventoryData.items.map(item =>
      selectedSet.has(item.id) && item.isLocked ? { ...item, isLocked: false } : item
    );

    const newData = {
      ...data,
      inventoryData: { ...data.inventoryData, items },
    };
    throttledSave(newData);
  },

  bulkFavorite: () => {
    const data = loadFromLocalStorage();
    if (!data?.inventoryData) return;

    const { selectedIds } = get();
    const selectedSet = new Set(selectedIds);

    const items = data.inventoryData.items.map(item =>
      selectedSet.has(item.id) && !item.isFavorite ? { ...item, isFavorite: true } : item
    );

    const newData = {
      ...data,
      inventoryData: { ...data.inventoryData, items },
    };
    throttledSave(newData);
  },

  bulkUnfavorite: () => {
    const data = loadFromLocalStorage();
    if (!data?.inventoryData) return;

    const { selectedIds } = get();
    const selectedSet = new Set(selectedIds);

    const items = data.inventoryData.items.map(item =>
      selectedSet.has(item.id) && item.isFavorite ? { ...item, isFavorite: false } : item
    );

    const newData = {
      ...data,
      inventoryData: { ...data.inventoryData, items },
    };
    throttledSave(newData);
  },

  sortItems: (sortBy, sortOrder) => {
    const currentFilters = get().filters;
    set(state => ({
      filters: {
        ...state.filters,
        sortBy,
        sortOrder: sortOrder || (currentFilters.sortBy === sortBy && currentFilters.sortOrder === 'desc' ? 'asc' : 'desc'),
      },
    }));
    get().saveInventory();
  },

  getFilteredItems: () => {
    const data = loadFromLocalStorage();
    if (!data?.inventoryData) return [];

    const { filters } = get();
    const gameState = useGameStore.getState();

    const allItems = data.inventoryData.items;

    let filtered = allItems.filter(invItem => {
      let itemData: InventoryItemData | undefined;

      if (invItem.itemType === 'part') {
        itemData = gameState.ownedParts.find(p => p.id === invItem.itemId);
      } else if (invItem.itemType === 'skill') {
        itemData = gameState.ownedSkills.find(s => s.id === invItem.itemId);
      } else {
        itemData = gameState.ownedMaterials.find(m => m.id === invItem.itemId);
      }

      if (!itemData) return false;

      if (filters.itemType !== 'all' && invItem.itemType !== filters.itemType) {
        return false;
      }

      if (filters.rarity !== 0 && getItemRarity(itemData) !== filters.rarity) {
        return false;
      }

      if (filters.onlyFavorites && !invItem.isFavorite) {
        return false;
      }

      if (filters.onlyLocked && !invItem.isLocked) {
        return false;
      }

      if (filters.search && !getItemName(itemData).toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      if (filters.slot && filters.slot !== 'all' && isPart(itemData) && itemData.slot !== filters.slot) {
        return false;
      }

      if (filters.skillType && filters.skillType !== 'all' && isSkill(itemData) && itemData.type !== filters.skillType) {
        return false;
      }

      return true;
    });

    const itemsWithData = filtered
      .map(invItem => {
        let itemData: InventoryItemData | undefined;
        if (invItem.itemType === 'part') {
          itemData = gameState.ownedParts.find(p => p.id === invItem.itemId);
        } else if (invItem.itemType === 'skill') {
          itemData = gameState.ownedSkills.find(s => s.id === invItem.itemId);
        } else {
          itemData = gameState.ownedMaterials.find(m => m.id === invItem.itemId);
        }
        return itemData ? { item: itemData, inventoryItem: invItem } : null;
      })
      .filter((v): v is { item: InventoryItemData; inventoryItem: InventoryItem } => v !== null);

    itemsWithData.sort((a, b) => {
      let comparison = 0;
      const sortBy = filters.sortBy;
      const sortOrder = filters.sortOrder;

      switch (sortBy) {
        case 'rarity':
          comparison = getItemRarity(a.item) - getItemRarity(b.item);
          break;
        case 'name':
          comparison = getItemName(a.item).localeCompare(getItemName(b.item));
          break;
        case 'acquiredAt':
          comparison = a.inventoryItem.acquiredAt - b.inventoryItem.acquiredAt;
          break;
        case 'quality':
          if (isPart(a.item) && isPart(b.item)) {
            comparison = a.item.quality - b.item.quality;
          } else {
            comparison = 0;
          }
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return itemsWithData;
  },

  saveInventory: () => {
    const state = get();
    const data = loadFromLocalStorage();
    if (!data) return;

    const newData = {
      ...data,
      inventoryData: {
        items: data.inventoryData?.items || [],
        filters: state.filters,
        selectedItemId: state.selectedItemId,
        bulkMode: state.bulkMode,
        selectedIds: state.selectedIds,
      },
    };

    throttledSave(newData);
  },
}));
