/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hook that provides a dismissal state persisted to localStorage with an
 * automatic reappearance after a configurable duration. Use for callouts
 * or other components that need to reappear after a set amount of time.
 *
 * @param storageKey - Unique localStorage key for this dismissal
 * @param reappearAfterMs - Duration in ms before the dismissal expires (default: 7 days)
 * @returns A tuple of [isDismissed, dismiss]
 */
export const useTimedDismissal = (
  storageKey: string,
  reappearAfterMs: number = SEVEN_DAYS_MS
): [boolean, () => void] => {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      const dismissedAt = localStorage.getItem(storageKey);
      if (!dismissedAt) {
        return false;
      }
      return Date.now() - Number(dismissedAt) < reappearAfterMs;
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // localStorage may be unavailable (e.g. private browsing quota exceeded)
    }
    setIsDismissed(true);
  }, [storageKey]);

  return [isDismissed, dismiss];
};
