/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Cycles an index through `count` items on an interval. Rotation stops for good once `select` is
 * called, and never starts for users who prefer reduced motion.
 */
export const useAutoAdvanceIndex = (
  count: number,
  intervalMs: number
): { activeIndex: number; select: (index: number) => void } => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (!autoAdvance) return;
    const timer = setInterval(() => setActiveIndex((index) => (index + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [autoAdvance, count, intervalMs]);

  const select = useCallback((index: number) => {
    setAutoAdvance(false);
    setActiveIndex(index);
  }, []);

  return { activeIndex, select };
};
