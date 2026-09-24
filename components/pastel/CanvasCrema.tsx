'use client';

import { useEffect, useRef } from 'react';
import { useMovimiento } from '@/components/movimiento/MovimientoContext';

interface CanvasCremaProps {
  alpha?: number;
}

interface Drop {
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
  vx: number;
  vy: number;
  stretch: number;
}

export default function CanvasCrema({ alpha = 0.78 }: CanvasCremaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { efectivoPausado } = useMovimiento();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let drops: Drop[] = [];
    let visible = false;
    let animationFrame = 0;
    let lastTime = performance.now();

    const pointer = { x: -1000, y: -1000, active: false };

    // Si está pausado, limpiar y salir
    if (efectivoPausado) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

    const draw = (time: number, dt: number) => {
      ctx.clearRect(0, 0, width, height);
      if (efectivoPausado) return;

      const bounds = parent.getBoundingClientRect();
      const mx = pointer.x - bounds.left;
      const my = pointer.y - bounds.top;

      drops.forEach((drop) => {
        const dx = drop.x - mx;
        const dy = drop.y - my;
        const distance = Math.hypot(dx, dy);

        if (pointer.active && distance < 170) {
          const force = (1 - distance / 170) * 0.7;
          drop.vx += (dx / Math.max(distance, 1)) * force;
          drop.vy += (dy / Math.max(distance, 1)) * force;
        }

        drop.vx *= Math.pow(0.94, dt);
        drop.vy *= Math.pow(0.94, dt);
        drop.x += (drop.vx + Math.sin(time * 0.0004 + drop.phase) * 0.15) * dt;
        drop.y += (drop.speed + drop.vy) * dt;

        if (drop.y > height + 65) drop.y = -65;
        if (drop.y < -80) drop.y = height + 40;

        // Evitar que la deriva se meta debajo del texto; la crema vive en los márgenes
        const leftSide = drop.x < width / 2;
        drop.x = leftSide
          ? Math.max(drop.radius, Math.min(width * 0.048 - drop.radius * 0.35, drop.x))
          : Math.max(width * 0.952 + drop.radius * 0.35, Math.min(width - drop.radius, drop.x));

        drop.stretch += (1.2 + Math.min(1.1, Math.hypot(drop.vx, drop.vy) * 0.13) - drop.stretch) * 0.08;

        ctx.save();
        ctx.translate(drop.x, drop.y);
        ctx.rotate(Math.sin(time * 0.0003 + drop.phase) * 0.25 - drop.vx * 0.04);
        ctx.scale(1, drop.stretch);

        const r = drop.radius;
        const cream = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 0, 0, 0, r * 1.25);
        cream.addColorStop(0, '#FFFAF7');
        cream.addColorStop(0.48, '#F7EBE8');
        cream.addColorStop(1, '#E4D0CA');

        ctx.globalAlpha = alpha;
        ctx.fillStyle = cream;
        ctx.shadowColor = 'rgba(43, 35, 32, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 6;

        ctx.beginPath();
        ctx.moveTo(-r * 0.12, -r * 1.45);
        ctx.bezierCurveTo(r * 0.12, -r * 0.6, r * 1.15, -r * 0.35, r * 0.84, r * 0.46);
        ctx.bezierCurveTo(r * 0.58, r * 1.16, -r * 0.74, r * 1.02, -r * 0.86, r * 0.35);
        ctx.bezierCurveTo(-r * 1.03, -r * 0.35, -r * 0.27, -r * 0.63, -r * 0.12, -r * 1.45);
        ctx.fill();
        ctx.restore();
      });
    };

    const tick = (time: number) => {
      animationFrame = 0;
      if (efectivoPausado || document.hidden) return;

      if (time - lastTime >= 32) {
        const dt = Math.min((time - lastTime) / 16.67, 3);
        lastTime = time;
        if (visible) draw(time, dt);
      }

      if (visible) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    const start = () => {
      if (!animationFrame && !efectivoPausado && !document.hidden && visible) {
        lastTime = performance.now();
        animationFrame = requestAnimationFrame(tick);
      }
    };

    const stop = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    const resize = () => {
      width = parent.clientWidth;
      height = parent.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = width < 600 ? 8 : 19;
      drops = Array.from({ length: count }, (_, i) => ({
        x: (i % 2 ? 0.95 + Math.random() * 0.035 : 0.015 + Math.random() * 0.025) * width,
        y: Math.random() * height,
        radius: width < 600 ? 4 + Math.random() * 6 : 8 + Math.random() * 13,
        speed: 0.18 + Math.random() * 0.28,
        phase: Math.random() * Math.PI * 2,
        vx: 0,
        vy: 0,
        stretch: 1,
      }));

      draw(0, 1);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);

    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visible = entry.isIntersecting;
        if (visible) {
          start();
        } else {
          stop();
        }
      });
    });
    intersectionObserver.observe(parent);

    const onPointerMove = (e: PointerEvent) => {
      pointer.active = finePointerQuery.matches && !efectivoPausado;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    const onVisibilityChange = () => {
      stop();
      if (!document.hidden && visible) start();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [efectivoPausado, alpha]);

  return <canvas ref={canvasRef} className="cream-canvas" aria-hidden="true" />;
}
