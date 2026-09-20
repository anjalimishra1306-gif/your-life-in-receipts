// src/components/Counter.tsx
// Animated counter that respects prefers-reduced-motion.

import { useRef, useEffect, useState } from 'react';
import { useReducedMotion } from '../utils/useReducedMotion';

interface CounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Counter({ value, duration = 800, decimals = 0, className, style }: CounterProps) {
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState(reduced ? value : 0);
  const startRef = useRef<number | null>(null);
  const startValRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) { setDisplayed(value); return; }

    const startVal = startValRef.current;
    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(startVal + (value - startVal) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else startValRef.current = value;
    };

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [value, duration, reduced]);

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.round(displayed * Math.pow(10, decimals)) / Math.pow(10, decimals));

  return <span className={`tabular ${className ?? ''}`} style={style}>{formatted}</span>;
}
