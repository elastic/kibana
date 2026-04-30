/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coerceTaskState,
  getKiDefinitionState,
  setKiDefinitionState,
  type ExtractEntityTaskState,
  type KiDefinitionStateEntry,
  type KiDefinitionStates,
} from './extract_entity_task_state';

const buildEntry = (overrides?: Partial<KiDefinitionStateEntry>): KiDefinitionStateEntry => ({
  paginationTimestamp: null,
  paginationId: null,
  lastExecutionTimestamp: null,
  logsPageCursorStartTimestamp: null,
  logsPageCursorStartId: null,
  logsPageCursorEndTimestamp: null,
  logsPageCursorEndId: null,
  ...overrides,
});

describe('coerceTaskState', () => {
  it('returns a fresh state when input is undefined', () => {
    expect(coerceTaskState(undefined)).toEqual({ namespace: '', runs: 0 });
  });

  it('returns a fresh state when input is null', () => {
    expect(coerceTaskState(null)).toEqual({ namespace: '', runs: 0 });
  });

  it('returns a fresh state when input is not an object', () => {
    expect(coerceTaskState('not-an-object')).toEqual({ namespace: '', runs: 0 });
    expect(coerceTaskState(42)).toEqual({ namespace: '', runs: 0 });
  });

  it('coerces a legacy pre-PR-H state with no kiDefinitionStates', () => {
    const legacy = {
      namespace: 'default',
      runs: 5,
      entityType: 'host',
      lastExecutionTimestamp: '2026-04-29T00:00:00.000Z',
      lastExtractionSuccess: true,
      status: 'success',
    };

    const coerced = coerceTaskState(legacy);

    expect(coerced).toEqual({
      namespace: 'default',
      runs: 5,
      entityType: 'host',
      lastExecutionTimestamp: '2026-04-29T00:00:00.000Z',
      lastExtractionSuccess: true,
      status: 'success',
    });
    expect(coerced.kiDefinitionStates).toBeUndefined();
  });

  it('preserves a well-formed kiDefinitionStates map', () => {
    const entry = buildEntry({ paginationTimestamp: '2026-04-29T00:00:00.000Z' });
    const input = {
      namespace: 'default',
      runs: 1,
      kiDefinitionStates: {
        'logs.k8s.pods': {
          service: entry,
          database: buildEntry({
            lastError: 'boom',
            lastErrorTimestamp: '2026-04-29T01:00:00.000Z',
          }),
        },
      },
    };

    const coerced = coerceTaskState(input);

    expect(coerced.kiDefinitionStates).toEqual({
      'logs.k8s.pods': {
        service: entry,
        database: expect.objectContaining({ lastError: 'boom' }),
      },
    });
  });

  it('drops malformed kiDefinitionStates without throwing', () => {
    const input = {
      namespace: 'default',
      runs: 1,
      kiDefinitionStates: 'not-a-map',
    };
    expect(coerceTaskState(input).kiDefinitionStates).toBeUndefined();

    const inputWithBadStream = {
      namespace: 'default',
      runs: 1,
      kiDefinitionStates: { 'logs.k8s.pods': 'not-an-object' },
    };
    expect(coerceTaskState(inputWithBadStream).kiDefinitionStates).toBeUndefined();

    const inputWithBadSubtype = {
      namespace: 'default',
      runs: 1,
      kiDefinitionStates: { 'logs.k8s.pods': { service: 'not-an-object' } },
    };
    expect(coerceTaskState(inputWithBadSubtype).kiDefinitionStates).toBeUndefined();
  });

  it('keeps valid stream entries even when sibling stream entries are malformed', () => {
    const goodEntry = buildEntry();
    const input = {
      namespace: 'default',
      runs: 1,
      kiDefinitionStates: {
        'logs.k8s.pods': { service: goodEntry },
        'logs.bad': null,
      },
    };

    const coerced = coerceTaskState(input);

    expect(coerced.kiDefinitionStates).toEqual({ 'logs.k8s.pods': { service: goodEntry } });
  });

  it('rejects non-numeric runs and falls back to 0', () => {
    expect(coerceTaskState({ namespace: 'default', runs: 'three' }).runs).toBe(0);
    expect(coerceTaskState({ namespace: 'default', runs: NaN }).runs).toBe(0);
    expect(coerceTaskState({ namespace: 'default', runs: Infinity }).runs).toBe(0);
  });

  it('rejects unknown status values', () => {
    expect(
      coerceTaskState({ namespace: 'default', runs: 1, status: 'pending' }).status
    ).toBeUndefined();
    expect(coerceTaskState({ namespace: 'default', runs: 1, status: 'success' }).status).toBe(
      'success'
    );
    expect(coerceTaskState({ namespace: 'default', runs: 1, status: 'error' }).status).toBe(
      'error'
    );
  });

  it('round-trips a serialized state through JSON', () => {
    const original: ExtractEntityTaskState = {
      namespace: 'space-1',
      runs: 7,
      entityType: 'generic',
      lastExecutionTimestamp: '2026-04-29T00:00:00.000Z',
      lastExtractionSuccess: true,
      status: 'success',
      kiDefinitionStates: {
        'logs.k8s.pods': {
          service: buildEntry({ paginationTimestamp: '2026-04-29T01:00:00.000Z' }),
        },
      },
    };

    const roundTripped = coerceTaskState(JSON.parse(JSON.stringify(original)));

    expect(roundTripped).toEqual(original);
  });
});

describe('getKiDefinitionState', () => {
  it('returns undefined when the states map is undefined', () => {
    expect(getKiDefinitionState(undefined, 'logs.k8s.pods', 'service')).toBeUndefined();
  });

  it('returns undefined for a missing stream', () => {
    const states: KiDefinitionStates = { other: { service: buildEntry() } };
    expect(getKiDefinitionState(states, 'logs.k8s.pods', 'service')).toBeUndefined();
  });

  it('returns undefined for a missing subtype within an existing stream', () => {
    const states: KiDefinitionStates = { 'logs.k8s.pods': { database: buildEntry() } };
    expect(getKiDefinitionState(states, 'logs.k8s.pods', 'service')).toBeUndefined();
  });

  it('returns the entry when both keys are present', () => {
    const entry = buildEntry({ paginationTimestamp: '2026-04-29T00:00:00.000Z' });
    const states: KiDefinitionStates = { 'logs.k8s.pods': { service: entry } };
    expect(getKiDefinitionState(states, 'logs.k8s.pods', 'service')).toBe(entry);
  });
});

describe('setKiDefinitionState', () => {
  it('creates the stream branch when absent', () => {
    const entry = buildEntry();
    const result = setKiDefinitionState(undefined, 'logs.k8s.pods', 'service', entry);
    expect(result).toEqual({ 'logs.k8s.pods': { service: entry } });
  });

  it('adds a new subtype under an existing stream without disturbing siblings', () => {
    const existingService = buildEntry({ paginationTimestamp: 'a' });
    const newDatabase = buildEntry({ paginationTimestamp: 'b' });
    const states: KiDefinitionStates = { 'logs.k8s.pods': { service: existingService } };

    const result = setKiDefinitionState(states, 'logs.k8s.pods', 'database', newDatabase);

    expect(result).toEqual({
      'logs.k8s.pods': { service: existingService, database: newDatabase },
    });
  });

  it('replaces an existing entry for the same (stream, subtype)', () => {
    const oldEntry = buildEntry({ paginationTimestamp: 'old' });
    const newEntry = buildEntry({ paginationTimestamp: 'new', lastError: 'boom' });
    const states: KiDefinitionStates = { 'logs.k8s.pods': { service: oldEntry } };

    const result = setKiDefinitionState(states, 'logs.k8s.pods', 'service', newEntry);

    expect(result['logs.k8s.pods'].service).toBe(newEntry);
  });

  it('does not mutate the input map (sibling streams are deep-cloned at the keys we touch)', () => {
    const entry = buildEntry();
    const otherEntry = buildEntry({ paginationTimestamp: 'other' });
    const states: KiDefinitionStates = { other: { service: otherEntry } };
    const before = JSON.stringify(states);

    setKiDefinitionState(states, 'logs.k8s.pods', 'service', entry);

    expect(JSON.stringify(states)).toEqual(before);
  });

  it('preserves unrelated stream branches as the same reference (cheap shallow copy)', () => {
    const otherEntry = buildEntry();
    const states: KiDefinitionStates = { other: { service: otherEntry } };

    const result = setKiDefinitionState(states, 'logs.k8s.pods', 'service', buildEntry());

    // Unrelated branches are not deep-cloned: the implementation only
    // shallow-copies the top-level map and the touched stream's inner map.
    // This keeps update cost O(touched_stream_subtypes) per write.
    expect(result.other).toBe(states.other);
  });
});
