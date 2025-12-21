import { useState, useRef, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className = '' }: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <motion.div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`
        relative overflow-hidden rounded-2xl
        bg-card/80 backdrop-blur-sm border border-border/50
        shadow-sm hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-black/30
        transition-all duration-500 ease-out
        ${className}
      `}
    >
      {/* Gradient border glow on hover */}
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-2xl opacity-0 transition-opacity duration-700"
        style={{
          opacity: opacity * 0.6,
          background: `linear-gradient(135deg, 
            hsl(220, 70%, 55%, 0.4) 0%, 
            hsl(280, 65%, 60%, 0.4) 50%,
            hsl(200, 70%, 55%, 0.4) 100%)`,
        }}
      />
      
      {/* Inner card background */}
      <div className="absolute inset-[1px] rounded-2xl bg-card" />
      
      {/* Spotlight effect */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, 
            hsl(220, 70%, 55%, 0.06), 
            transparent 40%)`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}


