/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { ANALYTICS_PREFERENCES_STORAGE_KEY } from '../constants';
import type { AnalyticsPreferences, AnalyticsUseCaseId, ResolvedJourney } from '../types';

interface StoredPreferences {
  selectedUseCaseId: AnalyticsUseCaseId | undefined;
  preferredJourney: ResolvedJourney | undefined;
}

const USE_CASE_IDS: readonly AnalyticsUseCaseId[] = [
  'clickstream',
  'gaming',
  'transactions',
  'adtech',
  'iot',
  'customerFacing',
];

const JOURNEYS: readonly ResolvedJourney[] = ['analytics', 'search'];

const EMPTY_PREFERENCES: StoredPreferences = {
  selectedUseCaseId: undefined,
  preferredJourney: undefined,
};

const parsePreferences = (raw: string | null): StoredPreferences => {
  if (raw === null) {
    return EMPTY_PREFERENCES;
  }
  try {
    const stored: { selectedUseCaseId?: string; preferredJourney?: string } | null =
      JSON.parse(raw);

    if (stored === null || typeof stored !== 'object') {
      return EMPTY_PREFERENCES;
    }
    return {
      selectedUseCaseId: USE_CASE_IDS.find((id) => id === stored.selectedUseCaseId),
      preferredJourney: JOURNEYS.find((journey) => journey === stored.preferredJourney),
    };
  } catch {
    // A corrupt entry holds no preference worth restoring.
    return EMPTY_PREFERENCES;
  }
};

// Shared by every hook instance on the page; the only copy when storage is unavailable.
let currentPreferences: StoredPreferences = EMPTY_PREFERENCES;
let currentRaw: string | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getPreferences = (): StoredPreferences => {
  let raw: string | null;
  try {
    raw = localStorage.getItem(ANALYTICS_PREFERENCES_STORAGE_KEY);
  } catch {
    return currentPreferences;
  }
  if (raw !== currentRaw) {
    currentRaw = raw;
    currentPreferences = parsePreferences(raw);
  }
  return currentPreferences;
};

const setPreferences = (preferences: StoredPreferences): void => {
  currentPreferences = preferences;
  try {
    const raw = JSON.stringify(preferences);
    localStorage.setItem(ANALYTICS_PREFERENCES_STORAGE_KEY, raw);
    currentRaw = raw;
  } catch {
    // The preference then lasts until the page is reloaded.
  }
  listeners.forEach((listener) => listener());
};

/** Remembers the journey to show when the deployment holds both events and search data. */
export const storePreferredJourney = (journey: ResolvedJourney): void => {
  const preferences = getPreferences();
  if (preferences.preferredJourney !== journey) {
    setPreferences({ ...preferences, preferredJourney: journey });
  }
};

/** The selected use case and journey, kept per browser. */
export const useAnalyticsPreferences = (): AnalyticsPreferences => {
  const { selectedUseCaseId, preferredJourney } = useSyncExternalStore(subscribe, getPreferences);

  const selectUseCase = useCallback((id: AnalyticsUseCaseId): void => {
    setPreferences({ ...getPreferences(), selectedUseCaseId: id });
  }, []);

  return useMemo(
    () => ({
      selectedUseCaseId,
      selectUseCase,
      preferredJourney,
      setPreferredJourney: storePreferredJourney,
    }),
    [selectedUseCaseId, selectUseCase, preferredJourney]
  );
};
