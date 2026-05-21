/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  __DETECTOR_SETTINGS_STORAGE_KEY as STORAGE_KEY,
  __resetDetectorSettingsForTests,
  getDetectorSettingsStore,
} from './duplicate_detections_settings';

describe('DetectorSettingsStore', () => {
  beforeEach(() => {
    __resetDetectorSettingsForTests();
  });

  afterEach(() => {
    __resetDetectorSettingsForTests();
  });

  it('returns the built-in defaults when localStorage is empty', () => {
    const store = getDetectorSettingsStore();
    expect(store.get()).toEqual({
      enabled: true,
      ignoredPathPrefixes: [],
      scopedSources: [],
      scopedTeams: [],
    });
  });

  it('persists updates to localStorage and pushes them through settings$', () => {
    const store = getDetectorSettingsStore();
    const seen: boolean[] = [];
    const sub = store.settings$.subscribe((s) => seen.push(s.enabled));

    store.update({ enabled: false });
    store.update({
      ignoredPathPrefixes: ['/api/saved_objects'],
      scopedSources: ['synthetics'],
      scopedTeams: ['@elastic/actionable-obs-team'],
    });

    expect(seen).toEqual([true, false, false]);
    expect(store.get()).toEqual({
      enabled: false,
      ignoredPathPrefixes: ['/api/saved_objects'],
      scopedSources: ['synthetics'],
      scopedTeams: ['@elastic/actionable-obs-team'],
    });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      enabled: false,
      ignoredPathPrefixes: ['/api/saved_objects'],
      scopedSources: ['synthetics'],
      scopedTeams: ['@elastic/actionable-obs-team'],
    });

    sub.unsubscribe();
  });

  it('reads pre-existing settings from localStorage on first access', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        enabled: false,
        ignoredPathPrefixes: ['/api/x'],
        scopedSources: ['slo'],
        scopedTeams: ['@elastic/team-a'],
      })
    );
    const store = getDetectorSettingsStore();
    expect(store.get()).toEqual({
      enabled: false,
      ignoredPathPrefixes: ['/api/x'],
      scopedSources: ['slo'],
      scopedTeams: ['@elastic/team-a'],
    });
  });

  it('falls back to defaults when localStorage contains malformed JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json}');
    const store = getDetectorSettingsStore();
    expect(store.get()).toEqual({
      enabled: true,
      ignoredPathPrefixes: [],
      scopedSources: [],
      scopedTeams: [],
    });
  });

  it('sanitizes untrusted input (drops non-string entries, coerces types)', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        enabled: 'yes',
        ignoredPathPrefixes: ['/api/x', 123, '', null, '/api/y'],
        scopedSources: 'not-an-array',
        scopedTeams: ['@elastic/ok', 42, '', null, '@elastic/ok2'],
      })
    );
    const store = getDetectorSettingsStore();
    expect(store.get()).toEqual({
      enabled: true,
      ignoredPathPrefixes: ['/api/x', '/api/y'],
      scopedSources: [],
      scopedTeams: ['@elastic/ok', '@elastic/ok2'],
    });
  });

  it('reset() restores defaults and persists them', () => {
    const store = getDetectorSettingsStore();
    store.update({ enabled: false, scopedSources: ['slo'], scopedTeams: ['@elastic/x'] });
    store.reset();
    expect(store.get()).toEqual({
      enabled: true,
      ignoredPathPrefixes: [],
      scopedSources: [],
      scopedTeams: [],
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify({
        enabled: true,
        ignoredPathPrefixes: [],
        scopedSources: [],
        scopedTeams: [],
      })
    );
  });
});
