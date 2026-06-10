import { NavLink } from 'react-router-dom';
import { Swords, Users, Zap, ShoppingBag, Home, Coins, Star, BookOpen, Trophy, Castle } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { formatNumber } from '@/utils/format';

export const NavBar = () => {
  const coins = useGameStore(state => state.player.coins);

  const navItems = [
    { to: '/', icon: Home, label: '大厅' },
    { to: '/lineup', icon: Users, label: '阵容' },
    { to: '/skills', icon: Zap, label: '技能' },
    { to: '/ascend', icon: Star, label: '升星' },
    { to: '/season', icon: Trophy, label: '天梯' },
    { to: '/guild', icon: Castle, label: '公会' },
    { to: '/codex', icon: BookOpen, label: '图鉴' },
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
                    `flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-cyber-cyan/20 text-cyber-cyan neon-border-cyan'
                        : 'text-gray-400 hover:text-cyber-cyan hover:bg-cyber-cyan/10'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.label}</span>
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
                `flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'text-cyber-cyan'
                    : 'text-gray-500'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};
