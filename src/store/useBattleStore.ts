import { create } from 'zustand';
import type { BattleUnit, BattleLogEntry, BattleRecord } from '@/types';
import { BATTLE_CONSTANTS } from '@/engine/constants';

interface BattleState {
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
  screenShake: number;

  initBattle: (record: BattleRecord) => void;
  playBattle: () => NodeJS.Timeout | null;
  pauseBattle: () => void;
  resumeBattle: () => void;
  setSpeed: (speed: number) => void;
  stepForward: () => void;
  resetBattle: () => void;
  processLogEntry: (log: BattleLogEntry) => void;
}

export const useBattleStore = create<BattleState>((set, get) => ({
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
  screenShake: 0,

  initBattle: (record: BattleRecord) => {
    const playerUnits = record.initialPlayerUnits && record.initialPlayerUnits.length > 0
      ? JSON.parse(JSON.stringify(record.initialPlayerUnits))
      : JSON.parse(JSON.stringify(record.playerUnits));
    const enemyUnits = record.initialEnemyUnits && record.initialEnemyUnits.length > 0
      ? JSON.parse(JSON.stringify(record.initialEnemyUnits))
      : JSON.parse(JSON.stringify(record.enemyUnits));
    
    set({
      playerUnits,
      enemyUnits,
      battleLog: record.battleLog,
      currentLogIndex: -1,
      isPlaying: true,
      isPaused: false,
      speed: 1,
      battleRecord: record,
      attackingUnitId: null,
      hurtUnitId: null,
      screenShake: 0,
    });
  },

  playBattle: () => {
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
        attackingUnitId: nextLog.sourceId || null,
        hurtUnitId: nextLog.targetId || null,
      });

      currentState.processLogEntry(nextLog);

      setTimeout(() => {
        set({ attackingUnitId: null, hurtUnitId: null });
      }, BATTLE_CONSTANTS.ANIMATION_DELAY);
    }, delay);

    return timer;
  },

  pauseBattle: () => {
    set({ isPaused: true, isPlaying: false });
  },

  resumeBattle: () => {
    set({ isPaused: false, isPlaying: true });
  },

  setSpeed: (speed: number) => {
    set({ speed: Math.max(1, Math.min(3, speed)) });
  },

  stepForward: () => {
    const state = get();
    if (state.currentLogIndex >= state.battleLog.length - 1) return;

    const nextIndex = state.currentLogIndex + 1;
    const nextLog = state.battleLog[nextIndex];

    set({
      currentLogIndex: nextIndex,
      attackingUnitId: nextLog.sourceId || null,
      hurtUnitId: nextLog.targetId || null,
    });

    state.processLogEntry(nextLog);

    setTimeout(() => {
      set({ attackingUnitId: null, hurtUnitId: null });
    }, BATTLE_CONSTANTS.ANIMATION_DELAY);
  },

  resetBattle: () => {
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
      screenShake: 0,
    });
  },

  processLogEntry: (log: BattleLogEntry) => {
    set(state => {
      let newPlayerUnits = [...state.playerUnits];
      let newEnemyUnits = [...state.enemyUnits];

      const applyToUnit = (
        units: BattleUnit[],
        unitId: string,
        fn: (u: BattleUnit) => BattleUnit
      ): BattleUnit[] => units.map(u => u.id === unitId ? fn(u) : u);

      const findAndApply = (
        unitId: string,
        fn: (u: BattleUnit) => BattleUnit
      ) => {
        if (newEnemyUnits.some(u => u.id === unitId)) {
          newEnemyUnits = applyToUnit(newEnemyUnits, unitId, fn);
        } else {
          newPlayerUnits = applyToUnit(newPlayerUnits, unitId, fn);
        }
      };

      if (log.type === 'damage' || log.type === 'crit' || log.type === 'statusTick') {
        const targetId = log.targetId!;
        const damage = log.value || 0;
        findAndApply(targetId, u => ({
          ...u,
          currentHp: Math.max(0, u.currentHp - damage),
          comboCount: log.comboCount ?? u.comboCount,
          isSkipTurn: log.isSkipTurn ?? u.isSkipTurn,
        }));

        if (log.type === 'statusTick' && log.statusType && !log.isSkipTurn) {
          findAndApply(targetId, u => ({
            ...u,
            statusEffects: u.statusEffects
              .map(se => se.type === log.statusType
                ? { ...se, remainingTurns: log.statusRemainingTurns ?? se.remainingTurns }
                : se)
              .filter(se => se.remainingTurns > 0),
          }));
        }
      }

      if (log.type === 'heal') {
        const targetId = log.targetId!;
        const heal = log.value || 0;
        findAndApply(targetId, u => ({
          ...u,
          currentHp: Math.min(u.maxHp, u.currentHp + heal),
        }));
      }

      if (log.type === 'death') {
        const targetId = log.targetId!;
        findAndApply(targetId, u => ({
          ...u,
          isAlive: false,
          statusEffects: [],
          buffs: [],
          comboCount: 0,
        }));
      }

      if (log.type === 'buff' || log.type === 'debuff') {
        const targetId = log.targetId!;
        if (log.buffData) {
          const bd = log.buffData;
          findAndApply(targetId, u => ({
            ...u,
            buffs: [
              ...u.buffs.filter(b => b.stat !== bd.stat),
              { stat: bd.stat, value: bd.value, remainingTurns: bd.remainingTurns },
            ],
          }));
        }
      }

      if (log.type === 'statusApply') {
        const targetId = log.targetId!;
        if (log.statusEffectData) {
          const sed = log.statusEffectData;
          findAndApply(targetId, u => {
            const existing = u.statusEffects.find(se => se.type === sed.type);
            let newStatusEffects: typeof u.statusEffects;
            if (existing) {
              newStatusEffects = u.statusEffects.map(se =>
                se.type === sed.type
                  ? { ...se, remainingTurns: Math.max(se.remainingTurns, sed.remainingTurns), damage: sed.damage }
                  : se
              );
            } else {
              newStatusEffects = [...u.statusEffects, {
                type: sed.type,
                remainingTurns: sed.remainingTurns,
                damage: sed.damage,
                sourceId: sed.sourceId,
              }];
            }
            let newBuffs = [...u.buffs];
            if (sed.statModifier) {
              const existingBuff = newBuffs.find(b => b.stat === sed.statModifier!.stat);
              if (existingBuff) {
                newBuffs = newBuffs.map(b =>
                  b.stat === sed.statModifier!.stat
                    ? { ...b, value: Math.min(b.value, sed.statModifier!.value), remainingTurns: Math.max(b.remainingTurns, sed.remainingTurns) }
                    : b
                );
              } else {
                newBuffs.push({
                  stat: sed.statModifier.stat,
                  value: sed.statModifier.value,
                  remainingTurns: sed.remainingTurns,
                });
              }
            }
            return { ...u, statusEffects: newStatusEffects, buffs: newBuffs };
          });
        }
      }

      if (log.type === 'skill') {
        const actorId = log.sourceId!;
        findAndApply(actorId, u => ({
          ...u,
          comboCount: log.comboCount ?? u.comboCount,
          skills: u.skills.map(s =>
            s.skillId === log.skillId
              ? { ...s, currentCooldown: log.skillCooldown ?? s.cooldown }
              : s
          ),
        }));
      }

      if (log.type === 'combo') {
        const actorId = log.sourceId!;
        findAndApply(actorId, u => ({
          ...u,
          comboCount: log.comboCount ?? u.comboCount,
        }));
      }

      if (log.type === 'attack') {
        const actorId = log.sourceId!;
        findAndApply(actorId, u => ({
          ...u,
          comboCount: log.comboCount ?? u.comboCount,
        }));
      }

      return {
        playerUnits: newPlayerUnits,
        enemyUnits: newEnemyUnits,
      };
    });
  },
}));
