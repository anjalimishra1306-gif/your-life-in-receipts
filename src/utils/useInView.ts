// src/utils/useInView.ts
import { useState, useEffect, useRef, type RefObject } from 'react';

export function useInView<T extends Element>(
  options: IntersectionObserverInit = {}
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold: 0.15, ...options });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return [ref, inView];
}
