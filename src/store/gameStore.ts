import { create } from 'zustand'
import type {
  GameState,
  BattleState,
  BattleUnit,
  BattleLog,
  Animal,
  Equipment,
  Skill,
  Modification,
  PageId,
  PlayerData,
} from '../types'
import { createInitialPlayerState } from '../data/seedData'
import { createBattleUnit, generateTurnOrder } from '../utils/battleEngine'

const STORAGE_KEY = 'neon_coliseum_save'

const createInitialBattleState = (): BattleState => ({
  isInBattle: false,
  isPaused: false,
  speed: 1,
  currentTurn: 1,
  turnOrder: [],
  currentActorIndex: 0,
  playerTeam: [],
  enemyTeam: [],
  logs: [],
  winner: null,
  betAmount: 0,
})

const recalculateAnimalStats = (animal: Animal): Animal => {
  const levelMultiplier = 1 + (animal.level - 1) * 0.1
  const currentStats = {
    maxHp: Math.floor(animal.baseStats.maxHp * levelMultiplier),
    attack: Math.floor(animal.baseStats.attack * levelMultiplier),
    defense: Math.floor(animal.baseStats.defense * levelMultiplier),
    speed: Math.floor(animal.baseStats.speed * levelMultiplier),
  }

  animal.equipment.forEach((equip) => {
    if (equip) {
      Object.entries(equip.stats).forEach(([key, value]) => {
        if (value && key in currentStats) {
          currentStats[key as keyof typeof currentStats] += value
        }
      })
    }
  })

  animal.modifications.forEach((mod) => {
    Object.entries(mod.statBonus).forEach(([key, value]) => {
      if (value && key in currentStats) {
        currentStats[key as keyof typeof currentStats] += value
      }
    })
  })

  return {
    ...animal,
    currentStats: { ...currentStats, hp: currentStats.maxHp },
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  player: createInitialPlayerState(),
  battle: createInitialBattleState(),
  currentPage: 'home',
  lastSaved: null,

  setCurrentPage: (page: PageId) => set({ currentPage: page }),

  addCoins: (amount: number) =>
    set((state) => ({
      player: { ...state.player, coins: state.player.coins + amount },
    })),

  spendCoins: (amount: number): boolean => {
    const state = get()
    if (state.player.coins < amount) return false
    set({ player: { ...state.player, coins: state.player.coins - amount } })
    return true
  },

  addGems: (amount: number) =>
    set((state) => ({
      player: { ...state.player, gems: state.player.gems + amount },
    })),

  spendGems: (amount: number): boolean => {
    const state = get()
    if (state.player.gems < amount) return false
    set({ player: { ...state.player, gems: state.player.gems - amount } })
    return true
  },

  addAnimal: (animal: Animal) =>
    set((state) => ({
      player: { ...state.player, animals: [...state.player.animals, animal] },
    })),

  updateAnimal: (animalId: string, updates: Partial<Animal>) =>
    set((state) => ({
      player: {
        ...state.player,
        animals: state.player.animals.map((a) =>
          a.id === animalId ? { ...a, ...updates } : a
        ),
      },
    })),

  setAnimalPosition: (animalId: string, position: number | null) =>
    set((state) => {
      const updatedAnimals = state.player.animals.map((a) => {
        if (a.id === animalId) {
          return {
            ...a,
            isDeployed: position !== null,
            position,
          }
        }
        if (a.position === position && position !== null) {
          return { ...a, isDeployed: false, position: null }
        }
        return a
      })

      const updatedLineup = state.player.lineup.map((slot) => {
        if (slot.position === position) {
          return { ...slot, animalId: position !== null ? animalId : null }
        }
        if (slot.animalId === animalId && position === null) {
          return { ...slot, animalId: null }
        }
        return slot
      })

      return {
        player: {
          ...state.player,
          animals: updatedAnimals,
          lineup: updatedLineup,
        },
      }
    }),

  addExpToAnimal: (animalId: string, exp: number) =>
    set((state) => {
      const updatedAnimals = state.player.animals.map((a) => {
        if (a.id !== animalId) return a

        let newExp = a.exp + exp
        let newLevel = a.level
        let newExpToNext = a.expToNext

        while (newExp >= newExpToNext) {
          newExp -= newExpToNext
          newLevel++
          newExpToNext = newLevel * 100
        }

        const updatedAnimal = {
          ...a,
          exp: newExp,
          level: newLevel,
          expToNext: newExpToNext,
        }

        return recalculateAnimalStats(updatedAnimal)
      })

      return {
        player: { ...state.player, animals: updatedAnimals },
      }
    }),

  equipItem: (animalId: string, slotIndex: number, equipment: Equipment | null) =>
    set((state) => {
      const updatedAnimals = state.player.animals.map((a) => {
        if (a.id !== animalId) return a

        const newEquipment = [...a.equipment]
        const oldEquipment = newEquipment[slotIndex]

        newEquipment[slotIndex] = equipment

        let updatedEquipment = [...state.player.equipment]
        if (oldEquipment) {
          updatedEquipment = [...updatedEquipment, oldEquipment]
        }
        if (equipment) {
          updatedEquipment = updatedEquipment.filter((e) => e.id !== equipment.id)
        }

        const updatedAnimal = { ...a, equipment: newEquipment }
        set({ player: { ...state.player, equipment: updatedEquipment } })

        return recalculateAnimalStats(updatedAnimal)
      })

      return {
        player: { ...state.player, animals: updatedAnimals },
      }
    }),

  applyModification: (animalId: string, modification: Modification) =>
    set((state) => {
      const updatedModifications = state.player.modifications.filter(
        (m) => m.id !== modification.id
      )

      const updatedAnimals = state.player.animals.map((a) => {
        if (a.id !== animalId) return a
        const updatedAnimal = {
          ...a,
          modifications: [...a.modifications, modification],
        }
        return recalculateAnimalStats(updatedAnimal)
      })

      return {
        player: {
          ...state.player,
          animals: updatedAnimals,
          modifications: updatedModifications,
        },
      }
    }),

  learnSkill: (animalId: string, skill: Skill) =>
    set((state) => {
      const updatedSkills = state.player.skills.filter((s) => s.id !== skill.id)

      const updatedAnimals = state.player.animals.map((a) => {
        if (a.id !== animalId) return a
        return {
          ...a,
          skills: [...a.skills, { ...skill, id: `${skill.id}_${Date.now()}`, currentCooldown: 0 }],
        }
      })

      return {
        player: {
          ...state.player,
          animals: updatedAnimals,
          skills: updatedSkills,
        },
      }
    }),

  upgradeSkill: (animalId: string, skillId: string) =>
    set((state) => {
      const updatedAnimals = state.player.animals.map((a) => {
        if (a.id !== animalId) return a
        return {
          ...a,
          skills: a.skills.map((s) =>
            s.id === skillId ? { ...s, level: Math.min(s.level + 1, s.maxLevel) } : s
          ),
        }
      })

      return {
        player: { ...state.player, animals: updatedAnimals },
      }
    }),

  buyEquipment: (equipment: Equipment): boolean => {
    const state = get()
    if (state.player.coins < equipment.price) return false

    const newEquipment = {
      ...equipment,
      id: `${equipment.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    }

    set({
      player: {
        ...state.player,
        coins: state.player.coins - equipment.price,
        equipment: [...state.player.equipment, newEquipment],
      },
    })
    return true
  },

  buySkill: (skill: Skill): boolean => {
    const state = get()
    if (state.player.coins < skill.cost) return false

    const newSkill = {
      ...skill,
      id: `${skill.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      currentCooldown: 0,
    }

    set({
      player: {
        ...state.player,
        coins: state.player.coins - skill.cost,
        skills: [...state.player.skills, newSkill],
      },
    })
    return true
  },

  buyModification: (mod: Modification): boolean => {
    const state = get()
    if (state.player.coins < mod.price) return false

    const newMod = {
      ...mod,
      id: `${mod.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    }

    set({
      player: {
        ...state.player,
        coins: state.player.coins - mod.price,
        modifications: [...state.player.modifications, newMod],
      },
    })
    return true
  },

  startBattle: (playerAnimals: Animal[], enemies: Animal[], betAmount: number) => {
    const playerTeam: BattleUnit[] = playerAnimals
      .filter((a) => a.isDeployed)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((animal, idx) => createBattleUnit(animal, 'player', idx, 'mid', 'lowestHp'))

    const enemyTeam: BattleUnit[] = enemies.map((animal, idx) =>
      createBattleUnit(animal, 'enemy', idx, 'mid', 'lowestHp')
    )

    const turnOrder = generateTurnOrder(playerTeam, enemyTeam)

    const startLog: BattleLog = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
      type: 'turnStart',
      message: '=== 第 1 回合开始 ===',
    }

    set({
      currentPage: 'battle',
      battle: {
        isInBattle: true,
        isPaused: false,
        speed: 1,
        currentTurn: 1,
        turnOrder,
        currentActorIndex: 0,
        playerTeam,
        enemyTeam,
        logs: [startLog],
        winner: null,
        betAmount,
      },
    })
  },

  addBattleLog: (log: BattleLog) =>
    set((state) => ({
      battle: {
        ...state.battle,
        logs: [...state.battle.logs, log],
      },
    })),

  updateBattleUnit: (team: 'player' | 'enemy', index: number, unit: BattleUnit) =>
    set((state) => {
      const key = team === 'player' ? 'playerTeam' : 'enemyTeam'
      const newTeam = [...state.battle[key]]
      newTeam[index] = unit
      return {
        battle: { ...state.battle, [key]: newTeam },
      }
    }),

  endBattle: (winner: 'player' | 'enemy') =>
    set((state) => ({
      battle: {
        ...state.battle,
        winner,
        isInBattle: false,
      },
    })),

  setBattlePaused: (paused: boolean) =>
    set((state) => ({
      battle: { ...state.battle, isPaused: paused },
    })),

  setBattleSpeed: (speed: number) =>
    set((state) => ({
      battle: { ...state.battle, speed },
    })),

  resetBattle: () =>
    set({
      battle: createInitialBattleState(),
    }),

  incrementWins: () =>
    set((state) => ({
      player: { ...state.player, totalWins: state.player.totalWins + 1 },
    })),

  incrementLosses: () =>
    set((state) => ({
      player: { ...state.player, totalLosses: state.player.totalLosses + 1 },
    })),

  updateCurrentStage: (stage: number) =>
    set((state) => ({
      player: {
        ...state.player,
        currentStage: stage,
        highestStage: Math.max(state.player.highestStage, stage),
        unlockedStages: Math.max(state.player.unlockedStages, Math.min(10, stage + 2)),
      },
    })),

  saveCurrentGame: () => {
    const state = get()
    const saveData = {
      player: state.player,
      lastSaved: Date.now(),
      version: '1.0.0',
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData))
      set({ lastSaved: saveData.lastSaved })
      alert('游戏已保存！')
    } catch (e) {
      console.error('保存失败:', e)
      alert('保存失败，请检查浏览器存储设置')
    }
  },

  loadGame: (): boolean => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (!savedData) return false

      const parsed = JSON.parse(savedData) as {
        player: PlayerData
        lastSaved: number
        version: string
      }

      if (parsed.player) {
        set({
          player: parsed.player,
          lastSaved: parsed.lastSaved,
          currentPage: 'home',
          battle: createInitialBattleState(),
        })
        return true
      }
      return false
    } catch (e) {
      console.error('加载失败:', e)
      return false
    }
  },

  resetGame: () => {
    if (confirm('确定要重置游戏吗？所有进度将丢失！')) {
      localStorage.removeItem(STORAGE_KEY)
      set({
        player: createInitialPlayerState(),
        battle: createInitialBattleState(),
        currentPage: 'home',
        lastSaved: null,
      })
    }
  },
}))

const initStore = () => {
  const state = useGameStore.getState()
  if (!state.loadGame()) {
    console.log('未找到存档，使用初始状态')
  } else {
    console.log('存档加载成功')
  }

  const originalSet = useGameStore.setState
  useGameStore.setState = (newState, replace) => {
    originalSet(newState, replace)
    const current = useGameStore.getState()
    if (current.battle.isInBattle) return

    try {
      const autoSaveData = {
        player: current.player,
        lastSaved: Date.now(),
        version: '1.0.0',
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(autoSaveData))
    } catch (e) {
      console.error('自动保存失败:', e)
    }
  }
}

initStore()
