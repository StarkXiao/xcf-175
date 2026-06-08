import { useNavigate } from 'react-router';
import { Swords, Users, BookOpen, ShoppingBag, Trophy, Sparkles } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { useGameStore } from '@/store/useGameStore';
import { BATTLE_CONSTANTS } from '@/engine/constants';

export default function Home() {
  const navigate = useNavigate();
  const { player, lineup, ownedAnimals, startBattle, battleHistory } = useGameStore();
  const canBattle = lineup.length > 0 && lineup.length <= BATTLE_CONSTANTS.MAX_TEAM_SIZE;
  const lastBattle = battleHistory[battleHistory.length - 1];

  const quickBattle = () => {
    if (!canBattle) return;
    const result = startBattle(100);
    if (result.success) {
      navigate(`/battle/${result.battleRecord.id}`);
    }
  };

  const stats = [
    { icon: Trophy, label: '胜利场次', value: battleHistory.filter(b => b.isWin).length, color: 'green' },
    { icon: Swords, label: '总战斗', value: battleHistory.length, color: 'cyan' },
    { icon: Users, label: '拥有动物', value: ownedAnimals.length, color: 'pink' },
    { icon: Sparkles, label: '胜率', value: battleHistory.length > 0 ? Math.round((battleHistory.filter(b => b.isWin).length / battleHistory.length) * 100) : 0, color: 'yellow' },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="relative overflow-hidden py-12 px-4 mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-cyber-purple/20 to-transparent" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-cyber-cyan/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-cyber-pink/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-cyber font-black mb-4 bg-gradient-to-r from-cyber-cyan via-cyber-purple to-cyber-pink bg-clip-text text-transparent leading-tight">
            霓虹斗兽场
          </h1>
          <p className="text-xl text-gray-400 mb-8 font-cyber tracking-wider">
            NEON COLOSSEUM
          </p>
          <p className="text-gray-300 max-w-2xl mx-auto mb-8">
            在赛博朋克的地下世界，改造流浪动物，组建最强阵容，
            下注对战，赢取荣誉与财富！
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <NeonButton
              size="lg"
              variant="cyan"
              onClick={quickBattle}
              disabled={!canBattle}
              className="text-lg px-8"
            >
              <Swords className="w-6 h-6 mr-2" />
              快速对战
            </NeonButton>
            <NeonButton
              size="lg"
              variant="pink"
              onClick={() => navigate('/lineup')}
              className="text-lg px-8"
            >
              <Users className="w-6 h-6 mr-2" />
              编辑阵容
            </NeonButton>
          </div>

          {!canBattle && lineup.length === 0 && (
            <p className="mt-4 text-cyber-yellow text-sm">
              请先在「阵容编辑」中选择出战动物
            </p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <NeonCard key={i} variant={stat.color as any} className="text-center">
              <stat.icon className="w-8 h-8 mx-auto mb-2" />
              <div className="text-3xl font-cyber font-bold mb-1">{stat.value}</div>
              <div className="text-xs text-gray-400 font-cyber">{stat.label}</div>
            </NeonCard>
          ))}
        </div>

        {lastBattle && (
          <NeonCard className="mb-8">
            <h3 className="font-cyber font-bold text-lg mb-4 text-cyber-cyan">
              最近战绩
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <span className={`font-cyber font-bold ${lastBattle.isWin ? 'text-cyber-green' : 'text-cyber-red'}`}>
                  {lastBattle.isWin ? '胜利' : '失败'}
                </span>
                <span className="text-gray-400 mx-2">vs</span>
                <span className="text-gray-300">{lastBattle.opponentName}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-cyber-yellow">
                  {lastBattle.isWin ? '+' : '-'}{lastBattle.reward} 💰
                </span>
                <NeonButton size="sm" onClick={() => navigate(`/replay/${lastBattle.id}`)}>
                  回放
                </NeonButton>
              </div>
            </div>
          </NeonCard>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              title: '阵容编辑',
              desc: '组建你的3只动物战队，装备改造部件',
              action: () => navigate('/lineup'),
              color: 'cyan' as const,
            },
            {
              icon: BookOpen,
              title: '技能配置',
              desc: '为动物配备强力技能，打造独特战斗风格',
              action: () => navigate('/skills'),
              color: 'pink' as const,
            },
            {
              icon: ShoppingBag,
              title: '霓虹商店',
              desc: '抽取新动物、部件和技能',
              action: () => navigate('/shop'),
              color: 'purple' as const,
            },
            {
              icon: Swords,
              title: '开始战斗',
              desc: '下注对战AI对手，赢取丰厚奖励',
              action: () => navigate('/battle'),
              color: 'red' as const,
            },
            {
              icon: Trophy,
              title: '战斗回放',
              desc: '回顾精彩战斗，研究战术',
              action: () => navigate('/replay'),
              color: 'yellow' as const,
            },
          ].map((item, i) => (
            <NeonCard
              key={i}
              variant={item.color}
              className="cursor-pointer hover:scale-105 transition-transform"
              onClick={item.action}
            >
              <item.icon className="w-12 h-12 mb-4" />
              <h3 className="font-cyber font-bold text-xl mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </NeonCard>
          ))}
        </div>
      </div>
    </div>
  );
}
