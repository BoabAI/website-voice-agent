import { useEffect, useRef } from "react";

export function AudioVisualizer({
  stream,
  isActive,
  mode,
}: {
  stream: MediaStream | null;
  isActive: boolean;
  mode: "listening" | "speaking" | "user_speaking" | "processing";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!stream || !isActive || !canvasRef.current) return;

    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024; // Higher resolution
    analyser.smoothingTimeConstant = 0.85;

    let source: MediaStreamAudioSourceNode;
    try {
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
    } catch (e) {
      console.error("Error connecting stream to visualizer:", e);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let time = 0;

    const render = () => {
      animationId = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      // Calculate volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const volume = Math.min(1, avg / 50); // Adjusted sensitivity
      
      time += 0.05; // Slightly faster animation

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Set colors based on mode with gradients
      let baseColor = "";
      let glowColor = "";
      
      if (mode === "speaking") { // Agent
        baseColor = "#8B5CF6"; // Violet
        glowColor = "#A78BFA";
      } else if (mode === "user_speaking") { // User
        baseColor = "#10B981"; // Emerald
        glowColor = "#34D399";
      } else if (mode === "processing") { // Thinking
        baseColor = "#F59E0B"; // Amber
        glowColor = "#FBBF24";
      } else { // Idle
        baseColor = "#94A3B8"; // Slate
        glowColor = "#CBD5E1";
      }

      const waves = 5;
      
      for (let i = 0; i < waves; i++) {
        ctx.beginPath();
        ctx.lineWidth = i === 0 ? 3 : 2; // Center line thicker
        
        // Calculate opacity and color
        const opacity = 1 - (i / waves) * 0.8;
        ctx.strokeStyle = `${baseColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
        
        // Add glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = glowColor;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const points = [];
        const segments = width / 10; // More segments for smoother curve
        
        // Phase shift for each wave
        const phase = i * (Math.PI / 3);
        const speed = 0.02 + (i * 0.01);

        for (let x = 0; x <= width; x += 10) {
          // Complex wave function
          // Base wave
          const sine1 = Math.sin((x * 0.01) + time + phase);
          // Secondary wave for texture
          const sine2 = Math.sin((x * 0.02) + (time * 1.5) + phase);
          
          // Amplitude Modulation based on distance from center
          const distFromCenter = Math.abs(x - width / 2) / (width / 2);
          const envelope = 1 - Math.pow(distFromCenter, 2); // Parabolic envelope

          const waveHeight = (volume * 100) + 10;
          const offset = (sine1 + sine2 * 0.5) * waveHeight * envelope;
          
          // Add some random movement even when silent
          const idleMovement = Math.sin((x * 0.01) + time) * 5 * envelope;

          points.push({
            x, 
            y: centerY + (volume > 0.01 ? offset : idleMovement)
          });
        }

        // Draw Smooth Curve
        if (points.length > 0) {
          ctx.moveTo(points[0].x, points[0].y);
          for (let j = 0; j < points.length - 1; j++) {
             const p0 = points[j];
             const p1 = points[j+1];
             const mx = (p0.x + p1.x) / 2;
             const my = (p0.y + p1.y) / 2;
             ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
          }
          ctx.lineTo(points[points.length-1].x, points[points.length-1].y);
          ctx.stroke();
        }
      }
      
      // Reset shadow for next frame/clear
      ctx.shadowBlur = 0;
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
      source.disconnect();
      analyser.disconnect();
      audioCtx.close();
    };
  }, [stream, isActive, mode]);

  return <canvas ref={canvasRef} className="w-full h-full block" style={{ width: '100%', height: '100%' }} />;
}
