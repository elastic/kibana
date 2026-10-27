/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Cycles an index through `count` items on an interval. Rotation pauses while hovered or focused (`pauseProps`), stops
 * for good once `select` is called, and never starts for users who prefer reduced motion.
 */
export const useAutoAdvanceIndex = (
  count: number,
  intervalMs: number
): {
  activeIndex: number;
  select: (index: number) => void;
  pauseProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
} => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(() => !prefersReducedMotion());
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPaused = isHovered || isFocused;

  useEffect(() => {
    if (!autoAdvance || isPaused) return;
    const timer = setInterval(() => setActiveIndex((index) => (index + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [autoAdvance, isPaused, count, intervalMs]);

  const select = useCallback((index: number) => {
    setAutoAdvance(false);
    setActiveIndex(index);
  }, []);

  const pauseProps = useMemo(
    () => ({
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
    }),
    []
  );

  return { activeIndex, select, pauseProps };
};
