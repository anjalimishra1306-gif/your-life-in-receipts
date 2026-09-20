// src/utils/useRaf.ts
import { useEffect, useRef, useCallback } from 'react';

/** Call fn on each animation frame until cancelled. Returns cancel function. */
export function useRaf(fn: (dt: number) => void, active: boolean): void {
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!active) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = (now: number) => {
      const dt = lastRef.current !== null ? now - lastRef.current : 0;
      lastRef.current = now;
      fnRef.current(dt);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, [active]);
}

/** Animate a numeric value from start to end using rAF */
export function useAnimatedValue(
  target: number,
  duration: number,
  reducedMotion: boolean,
  onUpdate: (val: number) => void
): void {
  const startRef = useRef<number | null>(null);
  const startValRef = useRef(target);
  const targetRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      onUpdate(target);
      return;
    }

    const startVal = startValRef.current;
    targetRef.current = target;
    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = startVal + (target - startVal) * eased;
      onUpdate(val);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        startValRef.current = target;
        onUpdate(target);
      }
    };

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, reducedMotion]);
}

export const useCallback_ = useCallback;
