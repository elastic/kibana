/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'obsAlerting.mixedCreate.prototypeSettings';

/** How Universal starters (threshold / sequence) render on the idle screen. */
export type IdleBuilderPresentation = 'badge' | 'panel';

export type MixedCreatePrototypeSettings = {
  /** Compact idle ask-anything field that grows with content. */
  compactAskAnything: boolean;
  /** Idle builder starter presentation. */
  idleBuilderPresentation: IdleBuilderPresentation;
};

const DEFAULT_SETTINGS: MixedCreatePrototypeSettings = {
  compactAskAnything: false,
  idleBuilderPresentation: 'panel',
};

const IDLE_BUILDER_PRESENTATIONS: IdleBuilderPresentation[] = ['badge', 'panel'];

const isIdleBuilderPresentation = (value: unknown): value is IdleBuilderPresentation =>
  typeof value === 'string' &&
  IDLE_BUILDER_PRESENTATIONS.includes(value as IdleBuilderPresentation);

const readSettings = (): MixedCreatePrototypeSettings => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<MixedCreatePrototypeSettings>;
    return {
      compactAskAnything: Boolean(parsed.compactAskAnything),
      idleBuilderPresentation: isIdleBuilderPresentation(parsed.idleBuilderPresentation)
        ? parsed.idleBuilderPresentation
        : DEFAULT_SETTINGS.idleBuilderPresentation,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const writeSettings = (settings: MixedCreatePrototypeSettings): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore quota / private-mode failures in the prototype settings.
  }
};

let cachedSettings = readSettings();
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const getSnapshot = (): MixedCreatePrototypeSettings => cachedSettings;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const updateSettings = (
  updater: (prev: MixedCreatePrototypeSettings) => MixedCreatePrototypeSettings
): void => {
  cachedSettings = updater(cachedSettings);
  writeSettings(cachedSettings);
  emit();
};

/** Prototype-only toggles for the mixed Create rule experience. */
export const useMixedCreatePrototypeSettings = (): {
  settings: MixedCreatePrototypeSettings;
  setCompactAskAnything: (enabled: boolean) => void;
  setIdleBuilderPresentation: (presentation: IdleBuilderPresentation) => void;
} => {
  const settings = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SETTINGS);

  const setCompactAskAnything = useCallback((enabled: boolean) => {
    updateSettings((prev) => ({ ...prev, compactAskAnything: enabled }));
  }, []);

  const setIdleBuilderPresentation = useCallback((presentation: IdleBuilderPresentation) => {
    updateSettings((prev) => ({ ...prev, idleBuilderPresentation: presentation }));
  }, []);

  return { settings, setCompactAskAnything, setIdleBuilderPresentation };
};
