"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";

export function HeroBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-white/50 dark:bg-black/50 pointer-events-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808024_1px,transparent_1px),linear-gradient(to_bottom,#80808024_1px,transparent_1px)] bg-size-[24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Radial gradient for focus */}
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-30 blur-[100px]" />

      {/* Render client-only animations after mount to prevent hydration mismatch */}
      {mounted && (
        <>
          {/* Sound Waves */}
          <div className="absolute inset-0 flex items-center justify-center opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]">
            <div className="relative w-full h-full max-w-7xl mx-auto">
              <Wave
                color="rgba(59, 130, 246, 0.6)"
                speed={0.02}
                amplitude={30}
                frequency={0.01}
                yOffset={200}
              />
              <Wave
                color="rgba(139, 92, 246, 0.6)"
                speed={0.015}
                amplitude={40}
                frequency={0.008}
                yOffset={200}
                delay={100}
              />
              <Wave
                color="rgba(168, 85, 247, 0.6)"
                speed={0.01}
                amplitude={20}
                frequency={0.012}
                yOffset={200}
                delay={200}
              />
            </div>
          </div>

          {/* Floating Particles */}
          <Particles />
        </>
      )}
    </div>
  );
}

function Wave({
  color,
  speed,
  amplitude,
  frequency,
  yOffset,
  delay = 0,
}: {
  color: string;
  speed: number;
  amplitude: number;
  frequency: number;
  yOffset: number;
  delay?: number;
}) {
  return (
    <div className="absolute top-1/2 left-0 right-0 w-full h-64 transform -translate-y-1/2">
      <CanvasWave
        color={color}
        speed={speed}
        amplitude={amplitude}
        frequency={frequency}
        yOffset={yOffset}
      />
    </div>
  );
}

function CanvasWave({
  color,
  speed,
  amplitude,
  frequency,
  yOffset,
}: {
  color: string;
  speed: number;
  amplitude: number;
  frequency: number;
  yOffset: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let increment = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 300;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();

      const length = canvas.width;

      // Start the path
      ctx.moveTo(0, canvas.height / 2);

      for (let i = 0; i < length; i++) {
        ctx.lineTo(
          i,
          canvas.height / 2 +
            Math.sin(i * frequency + increment) *
              amplitude *
              Math.sin((i / length) * Math.PI) // Modulate amplitude at ends
        );
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      increment += speed;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, speed, amplitude, frequency]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

function Particles() {
  const particles = Array.from({ length: 30 });

  return (
    <div className="absolute inset-0">
      {particles.map((_, i) => (
        <Particle key={i} />
      ))}
    </div>
  );
}

function Particle() {
  const { x, y, duration, delay } = useMemo(
    () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 10,
    }),
    []
  );

  return (
    <motion.div
      className="absolute w-1 h-1 bg-slate-400/30 rounded-full"
      initial={{ x: `${x}%`, y: `${y}%`, opacity: 0 }}
      animate={{
        y: [`${y}%`, `${y - 20}%`, `${y}%`],
        opacity: [0, 0.8, 0],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay,
      }}
    />
  );
}







