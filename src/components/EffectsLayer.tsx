import React, { useState, useEffect, useCallback } from 'react'
import type { ParticleEffect, FloatingText } from '../types'
import { getElementColor } from '../utils/battleEngine'

interface EffectsLayerProps {
  children: React.ReactNode
}

interface EffectsContextType {
  addParticle: (particle: Omit<ParticleEffect, 'id' | 'createdAt'>) => void
  addFloatingText: (text: Omit<FloatingText, 'id' | 'createdAt'>) => void
}

export const EffectsContext = React.createContext<EffectsContextType | null>(null)

export const useEffects = () => {
  const context = React.useContext(EffectsContext)
  if (!context) {
    throw new Error('useEffects must be used within EffectsLayer')
  }
  return context
}

export const EffectsLayer: React.FC<EffectsLayerProps> = ({ children }) => {
  const [particles, setParticles] = useState<ParticleEffect[]>([])
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([])

  const addParticle = useCallback((particle: Omit<ParticleEffect, 'id' | 'createdAt'>) => {
    const newParticle: ParticleEffect = {
      ...particle,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: Date.now(),
    }
    setParticles((prev) => [...prev, newParticle])
  }, [])

  const addFloatingText = useCallback((text: Omit<FloatingText, 'id' | 'createdAt'>) => {
    const newText: FloatingText = {
      ...text,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: Date.now(),
    }
    setFloatingTexts((prev) => [...prev, newText])
  }, [])

  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      setParticles((prev) => prev.filter((p) => now - p.createdAt < p.duration))
      setFloatingTexts((prev) => prev.filter((t) => now - t.createdAt < 1500))
    }, 100)
    return () => clearInterval(cleanup)
  }, [])

  const getParticleStyle = (particle: ParticleEffect) => {
    const color = getElementColor(particle.element)
    const size = particle.type === 'skill' ? '60px' : particle.type === 'death' ? '80px' : '30px'

    return {
      left: `${particle.x}%`,
      top: `${particle.y}%`,
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
    }
  }

  const getParticleIcon = (type: ParticleEffect['type']) => {
    switch (type) {
      case 'hit': return '💥'
      case 'skill': return '✨'
      case 'death': return '💀'
      case 'buff': return '⬆️'
      case 'debuff': return '⬇️'
      default: return '✨'
    }
  }

  return (
    <EffectsContext.Provider value={{ addParticle, addFloatingText }}>
      <div className="relative w-full h-full">
        {children}

        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute animate-skill-cast flex items-center justify-center"
              style={getParticleStyle(particle)}
            >
              <span className="text-3xl">{getParticleIcon(particle.type)}</span>
            </div>
          ))}

          {floatingTexts.map((text) => (
            <div
              key={text.id}
              className="absolute damage-text"
              style={{
                left: `${text.x}%`,
                top: `${text.y}%`,
                color: text.color,
                textShadow: `0 0 10px ${text.color}, 0 0 20px ${text.color}`,
              }}
            >
              {text.text}
            </div>
          ))}
        </div>
      </div>
    </EffectsContext.Provider>
  )
}

export const NeonBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />

      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 0, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-cyber-darker/50" />
    </div>
  )
}

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-cyber-darker flex flex-col items-center justify-center z-50">
      <div className="text-8xl mb-8 animate-float">🏟️</div>
      <h1 className="font-cyber text-4xl font-bold mb-4">
        <span className="neon-text-pink">霓虹</span>
        <span className="neon-text-cyan">斗兽场</span>
      </h1>
      <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-pink-500 to-cyan-500 animate-glow"
          style={{
            width: '100%',
            backgroundSize: '200% 100%',
            animation: 'loadingBar 2s ease-in-out infinite',
          }}
        />
      </div>
      <p className="mt-4 text-gray-400 animate-neon-pulse">正在加载游戏数据...</p>
      <style>{`
        @keyframes loadingBar {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}
