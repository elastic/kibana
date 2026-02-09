/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';

interface ContainerSize {
  width: number;
  height: number;
}

/**
 * Custom hook to observe and track container size changes.
 * Uses ResizeObserver for efficient size tracking.
 */
export const useContainerSize = (initialSize: ContainerSize = { width: 0, height: 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ContainerSize>(initialSize);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Initial size measurement
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height });
      }
    };

    // Use RAF for initial measurement to ensure layout is complete
    const rafId = requestAnimationFrame(updateSize);

    // Observe size changes
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 || height > 0) {
          setSize({ width, height });
        }
      }
    });

    observer.observe(element);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return { ref, size };
};

/**
 * Simplified version that only tracks width
 */
export const useContainerWidth = (initialWidth: number = 0) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
};
