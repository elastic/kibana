/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

/** How long a submitted detonation keeps running before its verdict is available. */
export const DETONATION_DURATION_MS = 2 * 60 * 1000;

export interface PendingDetonation {
  id: string;
  fileName: string;
  hostName: string;
  sha256: string;
  /** ISO date the detonation was submitted. */
  submittedAt: string;
}

// Tiny external store: detonations submitted from an alert (Flow toast) show up on the Detonate
// page as a row that keeps spinning until the detonation is done.
let pending: PendingDetonation[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const addPendingDetonation = ({
  fileName,
  hostName,
  sha256,
}: Pick<PendingDetonation, 'fileName' | 'hostName' | 'sha256'>): PendingDetonation => {
  const detonation: PendingDetonation = {
    id: `det_${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
    fileName,
    hostName,
    sha256,
    submittedAt: new Date().toISOString(),
  };
  pending = [detonation, ...pending];
  emit();
  return detonation;
};

export const isDetonationDone = (detonation: PendingDetonation, now: number = Date.now()) =>
  now - new Date(detonation.submittedAt).getTime() >= DETONATION_DURATION_MS;

const getSnapshot = () => pending;

/**
 * Detonations submitted from alerts in this session, newest first. Components using it re-render
 * when one finishes, so callers can switch a row from "detonating" to its verdict.
 */
export const usePendingDetonations = (): PendingDetonation[] => {
  const detonations = useSyncExternalStore(subscribe, getSnapshot);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const remaining = detonations
      .map((d) => new Date(d.submittedAt).getTime() + DETONATION_DURATION_MS - now)
      .filter((ms) => ms > 0);
    if (remaining.length === 0) {
      return undefined;
    }
    const timeout = setTimeout(
      () => setTick((current) => current + 1),
      Math.min(...remaining) + 50
    );
    return () => clearTimeout(timeout);
  }, [detonations]);

  // A new array per tick, so memoized consumers recompute which detonations are done.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => [...detonations], [detonations, tick]);
};
