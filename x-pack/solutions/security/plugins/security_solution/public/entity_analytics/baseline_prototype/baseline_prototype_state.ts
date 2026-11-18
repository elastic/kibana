/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * DESIGN PROTOTYPE, NOT FOR MERGE.
 *
 * State of the baseline prototype: which version is on, whether the typical score comes from
 * ES|QL or is mocked, and whether the decision model is "available". Each setting is a small
 * module-level store with listeners, read by the header control, the entities grid and the
 * flyout, as in the facelift prototype's `active_version.ts`.
 */

import { useEffect, useState } from 'react';

export type BaselineVersion = 'off' | 'v0';
export type BaselineDataMode = 'live' | 'mock';

export const BASELINE_VERSIONS: readonly BaselineVersion[] = ['v0', 'off'];
export const BASELINE_DATA_MODES: readonly BaselineDataMode[] = ['live', 'mock'];

const STORAGE_PREFIX = 'securitySolution.baselinePrototype.';

const readStored = (key: string): string | null => {
  try {
    return window.sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    return null;
  }
};

const writeStored = (key: string, value: string): void => {
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
  } catch {
    // Storage can be blocked; the setting then lasts until the page reloads.
  }
};

interface Store<T> {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: (value: T) => void) => () => void;
}

const createStore = <T extends string | boolean>(
  key: string,
  initial: T,
  parse: (stored: string | null) => T
): Store<T> => {
  let value = parse(readStored(key)) ?? initial;
  const listeners = new Set<(next: T) => void>();
  return {
    get: () => value,
    set: (next) => {
      if (next === value) return;
      value = next;
      writeStored(key, String(next));
      listeners.forEach((listener) => listener(next));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const useStore = <T>(store: Store<T>): T => {
  const [value, setValue] = useState(store.get);
  useEffect(() => {
    // Catch a change made between the first render and the subscription.
    setValue(store.get());
    return store.subscribe(setValue);
  }, [store]);
  return value;
};

const versionStore = createStore<BaselineVersion>('version', 'off', (stored) =>
  stored === 'v0' ? 'v0' : 'off'
);
// Mock by default: a local cluster rarely has enough risk history for a live typical to differ
// from the current score, which makes a demo show zeros.
const dataModeStore = createStore<BaselineDataMode>('dataMode', 'mock', (stored) =>
  stored === 'live' ? 'live' : 'mock'
);
const judgementAvailableStore = createStore<boolean>('judgementAvailable', true, (stored) =>
  stored === 'false' ? false : true
);

export const getBaselineVersion = (): BaselineVersion => versionStore.get();
export const setBaselineVersion = (version: BaselineVersion): void => versionStore.set(version);
export const useBaselineVersion = (): BaselineVersion => useStore(versionStore);

export const getBaselineDataMode = (): BaselineDataMode => dataModeStore.get();
export const setBaselineDataMode = (mode: BaselineDataMode): void => dataModeStore.set(mode);
export const useBaselineDataMode = (): BaselineDataMode => useStore(dataModeStore);

export const getJudgementAvailable = (): boolean => judgementAvailableStore.get();
export const setJudgementAvailable = (available: boolean): void =>
  judgementAvailableStore.set(available);
export const useJudgementAvailable = (): boolean => useStore(judgementAvailableStore);
