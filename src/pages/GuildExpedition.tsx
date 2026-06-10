import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Swords, ShoppingBag, Users, Trophy, ChevronRight,
  Coins, Diamond, Shield, Zap, Heart, Skull, Clock, CheckCircle,
  AlertTriangle, Package, BookOpen, Star, Gift, RefreshCw, Info,
} from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { AnimalCard } from '@/components/AnimalCard';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import { useGuildStore } from '@/store/useGuildStore';
import { GUILD_SHOP_ITEMS, GUILD_BOSS_TEMPLATES, getBossTemplate } from '@/data/guildExpedition';
import {
  GUILD_EXPEDITION_CONFIG,
  GUILD_LEVEL_NAMES,
  GUILD_LEVEL_COLORS,
  ELEMENT_EMOJIS,
  ELEMENT_COLORS,
  ELEMENT_NAMES,
} from '@/engine/constants';
import { getRarityColor, getRarityStars, getRarityName, formatNumber } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { BossPhase, GuildSettlementReward, Animal } from '@/types';

type GuildTab = 'boss' | 'shop' | 'members' | 'settlement';

export default function GuildExpedition() {
  const navigate = useNavigate();
  const { ownedAnimals, lineup, addCoins, addGems, addAnimal, addMaterials } = useGameStore();
  const guild = useGuildStore();

  const [activeTab, setActiveTab] = useState<GuildTab>('boss');
  const [showBattleResult, setShowBattleResult] = useState(false);
  const [battleResult, setBattleResult] = useState<{
    damage: number;
    phaseCleared: BossPhase[];
    bossDefeated: boolean;
    rewards: GuildSettlementReward[];
    log: { message: string; type: string }[];
  } | null>(null);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showSettlementResult, setShowSettlementResult] = useState(false);
  const [settlementRewards, setSettlementRewards] = useState<GuildSettlementReward[]>([]);
  const [showBossPicker, setShowBossPicker] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>(lineup.slice(0, GUILD_EXPEDITION_CONFIG.MAX_TEAM_SIZE));

  useEffect(() => {
    if (!guild.isInitialized) {
      guild.initGuild();
    }
  }, []);

  useEffect(() => {
    const currentWeek = guild.getCurrentWeekId();
    if (currentWeek !== guild.currentWeekId && guild.weeklyContribution > 0) {
      const rewards = guild.processWeeklySettlement();
      if (rewards.length > 0) {
        setSettlementRewards(rewards);
        setShowSettlementResult(true);
        for (const r of rewards) {
          if (r.type === 'coins') addCoins(r.amount);
          if (r.type === 'gems') addGems(r.amount);
        }
      }
    }
  }, [guild.currentWeekId]);

  const handleAttackBoss = () => {
    if (!guild.activeBoss || guild.activeBoss.isDefeated) return;
    if (selectedAnimals.length === 0) return;
    if (guild.activeBoss.attemptsUsed >= GUILD_EXPEDITION_CONFIG.MAX_ATTEMPTS_PER_BOSS) return;

    const animals = selectedAnimals
      .map(id => ownedAnimals.find(a => a.id === id))
      .filter(Boolean) as Animal[];

    setIsAttacking(true);

    setTimeout(() => {
      const result = guild.attackBoss(animals, selectedAnimals);

      if (result.success) {
        setBattleResult({
          damage: result.damage,
          phaseCleared: result.phaseCleared,
          bossDefeated: result.bossDefeated,
          rewards: result.rewards,
          log: result.log.slice(0, 20),
        });
        setShowBattleResult(true);

        for (const r of result.rewards) {
          if (r.type === 'coins') addCoins(r.amount);
          if (r.type === 'gems') addGems(r.amount);
        }
      }

      setIsAttacking(false);
    }, 800);
  };

  const handleSpawnBoss = (templateId: string) => {
    guild.spawnBoss(templateId);
    setShowBossPicker(false);
  };

  const handlePurchaseShopItem = (itemId: string) => {
    const item = GUILD_SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    const success = guild.purchaseShopItem(itemId);
    if (success) {
      if (item.itemType === 'material' && item.templateId === 'guild_coins_1000') {
        addCoins(1000);
      }
    }
  };

  const handleSettlement = () => {
    const rewards = guild.processWeeklySettlement();
    if (rewards.length > 0) {
      setSettlementRewards(rewards);
      setShowSettlementResult(true);
      for (const r of rewards) {
        if (r.type === 'coins') addCoins(r.amount);
        if (r.type === 'gems') addGems(r.amount);
      }
    }
  };

  const tabs = [
    { id: 'boss' as GuildTab, label: '远征Boss', icon: Swords },
    { id: 'shop' as GuildTab, label: '公会商店', icon: ShoppingBag },
    { id: 'members' as GuildTab, label: '成员编队', icon: Users },
    { id: 'settlement' as GuildTab, label: '周常结算', icon: Trophy },
  ];

  const renderGuildHeader = () => (
    <NeonCard variant="purple" className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⚔️</span>
            <h2 className="font-cyber font-bold text-xl text-cyber-purple">{guild.guildName}</h2>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-cyber font-bold" style={{ color: GUILD_LEVEL_COLORS[guild.guildLevel] }}>
              Lv.{guild.guildLevel} {GUILD_LEVEL_NAMES[guild.guildLevel]}
            </span>
            <span className="text-gray-500">
              贡献: <span className="text-cyber-cyan">{formatNumber(guild.totalContribution)}</span>
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden max-w-xs">
            <div
              className="h-full bg-gradient-to-r from-cyber-purple to-cyber-cyan rounded-full transition-all"
              style={{ width: `${guild.guildExpToNext > 0 ? (guild.guildExp / guild.guildExpToNext) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            经验 {guild.guildExp}/{guild.guildExpToNext === Infinity ? 'MAX' : formatNumber(guild.guildExpToNext)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-purple/10 border border-cyber-purple/30 rounded-lg">
            <Diamond className="w-4 h-4 text-cyber-purple" />
            <span className="font-cyber font-bold text-cyber-purple">{formatNumber(guild.guildTokens)}</span>
            <span className="text-xs text-gray-400">公会币</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>本周: 击杀{guild.weeklyBossKills} | 伤害{formatNumber(guild.weeklyBossDamage)}</span>
          </div>
        </div>
      </div>
    </NeonCard>
  );

  const renderBossTab = () => {
    const boss = guild.activeBoss;
    const template = boss ? getBossTemplate(boss.templateId) : null;

    return (
      <div className="space-y-6">
        {!boss ? (
          <div className="space-y-4">
            <h3 className="font-cyber font-bold text-lg text-gray-300 flex items-center gap-2">
              <Skull className="w-5 h-5 text-cyber-pink" />
              选择远征Boss
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guild.getAvailableBosses().map(bt => (
                <NeonCard
                  key={bt.id}
                  variant={bt.rarity >= 4 ? 'pink' : 'purple'}
                  className="cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => handleSpawnBoss(bt.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                      style={{
                        border: `3px solid ${getRarityColor(bt.rarity)}`,
                        background: `linear-gradient(135deg, ${getRarityColor(bt.rarity)}10, ${getRarityColor(bt.rarity)}30)`,
                      }}
                    >
                      {bt.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-cyber font-bold" style={{ color: getRarityColor(bt.rarity) }}>{bt.name}</span>
                        <span className="text-xs" style={{ color: getRarityColor(bt.rarity) }}>{getRarityStars(bt.rarity)}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            color: ELEMENT_COLORS[bt.element],
                            background: `${ELEMENT_COLORS[bt.element]}15`,
                            border: `1px solid ${ELEMENT_COLORS[bt.element]}30`,
                          }}
                        >
                          {ELEMENT_EMOJIS[bt.element]} {ELEMENT_NAMES[bt.element]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{bt.description}</p>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" />{formatNumber(bt.baseHp)}</span>
                        <span className="flex items-center gap-1"><Swords className="w-3 h-3 text-orange-400" />{bt.baseAtk}</span>
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-blue-400" />{bt.baseDef}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {bt.phases.map(p => (
                          <span key={p.phase} className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-dark border border-gray-700 text-gray-400">
                            {p.specialSkillEmoji} {p.specialSkillName}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </div>
                </NeonCard>
              ))}
            </div>

            {GUILD_BOSS_TEMPLATES.filter(b => !guild.getAvailableBosses().includes(b)).length > 0 && (
              <div className="mt-4">
                <h4 className="font-cyber text-sm text-gray-500 mb-2">未解锁Boss (提升公会等级解锁)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {GUILD_BOSS_TEMPLATES.filter(b => !guild.getAvailableBosses().includes(b)).map(bt => (
                    <NeonCard key={bt.id} className="opacity-50">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-3 border-gray-600 bg-gray-800">
                          {bt.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-cyber font-bold text-gray-500">{bt.name}</span>
                            <span className="text-xs" style={{ color: getRarityColor(bt.rarity) }}>{getRarityStars(bt.rarity)}</span>
                          </div>
                          <p className="text-xs text-gray-600">需要公会等级 {bt.rarity <= 3 ? 1 : bt.rarity === 4 ? 2 : 3}</p>
                        </div>
                      </div>
                    </NeonCard>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-cyber font-bold text-lg text-gray-300 flex items-center gap-2">
                {template?.emoji} {template?.name}
              </h3>
              <NeonButton size="sm" variant="ghost" onClick={() => setShowBossPicker(true)}>
                <RefreshCw className="w-4 h-4" />
              </NeonButton>
            </div>

            <NeonCard variant={boss.isDefeated ? 'green' : 'pink'}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                      style={{
                        border: `3px solid ${boss.isDefeated ? '#22c55e' : getRarityColor(template!.rarity)}`,
                        background: boss.isDefeated
                          ? 'linear-gradient(135deg, #22c55e10, #22c55e30)'
                          : `linear-gradient(135deg, ${getRarityColor(template!.rarity)}10, ${getRarityColor(template!.rarity)}30)`,
                      }}
                    >
                      {template?.emoji}
                    </div>
                    <div>
                      <div className="font-cyber font-bold text-xl" style={{ color: getRarityColor(template!.rarity) }}>
                        {template?.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>阶段 {boss.currentPhase}/{template?.phases.length}</span>
                        <span>•</span>
                        <span>尝试 {boss.attemptsUsed}/{GUILD_EXPEDITION_CONFIG.MAX_ATTEMPTS_PER_BOSS}</span>
                      </div>
                      {boss.isDefeated && (
                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 font-bold mt-1 inline-block">
                          ✅ 已击败
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!boss.isDefeated && (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">HP</span>
                        <span className="text-cyber-pink font-cyber font-bold">
                          {formatNumber(Math.max(0, boss.currentHp))} / {formatNumber(boss.maxHp)}
                        </span>
                      </div>
                      <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyber-pink to-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(0, (boss.currentHp / boss.maxHp) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {template && (
                      <div className="space-y-2">
                        {template.phases.map(phase => {
                          const isCurrent = phase.phase === boss.currentPhase;
                          const isCleared = boss.defeatedPhases.includes(phase.phase);
                          return (
                            <div
                              key={phase.phase}
                              className={cn(
                                'p-3 rounded-lg border transition-all',
                                isCurrent ? 'bg-cyber-pink/10 border-cyber-pink/40' :
                                isCleared ? 'bg-green-900/10 border-green-500/30 opacity-60' :
                                'bg-gray-900/30 border-gray-700/30 opacity-50'
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isCleared ? (
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  ) : isCurrent ? (
                                    <AlertTriangle className="w-4 h-4 text-cyber-pink" />
                                  ) : (
                                    <Shield className="w-4 h-4 text-gray-600" />
                                  )}
                                  <span className={cn(
                                    'font-cyber font-bold text-sm',
                                    isCurrent ? 'text-cyber-pink' : isCleared ? 'text-green-400' : 'text-gray-500'
                                  )}>
                                    阶段 {phase.phase}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>ATK ×{phase.atkMultiplier}</span>
                                  <span>DEF ×{phase.defMultiplier}</span>
                                </div>
                              </div>
                              {isCurrent && (
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                  <span>{phase.specialSkillEmoji}</span>
                                  <span className="text-cyber-pink font-bold">{phase.specialSkillName}</span>
                                  <span className="text-gray-500">释放概率 {phase.specialSkillChance}%</span>
                                  {phase.enrageTurns && (
                                    <span className="text-orange-400 ml-2">
                                      ⏰ {phase.enrageTurns}回合后狂暴 (+{phase.enrageAtkBonus}ATK)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {!boss.isDefeated && (
                  <div>
                    <h4 className="font-cyber text-sm text-gray-400 mb-2">出战阵容 ({selectedAnimals.length}/{GUILD_EXPEDITION_CONFIG.MAX_TEAM_SIZE})</h4>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {selectedAnimals.map(id => {
                        const animal = ownedAnimals.find(a => a.id === id);
                        if (!animal) return null;
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-2 px-2 py-1 bg-cyber-dark border border-gray-700 rounded-lg cursor-pointer hover:border-cyber-pink/50"
                            onClick={() => setSelectedAnimals(prev => prev.filter(a => a !== id))}
                          >
                            <span className="text-sm">{animal.name}</span>
                            <span className="text-xs text-gray-500">Lv.{animal.level}</span>
                            <span className="text-gray-600">×</span>
                          </div>
                        );
                      })}
                      {selectedAnimals.length < GUILD_EXPEDITION_CONFIG.MAX_TEAM_SIZE && (
                        <button
                          className="px-3 py-1 border border-dashed border-gray-600 rounded-lg text-sm text-gray-500 hover:border-cyber-pink/50 hover:text-cyber-pink"
                          onClick={() => setShowTeamPicker(true)}
                        >
                          + 添加
                        </button>
                      )}
                    </div>

                    <NeonButton
                      variant="pink"
                      size="lg"
                      fullWidth
                      disabled={
                        selectedAnimals.length === 0 ||
                        boss.attemptsUsed >= GUILD_EXPEDITION_CONFIG.MAX_ATTEMPTS_PER_BOSS ||
                        isAttacking
                      }
                      onClick={handleAttackBoss}
                    >
                      {isAttacking ? (
                        <span className="animate-pulse">⚔️ 战斗中...</span>
                      ) : (
                        <span>⚔️ 进攻Boss (剩余{GUILD_EXPEDITION_CONFIG.MAX_ATTEMPTS_PER_BOSS - boss.attemptsUsed}次)</span>
                      )}
                    </NeonButton>
                  </div>
                )}

                {boss.isDefeated && (
                  <NeonButton variant="purple" onClick={() => setShowBossPicker(true)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    选择新Boss
                  </NeonButton>
                )}
              </div>
            </NeonCard>

            {template && (
              <NeonCard>
                <h4 className="font-cyber font-bold text-sm text-gray-400 mb-3">📋 击败奖励</h4>
                <div className="space-y-2">
                  {template.phases.map(phase => (
                    <div key={phase.phase} className="flex items-center gap-2 text-sm">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-cyber-dark border border-gray-700 text-gray-400">
                        阶段{phase.phase}
                      </span>
                      {template.rewards.filter(r => r.phase === phase.phase).map((r, i) => (
                        <span key={i} className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          r.type === 'guildToken' ? 'bg-cyber-purple/15 text-cyber-purple' :
                          r.type === 'gems' ? 'bg-cyber-cyan/15 text-cyber-cyan' :
                          'bg-cyber-yellow/15 text-cyber-yellow'
                        )}>
                          {r.type === 'guildToken' ? '💎' : r.type === 'gems' ? '💠' : '💰'}{r.amount}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </NeonCard>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderShopTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-cyber font-bold text-lg text-gray-300 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-cyber-purple" />
          公会商店
        </h3>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-purple/10 border border-cyber-purple/30 rounded-lg">
          <Diamond className="w-4 h-4 text-cyber-purple" />
          <span className="font-cyber font-bold text-cyber-purple">{formatNumber(guild.guildTokens)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GUILD_SHOP_ITEMS.map(item => {
          const purchased = guild.shopPurchases[item.id] || 0;
          const remaining = item.weeklyStock - purchased;
          const canBuy = remaining > 0 && guild.guildTokens >= item.cost;

          return (
            <NeonCard
              key={item.id}
              variant={remaining > 0 ? 'purple' : 'default'}
              className={cn(remaining <= 0 && 'opacity-50')}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                  style={{
                    border: `2px solid ${getRarityColor(item.rarity)}`,
                    background: `${getRarityColor(item.rarity)}10`,
                  }}
                >
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-cyber font-bold text-sm" style={{ color: getRarityColor(item.rarity) }}>
                      {item.name}
                    </span>
                    <span className="text-xs" style={{ color: getRarityColor(item.rarity) }}>{getRarityStars(item.rarity)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-cyber-purple">💎 {item.cost}</span>
                      <span className={cn(remaining > 0 ? 'text-gray-400' : 'text-red-400')}>
                        库存: {remaining}/{item.weeklyStock}
                      </span>
                    </div>
                    <NeonButton
                      size="sm"
                      variant={canBuy ? 'purple' : 'ghost'}
                      disabled={!canBuy}
                      onClick={() => handlePurchaseShopItem(item.id)}
                    >
                      {remaining <= 0 ? '售罄' : '兑换'}
                    </NeonButton>
                  </div>
                </div>
              </div>
            </NeonCard>
          );
        })}
      </div>
    </div>
  );

  const renderMembersTab = () => (
    <div className="space-y-4">
      <h3 className="font-cyber font-bold text-lg text-gray-300 flex items-center gap-2">
        <Users className="w-5 h-5 text-cyber-cyan" />
        公会成员
      </h3>

      <div className="space-y-3">
        {guild.members.map(member => {
          const team = guild.expeditionTeams.find(t => t.memberId === member.id);
          return (
            <NeonCard key={member.id} variant="cyan">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="text-3xl">{member.avatar}</span>
                    <span
                      className={cn(
                        'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-cyber-dark',
                        member.isOnline ? 'bg-green-400' : 'bg-gray-600'
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-cyber font-bold text-white">{member.name}</span>
                      <span className="text-xs text-gray-500">Lv.{member.level}</span>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded',
                        member.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'
                      )}>
                        {member.isOnline ? '在线' : '离线'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span>周贡献: <span className="text-cyber-cyan">{member.weeklyContribution}</span></span>
                      <span>总贡献: <span className="text-gray-300">{member.contribution}</span></span>
                    </div>
                    {team && (
                      <div className="text-xs text-gray-500 mt-1">
                        编队: {team.animalIds.length > 0 ? `${team.animalIds.length}只动物` : '未编队'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </NeonCard>
          );
        })}
      </div>

      <NeonCard>
        <h4 className="font-cyber font-bold text-sm text-gray-400 mb-3">编队协作</h4>
        <p className="text-xs text-gray-500 mb-4">
          公会成员可以组建远征队伍，共同挑战Boss。每位成员的队伍会自动参与Boss战斗。
        </p>
        <div className="space-y-3">
          {guild.members.slice(0, 3).map(member => {
            const team = guild.expeditionTeams.find(t => t.memberId === member.id);
            return (
              <div key={member.id} className="flex items-center justify-between p-3 bg-cyber-darker rounded-lg border border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{member.avatar}</span>
                  <span className="font-cyber text-sm">{member.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {team ? (
                    <span className="text-xs text-cyber-cyan">{team.animalIds.length}只已编队</span>
                  ) : (
                    <span className="text-xs text-gray-600">未编队</span>
                  )}
                  <NeonButton
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedMemberId(member.id);
                      setShowTeamPicker(true);
                    }}
                  >
                    编队
                  </NeonButton>
                </div>
              </div>
            );
          })}
        </div>
      </NeonCard>
    </div>
  );

  const renderSettlementTab = () => (
    <div className="space-y-4">
      <h3 className="font-cyber font-bold text-lg text-gray-300 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-cyber-yellow" />
        周常结算
      </h3>

      <NeonCard variant="yellow">
        <div className="space-y-4">
          <div>
            <h4 className="font-cyber font-bold text-sm text-cyber-yellow mb-2">本周进度</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-cyber-darker rounded-lg text-center">
                <div className="text-2xl mb-1">⚔️</div>
                <div className="font-cyber font-bold text-cyber-pink">{guild.weeklyBossKills}</div>
                <div className="text-xs text-gray-500">Boss击杀</div>
              </div>
              <div className="p-3 bg-cyber-darker rounded-lg text-center">
                <div className="text-2xl mb-1">💥</div>
                <div className="font-cyber font-bold text-cyber-cyan">{formatNumber(guild.weeklyBossDamage)}</div>
                <div className="text-xs text-gray-500">总伤害</div>
              </div>
              <div className="p-3 bg-cyber-darker rounded-lg text-center">
                <div className="text-2xl mb-1">🏆</div>
                <div className="font-cyber font-bold text-cyber-yellow">{guild.weeklyContribution}</div>
                <div className="text-xs text-gray-500">周贡献</div>
              </div>
              <div className="p-3 bg-cyber-darker rounded-lg text-center">
                <div className="text-2xl mb-1">📅</div>
                <div className="font-cyber font-bold text-gray-300">{guild.currentWeekId}</div>
                <div className="text-xs text-gray-500">当前周</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-cyber font-bold text-sm text-cyber-yellow mb-2">里程碑奖励</h4>
            <div className="space-y-2">
              {[
                { kills: 1, reward: '💰500 金币', achieved: guild.weeklyBossKills >= 1 },
                { kills: 3, reward: '💠10 宝石 + 💰1500 金币', achieved: guild.weeklyBossKills >= 3 },
                { kills: 5, reward: '💠25 宝石 + 💎100 公会币', achieved: guild.weeklyBossKills >= 5 },
              ].map(milestone => (
                <div
                  key={milestone.kills}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    milestone.achieved
                      ? 'bg-cyber-yellow/10 border-cyber-yellow/30'
                      : 'bg-cyber-darker border-gray-700'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {milestone.achieved ? (
                      <CheckCircle className="w-4 h-4 text-cyber-yellow" />
                    ) : (
                      <Gift className="w-4 h-4 text-gray-600" />
                    )}
                    <span className={cn('font-cyber text-sm', milestone.achieved ? 'text-cyber-yellow' : 'text-gray-500')}>
                      击杀 {milestone.kills} 个Boss
                    </span>
                  </div>
                  <span className={cn('text-xs', milestone.achieved ? 'text-gray-300' : 'text-gray-600')}>
                    {milestone.reward}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </NeonCard>

      {guild.contributionHistory.length > 0 && (
        <NeonCard>
          <h4 className="font-cyber font-bold text-sm text-gray-400 mb-3">历史结算</h4>
          <div className="space-y-2">
            {guild.contributionHistory.slice(-5).reverse().map(record => (
              <div key={record.weekId + record.timestamp} className="p-3 bg-cyber-darker rounded-lg border border-gray-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-cyber text-sm text-gray-300">{record.weekId}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(record.timestamp).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>贡献: <span className="text-cyber-cyan">{record.contribution}</span></span>
                  <span>伤害: <span className="text-cyber-pink">{formatNumber(record.bossDamage)}</span></span>
                  <span>击杀: <span className="text-cyber-yellow">{record.bossKills}</span></span>
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {record.rewards.map((r, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                      {r.type === 'coins' ? '💰' : r.type === 'gems' ? '💠' : '💎'}{r.amount}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </NeonCard>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="sticky top-0 bg-cyber-darker/95 backdrop-blur-sm z-40 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <NeonButton size="sm" variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4" />
              </NeonButton>
              <h1 className="text-2xl font-cyber font-bold text-cyber-purple">公会远征</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {renderGuildHeader()}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-cyber text-sm transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/50'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-gray-700'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'boss' && renderBossTab()}
        {activeTab === 'shop' && renderShopTab()}
        {activeTab === 'members' && renderMembersTab()}
        {activeTab === 'settlement' && renderSettlementTab()}
      </div>

      {isAttacking && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-cyber-pink/30 animate-ping" />
              <div className="absolute inset-4 rounded-full border-4 border-cyber-purple animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl animate-bounce">⚔️</span>
              </div>
            </div>
            <h2 className="text-3xl font-cyber font-black bg-gradient-to-r from-cyber-pink via-cyber-purple to-cyber-cyan bg-clip-text text-transparent animate-pulse">
              远征战斗中...
            </h2>
          </div>
        </div>
      )}

      {showBattleResult && battleResult && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border-2 border-cyber-pink rounded-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-cyber font-black text-center mb-4 bg-gradient-to-r from-cyber-pink to-cyber-purple bg-clip-text text-transparent">
              {battleResult.bossDefeated ? '🎉 Boss已击败!' : '⚔️ 战斗结束'}
            </h2>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-cyber-darker rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-1">造成伤害</div>
                  <div className="font-cyber font-bold text-cyber-pink text-xl">{formatNumber(battleResult.damage)}</div>
                </div>
                <div className="p-3 bg-cyber-darker rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-1">突破阶段</div>
                  <div className="font-cyber font-bold text-cyber-yellow text-xl">
                    {battleResult.phaseCleared.length > 0 ? battleResult.phaseCleared.join(', ') : '无'}
                  </div>
                </div>
              </div>

              {battleResult.rewards.length > 0 && (
                <div>
                  <h4 className="font-cyber text-sm text-gray-400 mb-2">获得奖励</h4>
                  <div className="flex gap-2 flex-wrap">
                    {battleResult.rewards.map((r, i) => (
                      <span
                        key={i}
                        className={cn(
                          'px-3 py-1.5 rounded-lg font-cyber text-sm',
                          r.type === 'guildToken' ? 'bg-cyber-purple/15 text-cyber-purple' :
                          r.type === 'gems' ? 'bg-cyber-cyan/15 text-cyber-cyan' :
                          'bg-cyber-yellow/15 text-cyber-yellow'
                        )}
                      >
                        {r.type === 'guildToken' ? '💎' : r.type === 'gems' ? '💠' : '💰'} {r.amount}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-cyber text-sm text-gray-400 mb-2">战斗日志</h4>
                <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-cyber-darker rounded-lg">
                  {battleResult.log.map((entry, i) => (
                    <p key={i} className={cn(
                      'text-xs',
                      entry.type === 'crit' ? 'text-cyber-yellow' :
                      entry.type === 'skill' ? 'text-cyber-pink' :
                      entry.type === 'info' ? 'text-cyber-cyan' :
                      'text-gray-400'
                    )}>
                      {entry.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <NeonButton variant="pink" onClick={() => setShowBattleResult(false)}>
                关闭
              </NeonButton>
            </div>
          </div>
        </div>
      )}

      {showTeamPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border-2 border-cyber-cyan rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-cyber font-bold text-lg text-cyber-cyan">选择出战动物</h3>
              <NeonButton size="sm" variant="ghost" onClick={() => setShowTeamPicker(false)}>×</NeonButton>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {ownedAnimals.length === 0 ? (
                <Empty
                  icon={Users}
                  title="没有可用动物"
                  description="先去商店获取战斗动物吧！"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ownedAnimals.map(animal => {
                    const isSelected = selectedAnimals.includes(animal.id);
                    return (
                      <div
                        key={animal.id}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-all',
                          isSelected
                            ? 'bg-cyber-cyan/10 border-cyber-cyan/50'
                            : 'bg-cyber-darker border-gray-700 hover:border-cyber-cyan/30'
                        )}
                        onClick={() => {
                          setSelectedAnimals(prev => {
                            if (isSelected) return prev.filter(id => id !== animal.id);
                            if (prev.length >= GUILD_EXPEDITION_CONFIG.MAX_TEAM_SIZE) return prev;
                            return [...prev, animal.id];
                          });
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-cyber font-bold text-sm">{animal.name}</span>
                          <span className="text-xs" style={{ color: getRarityColor(animal.rarity) }}>
                            {getRarityStars(animal.rarity)}
                          </span>
                          <span className="text-xs text-gray-500">Lv.{animal.level}</span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          <span>⭐{animal.starLevel}</span>
                          <span>🔮{animal.breakthroughTier}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  已选 {selectedAnimals.length}/{GUILD_EXPEDITION_CONFIG.MAX_TEAM_SIZE}
                </span>
                <NeonButton variant="cyan" onClick={() => setShowTeamPicker(false)}>
                  确认
                </NeonButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBossPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border-2 border-cyber-pink rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-cyber font-bold text-lg text-cyber-pink">选择远征Boss</h3>
              <NeonButton size="sm" variant="ghost" onClick={() => setShowBossPicker(false)}>×</NeonButton>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
              {guild.getAvailableBosses().map(bt => (
                <div
                  key={bt.id}
                  className="p-4 bg-cyber-darker border border-gray-700 rounded-lg cursor-pointer hover:border-cyber-pink/50 transition-colors"
                  onClick={() => handleSpawnBoss(bt.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                      style={{
                        border: `3px solid ${getRarityColor(bt.rarity)}`,
                        background: `${getRarityColor(bt.rarity)}15`,
                      }}
                    >
                      {bt.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-cyber font-bold" style={{ color: getRarityColor(bt.rarity) }}>{bt.name}</span>
                        <span className="text-xs" style={{ color: getRarityColor(bt.rarity) }}>{getRarityStars(bt.rarity)}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1">
                        <span>❤️ {formatNumber(bt.baseHp)}</span>
                        <span>⚔️ {bt.baseAtk}</span>
                        <span>🛡️ {bt.baseDef}</span>
                        <span>阶段: {bt.phases.length}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSettlementResult && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border-2 border-cyber-yellow rounded-2xl max-w-lg w-full p-8">
            <h2 className="text-3xl font-cyber font-black text-center mb-4 bg-gradient-to-r from-cyber-yellow to-cyber-pink bg-clip-text text-transparent">
              🏆 周常结算完成!
            </h2>
            <div className="space-y-3 mb-6">
              {settlementRewards.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-cyber-darker rounded-lg">
                  <span className="text-sm text-gray-300">
                    {r.type === 'coins' ? '💰 金币' : r.type === 'gems' ? '💠 宝石' : '💎 公会币'}
                  </span>
                  <span className={cn(
                    'font-cyber font-bold',
                    r.type === 'coins' ? 'text-cyber-yellow' : r.type === 'gems' ? 'text-cyber-cyan' : 'text-cyber-purple'
                  )}>
                    +{r.amount}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <NeonButton variant="yellow" onClick={() => setShowSettlementResult(false)}>
                领取奖励
              </NeonButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
