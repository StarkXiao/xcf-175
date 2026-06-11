import { NavLink } from 'react-router-dom';
import { Swords, Users, Zap, ShoppingBag, Home, Coins, Star, BookOpen, Trophy, Castle, Map, Gavel, FlaskConical, Target, Award, Globe, Package, ArrowLeftRight } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useWorldEventStore } from '@/store/useWorldEventStore';
import { formatNumber } from '@/utils/format';

export const NavBar = () => {
  const coins = useGameStore(state => state.player.coins);
  const unclaimedCount = useTaskStore(state => state.getUnclaimedCount());
  const isTasksInitialized = useTaskStore(state => state.isInitialized);
  const activeEventCount = useWorldEventStore(state => state.activeEvents.filter(e => e.status === 'active').length);

  const navItems = [
    { to: '/', icon: Home, label: '大厅' },
    { to: '/story', icon: Map, label: '剧情' },
    { to: '/lineup', icon: Users, label: '阵容' },
    { to: '/skills', icon: Zap, label: '技能' },
    { to: '/ascend', icon: Star, label: '升星' },
    { to: '/lab', icon: FlaskConical, label: '实验室' },
    { to: '/inventory', icon: Package, label: '仓库' },
    { to: '/trade', icon: ArrowLeftRight, label: '交易' },
    { to: '/auction', icon: Gavel, label: '黑市' },
    { to: '/season', icon: Trophy, label: '天梯' },
    { to: '/arena', icon: Target, label: '竞技场' },
    { to: '/guild', icon: Castle, label: '公会' },
    { to: '/codex', icon: BookOpen, label: '图鉴' },
    { to: '/tasks', icon: Award, label: '任务', badge: isTasksInitialized && unclaimedCount > 0 ? unclaimedCount : undefined },
    { to: '/world-event', icon: Globe, label: '事件', badge: activeEventCount > 0 ? activeEventCount : undefined },
    { to: '/battle', icon: Swords, label: '战斗' },
    { to: '/shop', icon: ShoppingBag, label: '商店' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cyber-darker/95 backdrop-blur-md border-b border-cyber-cyan/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-3xl">⚔️</span>
            <h1 className="font-cyber text-xl font-bold neon-text-cyan">
              霓虹斗兽场
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-cyber-dark/50 rounded-lg border border-cyber-yellow/30">
              <Coins className="w-5 h-5 text-cyber-yellow" />
              <span className="font-cyber font-bold text-cyber-yellow">
                {formatNumber(coins)}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 relative ${
                      isActive
                        ? 'bg-cyber-cyan/20 text-cyber-cyan neon-border-cyan'
                        : 'text-gray-400 hover:text-cyber-cyan hover:bg-cyber-cyan/10'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        <div className="md:hidden flex justify-around py-2 border-t border-gray-800">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all relative ${
                  isActive
                    ? 'text-cyber-cyan'
                    : 'text-gray-500'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
              {item.badge !== undefined && (
                <span className="absolute top-0 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};
