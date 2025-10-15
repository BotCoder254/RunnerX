import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const WaterEffect = ({ status, isActive }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let time = 0;
    const amplitude = status === 'up' ? 10 : status === 'down' ? 20 : 5;
    const frequency = status === 'up' ? 0.02 : status === 'down' ? 0.04 : 0.01;
    const speed = status === 'down' ? 0.1 : 0.05;

    const getColor = () => {
      switch (status) {
        case 'up':
          return 'rgba(34, 197, 94, 0.1)'; // success
        case 'down':
          return 'rgba(239, 68, 68, 0.15)'; // danger
        case 'paused':
          return 'rgba(115, 115, 115, 0.08)'; // neutral
        default:
          return 'rgba(245, 158, 11, 0.1)'; // warning
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = getColor();

      ctx.beginPath();
      ctx.moveTo(0, height / 2);

      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * frequency + time) * amplitude;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Second wave
      ctx.beginPath();
      ctx.moveTo(0, height / 2);

      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * frequency * 1.5 + time * 1.2) * (amplitude * 0.7);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      time += speed;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status, isActive]);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"
    >
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full h-full"
      />
    </motion.div>
  );
};

export default WaterEffect;

