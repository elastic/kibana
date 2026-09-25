/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { statusSignal } from './status_signal';

/**
 * Subscribes to the cross-boundary status signal and calls `onBump` whenever a status
 * mutation lands in any isolated QueryClient (e.g. the flyout's status toggle).
 *
 * Skips the mount render so that `onBump` only fires for genuine post-mount bumps.
 * `onBump` is held in a ref, so callers do not need to memoise it.
 */
export function useStatusSignal(onBump: () => void): void {
  const onBumpRef = useRef(onBump);
  onBumpRef.current = onBump;

  const version = useSyncExternalStore(statusSignal.subscribe, statusSignal.getSnapshot);
  const prevVersionRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevVersionRef.current;
    prevVersionRef.current = version;
    if (prev === null) return; // skip mount
    if (prev !== version) onBumpRef.current();
  }, [version]);
}
