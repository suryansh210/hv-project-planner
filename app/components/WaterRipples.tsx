'use client';
import { useEffect, useRef } from 'react';

type Ripple = {
  x: number;
  y: number;
  radius: number;
  strength: number;
};

export default function WaterRipples() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripples = useRef<Ripple[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const addRipple = (x: number, y: number) => {
      ripples.current.push({
        x,
        y,
        radius: 0,
        strength: 1,
      });
    };

    window.addEventListener('mousemove', (e) => {
      addRipple(e.clientX, e.clientY);
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < ripples.current.length; i++) {
        const r = ripples.current[i];
        r.radius += 2;
        r.strength *= 0.96;

        const gradient = ctx.createRadialGradient(
          r.x,
          r.y,
          r.radius * 0.4,
          r.x,
          r.y,
          r.radius
        );

        gradient.addColorStop(0, `rgba(80,150,255,0.25)`);
        gradient.addColorStop(0.5, `rgba(80,150,255,0.15)`);
        gradient.addColorStop(1, `rgba(80,150,255,0)`);

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.fill();

        if (r.strength < 0.05) {
          ripples.current.splice(i, 1);
          i--;
        }
      }

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ mixBlendMode: 'overlay' }}
    />
  );
}
