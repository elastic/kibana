/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

/**
 * User-tunable settings for the duplicate request detector. Persisted to
 * `window.localStorage` under {@link STORAGE_KEY} so developer preferences
 * survive page reloads.
 */
export interface DetectorSettings {
  /** Main on/off switch for the detector – when `false`, nothing is recorded. */
  enabled: boolean;
  /**
   * Path prefixes to skip (in addition to the built-in defaults baked into the
   * detector). Each entry is a literal path prefix, e.g. `/api/saved_objects`.
   */
  ignoredPathPrefixes: string[];
  /**
   * When non-empty, only detections whose `source` matches one of these
   * entries are recorded. Useful for "show me only my own plugin's noise".
   * An empty array means "no scoping – record everything".
   */
  scopedSources: string[];
  /**
   * When non-empty, only detections whose `source` plugin is owned (per the
   * server-side plugin owners map) by at least one of these GitHub team
   * handles are recorded. Example: `['@elastic/actionable-obs-team']` keeps
   * the toast quiet outside the team's own plugins. Combined with
   * `scopedSources` via AND.
   */
  scopedTeams: string[];
}

const DEFAULT_SETTINGS: DetectorSettings = {
  enabled: true,
  ignoredPathPrefixes: [],
  scopedSources: [],
  scopedTeams: [],
};

/** localStorage key – versioned so future schema changes don't crash older tabs. */
const STORAGE_KEY = 'kbn.observabilityShared.duplicateRequestDetector.settings.v1';

const readFromStorage = (): DetectorSettings => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<DetectorSettings>;
    return sanitize(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const writeToStorage = (settings: DetectorSettings): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Quota errors etc. are best-effort – we don't want to crash the page.
  }
};

/** Coerce partial / untrusted input back into a fully-typed `DetectorSettings`. */
const sanitize = (input: Partial<DetectorSettings>): DetectorSettings => {
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : DEFAULT_SETTINGS.enabled,
    ignoredPathPrefixes: Array.isArray(input.ignoredPathPrefixes)
      ? input.ignoredPathPrefixes.filter((s): s is string => typeof s === 'string' && s.length > 0)
      : [],
    scopedSources: Array.isArray(input.scopedSources)
      ? input.scopedSources.filter((s): s is string => typeof s === 'string' && s.length > 0)
      : [],
    scopedTeams: Array.isArray(input.scopedTeams)
      ? input.scopedTeams.filter((s): s is string => typeof s === 'string' && s.length > 0)
      : [],
  };
};

class DetectorSettingsStore {
  private current: DetectorSettings;
  readonly settings$: BehaviorSubject<DetectorSettings>;

  constructor() {
    this.current = readFromStorage();
    this.settings$ = new BehaviorSubject<DetectorSettings>(this.current);
  }

  /** Synchronous read of the current settings snapshot. */
  get(): DetectorSettings {
    return this.current;
  }

  /** Patch one or more fields, persist to storage, and notify subscribers. */
  update(patch: Partial<DetectorSettings>): void {
    this.current = sanitize({ ...this.current, ...patch });
    writeToStorage(this.current);
    this.settings$.next(this.current);
  }

  /** Restore the built-in defaults (and clear localStorage). */
  reset(): void {
    this.current = { ...DEFAULT_SETTINGS };
    writeToStorage(this.current);
    this.settings$.next(this.current);
  }
}

/**
 * Cross-bundle-safe singleton. See `duplicate_detections_manager.ts` for
 * background – Kibana plugins ship as separate bundles, so the only reliable
 * way to share state is via `globalThis` + `Symbol.for`.
 */
const SINGLETON_KEY: unique symbol = Symbol.for(
  'kbn.observabilityShared.duplicateDetectorSettings'
);

interface GlobalWithSettings {
  [SINGLETON_KEY]?: DetectorSettingsStore;
}

export const getDetectorSettingsStore = (): DetectorSettingsStore => {
  const g = globalThis as unknown as GlobalWithSettings;
  if (!g[SINGLETON_KEY]) {
    g[SINGLETON_KEY] = new DetectorSettingsStore();
  }
  return g[SINGLETON_KEY]!;
};

/** Test-only: clear localStorage and drop the singleton. */
export const __resetDetectorSettingsForTests = (): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  const g = globalThis as unknown as GlobalWithSettings;
  delete g[SINGLETON_KEY];
};

/** Test-only: expose the storage key so tests can pre-seed localStorage. */
export const __DETECTOR_SETTINGS_STORAGE_KEY = STORAGE_KEY;
