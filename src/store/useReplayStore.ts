import { create } from 'zustand';
import type { BattleUnit, BattleLogEntry, BattleRecord } from '@/types';
import { BATTLE_CONSTANTS } from '@/engine/constants';

interface ReplayState {
  playerUnits: BattleUnit[];
  enemyUnits: BattleUnit[];
  battleLog: BattleLogEntry[];
  currentLogIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
  battleRecord: BattleRecord | null;
  attackingUnitId: string | null;
  hurtUnitId: string | null;

  loadReplay: (record: BattleRecord) => void;
  playReplay: () => NodeJS.Timeout | null;
  pauseReplay: () => void;
  resumeReplay: () => void;
  setSpeed: (speed: number) => void;
  seekTo: (index: number) => void;
  resetReplay: () => void;
  processLogEntry: (log: BattleLogEntry) => void;
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  playerUnits: [],
  enemyUnits: [],
  battleLog: [],
  currentLogIndex: -1,
  isPlaying: false,
  isPaused: false,
  speed: 1,
  battleRecord: null,
  attackingUnitId: null,
  hurtUnitId: null,

  loadReplay: (record: BattleRecord) => {
    set({
      playerUnits: JSON.parse(JSON.stringify(record.playerUnits)),
      enemyUnits: JSON.parse(JSON.stringify(record.enemyUnits)),
      battleLog: record.battleLog,
      currentLogIndex: -1,
      isPlaying: false,
      isPaused: false,
      speed: 1,
      battleRecord: record,
      attackingUnitId: null,
      hurtUnitId: null,
    });
  },

  playReplay: () => {
    const state = get();
    if (!state.battleRecord || state.isPaused) return null;

    const delay = BATTLE_CONSTANTS.TURN_DELAY / state.speed;

    const timer = setInterval(() => {
      const currentState = get();
      if (currentState.isPaused) {
        clearInterval(timer);
        return;
      }

      if (currentState.currentLogIndex >= currentState.battleLog.length - 1) {
        clearInterval(timer);
        set({ isPlaying: false });
        return;
      }

      const nextIndex = currentState.currentLogIndex + 1;
      const nextLog = currentState.battleLog[nextIndex];

      set({
        currentLogIndex: nextIndex,
        attackingUnitId: nextLog.actorId || null,
        hurtUnitId: nextLog.targetId || null,
      });

      currentState.processLogEntry(nextLog);

      setTimeout(() => {
        set({ attackingUnitId: null, hurtUnitId: null });
      }, BATTLE_CONSTANTS.ANIMATION_DELAY);
    }, delay);

    return timer;
  },

  pauseReplay: () => {
    set({ isPaused: true, isPlaying: false });
  },

  resumeReplay: () => {
    set({ isPaused: false, isPlaying: true });
  },

  setSpeed: (speed: number) => {
    set({ speed: Math.max(1, Math.min(3, speed)) });
  },

  seekTo: (index: number) => {
    const state = get();
    if (!state.battleRecord) return;

    const clampedIndex = Math.max(-1, Math.min(state.battleLog.length - 1, index));

    let playerUnits = JSON.parse(JSON.stringify(state.battleRecord.playerUnits));
    let enemyUnits = JSON.parse(JSON.stringify(state.battleRecord.enemyUnits));

    for (let i = 0; i <= clampedIndex; i++) {
      const log = state.battleLog[i];
      if (log.type === 'damage' || log.type === 'crit') {
        const targetId = log.targetId;
        const damage = log.value || 0;
        const isEnemyTarget = enemyUnits.some((u: BattleUnit) => u.id === targetId);

        if (isEnemyTarget) {
          enemyUnits = enemyUnits.map((u: BattleUnit) =>
            u.id === targetId
              ? { ...u, currentHp: Math.max(0, u.currentHp - damage) }
              : u
          );
        } else {
          playerUnits = playerUnits.map((u: BattleUnit) =>
            u.id === targetId
              ? { ...u, currentHp: Math.max(0, u.currentHp - damage) }
              : u
          );
        }
      }
      if (log.type === 'heal') {
        const targetId = log.targetId;
        const heal = log.value || 0;
        const isEnemyTarget = enemyUnits.some((u: BattleUnit) => u.id === targetId);

        if (isEnemyTarget) {
          enemyUnits = enemyUnits.map((u: BattleUnit) =>
            u.id === targetId
              ? { ...u, currentHp: Math.min(u.maxHp, u.currentHp + heal) }
              : u
          );
        } else {
          playerUnits = playerUnits.map((u: BattleUnit) =>
            u.id === targetId
              ? { ...u, currentHp: Math.min(u.maxHp, u.currentHp + heal) }
              : u
          );
        }
      }
      if (log.type === 'death') {
        const targetId = log.targetId;
        const isEnemyTarget = enemyUnits.some((u: BattleUnit) => u.id === targetId);

        if (isEnemyTarget) {
          enemyUnits = enemyUnits.map((u: BattleUnit) =>
            u.id === targetId ? { ...u, isAlive: false } : u
          );
        } else {
          playerUnits = playerUnits.map((u: BattleUnit) =>
            u.id === targetId ? { ...u, isAlive: false } : u
          );
        }
      }
    }

    set({
      currentLogIndex: clampedIndex,
      playerUnits,
      enemyUnits,
      attackingUnitId: clampedIndex >= 0 ? state.battleLog[clampedIndex]?.actorId || null : null,
      hurtUnitId: clampedIndex >= 0 ? state.battleLog[clampedIndex]?.targetId || null : null,
    });

    setTimeout(() => {
      set({ attackingUnitId: null, hurtUnitId: null });
    }, BATTLE_CONSTANTS.ANIMATION_DELAY);
  },

  resetReplay: () => {
    set({
      playerUnits: [],
      enemyUnits: [],
      battleLog: [],
      currentLogIndex: -1,
      isPlaying: false,
      isPaused: false,
      speed: 1,
      battleRecord: null,
      attackingUnitId: null,
      hurtUnitId: null,
    });
  },

  processLogEntry: (log: BattleLogEntry) => {
    set(state => {
      let newPlayerUnits = [...state.playerUnits];
      let newEnemyUnits = [...state.enemyUnits];

      if (log.type === 'damage' || log.type === 'crit') {
        const targetId = log.targetId;
        const damage = log.value || 0;
        const isEnemyTarget = newEnemyUnits.some(u => u.id === targetId);

        if (isEnemyTarget) {
          newEnemyUnits = newEnemyUnits.map(u =>
            u.id === targetId
              ? { ...u, currentHp: Math.max(0, u.currentHp - damage) }
              : u
          );
        } else {
          newPlayerUnits = newPlayerUnits.map(u =>
            u.id === targetId
              ? { ...u, currentHp: Math.max(0, u.currentHp - damage) }
              : u
          );
        }
      }

      if (log.type === 'heal') {
        const targetId = log.targetId;
        const heal = log.value || 0;
        const isEnemyTarget = newEnemyUnits.some(u => u.id === targetId);

        if (isEnemyTarget) {
          newEnemyUnits = newEnemyUnits.map(u =>
            u.id === targetId
              ? { ...u, currentHp: Math.min(u.maxHp, u.currentHp + heal) }
              : u
          );
        } else {
          newPlayerUnits = newPlayerUnits.map(u =>
            u.id === targetId
              ? { ...u, currentHp: Math.min(u.maxHp, u.currentHp + heal) }
              : u
          );
        }
      }

      if (log.type === 'death') {
        const targetId = log.targetId;
        const isEnemyTarget = newEnemyUnits.some(u => u.id === targetId);

        if (isEnemyTarget) {
          newEnemyUnits = newEnemyUnits.map(u =>
            u.id === targetId ? { ...u, isAlive: false } : u
          );
        } else {
          newPlayerUnits = newPlayerUnits.map(u =>
            u.id === targetId ? { ...u, isAlive: false } : u
          );
        }
      }

      if (log.type === 'buff' || log.type === 'debuff') {
        const targetId = log.targetId;
        const isEnemyTarget = newEnemyUnits.some(u => u.id === targetId);
        const buffValue = log.type === 'buff' ? 10 : -10;

        if (isEnemyTarget) {
          newEnemyUnits = newEnemyUnits.map(u =>
            u.id === targetId
              ? {
                  ...u,
                  buffs: [
                    ...u.buffs,
                    { stat: 'atk' as const, value: buffValue, remainingTurns: 3 },
                  ],
                }
              : u
          );
        } else {
          newPlayerUnits = newPlayerUnits.map(u =>
            u.id === targetId
              ? {
                  ...u,
                  buffs: [
                    ...u.buffs,
                    { stat: 'atk' as const, value: buffValue, remainingTurns: 3 },
                  ],
                }
              : u
          );
        }
      }

      newPlayerUnits = newPlayerUnits.map(u => ({
        ...u,
        buffs: u.buffs
          .map(b => ({ ...b, remainingTurns: b.remainingTurns - 1 }))
          .filter(b => b.remainingTurns > 0),
      }));

      newEnemyUnits = newEnemyUnits.map(u => ({
        ...u,
        buffs: u.buffs
          .map(b => ({ ...b, remainingTurns: b.remainingTurns - 1 }))
          .filter(b => b.remainingTurns > 0),
      }));

      newPlayerUnits = newPlayerUnits.map(u => ({
        ...u,
        skills: u.skills.map(s => ({
          ...s,
          currentCooldown: Math.max(0, s.currentCooldown - 1),
        })),
      }));

      newEnemyUnits = newEnemyUnits.map(u => ({
        ...u,
        skills: u.skills.map(s => ({
          ...s,
          currentCooldown: Math.max(0, s.currentCooldown - 1),
        })),
      }));

      return {
        playerUnits: newPlayerUnits,
        enemyUnits: newEnemyUnits,
      };
    });
  },
}));
