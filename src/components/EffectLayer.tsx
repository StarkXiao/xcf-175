import { useEffect, useRef, useState, useCallback } from 'react';
import type { Particle, DamageNumber } from '@/types';

interface EffectLayerProps {
  active?: boolean;
  className?: string;
}

export const EffectLayer = ({ active = true, className }: EffectLayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const animationRef = useRef<number>();
  const [, forceUpdate] = useState(0);

  const createParticles = useCallback((x: number, y: number, color: string, count: number, type: Particle['type']) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 30 + Math.random() * 30,
        color,
        size: 3 + Math.random() * 5,
        type,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, []);

  const createDamageNumber = useCallback((x: number, y: number, value: number, type: DamageNumber['type']) => {
    const newNumber: DamageNumber = {
      id: Date.now() + Math.random(),
      x,
      y,
      value,
      type,
      opacity: 1,
    };
    damageNumbersRef.current = [...damageNumbersRef.current, newNumber];
  }, []);

  const triggerHitEffect = useCallback((x: number, y: number, isCrit: boolean) => {
    if (!active) return;
    const color = isCrit ? '#ff0044' : '#ffff00';
    const count = isCrit ? 30 : 15;
    createParticles(x, y, color, count, isCrit ? 'explosion' : 'spark');
    createDamageNumber(x, y, Math.floor(Math.random() * 100) + 10, isCrit ? 'crit' : 'normal');
  }, [active, createParticles, createDamageNumber]);

  const triggerHealEffect = useCallback((x: number, y: number) => {
    if (!active) return;
    createParticles(x, y, '#00ff88', 20, 'heal');
    createDamageNumber(x, y, Math.floor(Math.random() * 50) + 20, 'heal');
  }, [active, createParticles, createDamageNumber]);

  const triggerSkillEffect = useCallback((x: number, y: number, color: string) => {
    if (!active) return;
    createParticles(x, y, color, 25, 'spark');
  }, [active, createParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) return false;

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      damageNumbersRef.current = damageNumbersRef.current.filter(d => {
        d.y -= 1.5;
        d.opacity -= 0.02;

        if (d.opacity <= 0) return false;

        ctx.save();
        ctx.globalAlpha = d.opacity;
        ctx.font = 'bold 24px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (d.type === 'crit') {
          ctx.font = 'bold 32px Orbitron, sans-serif';
          ctx.fillStyle = '#ff0044';
          ctx.shadowColor = '#ff0044';
        } else if (d.type === 'heal') {
          ctx.fillStyle = '#00ff88';
          ctx.shadowColor = '#00ff88';
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffff00';
        }
        ctx.shadowBlur = 10;

        const prefix = d.type === 'heal' ? '+' : '-';
        ctx.fillText(`${prefix}${d.value}`, d.x, d.y);
        ctx.restore();

        return true;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    (window as any).triggerHitEffect = triggerHitEffect;
    (window as any).triggerHealEffect = triggerHealEffect;
    (window as any).triggerSkillEffect = triggerSkillEffect;

    return () => {
      delete (window as any).triggerHitEffect;
      delete (window as any).triggerHealEffect;
      delete (window as any).triggerSkillEffect;
    };
  }, [triggerHitEffect, triggerHealEffect, triggerSkillEffect]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-50 ${className || ''}`}
    />
  );
};
