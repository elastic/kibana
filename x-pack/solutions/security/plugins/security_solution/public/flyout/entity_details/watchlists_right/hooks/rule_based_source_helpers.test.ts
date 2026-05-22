/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntitySourceInput, PerTypeState } from './rule_based_source_helpers';
import {
  DEFAULT_RANGE,
  EMPTY_QUERY,
  toggleToType,
  queryFromSource,
  indexPatternsFromSource,
  stateFromSource,
  buildStoreSource,
  buildIndexSource,
  splitInitialSources,
  computeDefaultToggle,
  buildEntitySources,
  getToggleButtons,
} from './rule_based_source_helpers';

describe('toggleToType', () => {
  it('maps entityStore → store', () => {
    expect(toggleToType('entityStore')).toBe('store');
  });

  it('maps indexPattern → index', () => {
    expect(toggleToType('indexPattern')).toBe('index');
  });
});

describe('queryFromSource', () => {
  it('returns queryRule when present', () => {
    expect(queryFromSource({ type: 'store', name: 's', queryRule: 'host.name: "foo"' })).toBe(
      'host.name: "foo"'
    );
  });

  it('falls back to filter.kuery', () => {
    expect(
      queryFromSource({
        type: 'index',
        name: 'i',
        filter: { kuery: 'user.name: "bar"' },
      } as EntitySourceInput)
    ).toBe('user.name: "bar"');
  });

  it('returns empty string when neither is set', () => {
    expect(queryFromSource({ type: 'index', name: 'i' })).toBe('');
  });

  it('returns empty string for undefined source', () => {
    expect(queryFromSource(undefined)).toBe('');
  });
});

describe('indexPatternsFromSource', () => {
  it('parses comma-separated index patterns', () => {
    const result = indexPatternsFromSource({
      type: 'index',
      name: 'src',
      indexPattern: 'logs-*, metrics-*',
    });
    expect(result).toEqual([{ label: 'logs-*' }, { label: 'metrics-*' }]);
  });

  it('trims whitespace from patterns', () => {
    const result = indexPatternsFromSource({
      type: 'index',
      name: 'src',
      indexPattern: '  logs-*  ,  metrics-*  ',
    });
    expect(result).toEqual([{ label: 'logs-*' }, { label: 'metrics-*' }]);
  });

  it('returns empty array for undefined source', () => {
    expect(indexPatternsFromSource(undefined)).toEqual([]);
  });

  it('returns empty array when indexPattern is missing', () => {
    expect(indexPatternsFromSource({ type: 'index', name: 'src' })).toEqual([]);
  });
});

describe('stateFromSource', () => {
  it('builds state from a populated source', () => {
    const source: EntitySourceInput = {
      type: 'index',
      name: 'test',
      indexPattern: 'logs-*',
      identifierField: 'host.name',
      queryRule: 'status: "error"',
    };
    const state = stateFromSource(source);
    expect(state).toEqual({
      filterQuery: { query: 'status: "error"', language: 'kuery' },
      indexPatterns: [{ label: 'logs-*' }],
      entityField: 'host.name',
      range: DEFAULT_RANGE,
      dirty: false,
    });
  });

  it('uses range from source when provided', () => {
    const source: EntitySourceInput = {
      type: 'index',
      name: 'test',
      range: { start: 'now-7d', end: 'now' },
    };
    const state = stateFromSource(source);
    expect(state.range).toEqual({ start: 'now-7d', end: 'now' });
  });

  it('returns clean empty state for undefined source', () => {
    const state = stateFromSource(undefined);
    expect(state).toEqual({
      filterQuery: EMPTY_QUERY,
      indexPatterns: [],
      entityField: '',
      range: DEFAULT_RANGE,
      dirty: false,
    });
  });
});

describe('buildStoreSource', () => {
  const state: PerTypeState = {
    filterQuery: { query: 'risk > 50', language: 'kuery' },
    indexPatterns: [],
    entityField: '',
    range: DEFAULT_RANGE,
    dirty: true,
  };

  it('builds a store source with watchlist name prefix and no range', () => {
    const result = buildStoreSource(state, 'My Watchlist');
    expect(result).toEqual({
      type: 'store',
      name: 'My Watchlist-store',
      queryRule: 'risk > 50',
    });
    expect(result.range).toBeUndefined();
  });

  it('uses default name when watchlistName is empty', () => {
    const result = buildStoreSource(state, '');
    expect(result.name).toBe('entity-store-filter');
  });

  it('omits queryRule when query is empty', () => {
    const empty: PerTypeState = { ...state, filterQuery: EMPTY_QUERY };
    const result = buildStoreSource(empty, 'W');
    expect(result.queryRule).toBeUndefined();
  });
});

describe('buildIndexSource', () => {
  const state: PerTypeState = {
    filterQuery: { query: 'agent.type: "filebeat"', language: 'kuery' },
    indexPatterns: [{ label: 'logs-*' }, { label: 'metrics-*' }],
    entityField: 'host.name',
    range: DEFAULT_RANGE,
    dirty: true,
  };

  it('builds index source with all fields', () => {
    const result = buildIndexSource(state, 'TestWL');
    expect(result).toEqual({
      type: 'index',
      name: 'TestWL-logs-*,metrics-*',
      indexPattern: 'logs-*,metrics-*',
      identifierField: 'host.name',
      queryRule: 'agent.type: "filebeat"',
      range: DEFAULT_RANGE,
    });
  });

  it('uses default name when watchlistName and patterns are empty', () => {
    const empty: PerTypeState = {
      ...state,
      indexPatterns: [],
      filterQuery: EMPTY_QUERY,
      entityField: '',
    };
    const result = buildIndexSource(empty, '');
    expect(result.name).toBe('index-pattern-source');
    expect(result.indexPattern).toBeUndefined();
    expect(result.identifierField).toBeUndefined();
    expect(result.queryRule).toBeUndefined();
  });
});

describe('splitInitialSources', () => {
  const storeSrc: EntitySourceInput = { type: 'store', name: 'store-1', queryRule: 'x:1' };
  const indexSrc: EntitySourceInput = {
    type: 'index',
    name: 'idx-1',
    indexPattern: 'logs-*',
  };
  const integrationSrc: EntitySourceInput = {
    type: 'entity_analytics_integration',
    name: 'okta',
  };

  describe('managed watchlists', () => {
    it('splits store and index sources, ignoring integration sources', () => {
      const result = splitInitialSources(true, [integrationSrc, storeSrc, indexSrc]);
      expect(result).toEqual({ store: storeSrc, index: indexSrc });
    });

    it('returns undefined for missing types', () => {
      const result = splitInitialSources(true, [integrationSrc]);
      expect(result).toEqual({ store: undefined, index: undefined });
    });

    it('handles undefined sources', () => {
      const result = splitInitialSources(true, undefined);
      expect(result).toEqual({ store: undefined, index: undefined });
    });
  });

  describe('non-managed watchlists', () => {
    it('puts a store source in the store slot', () => {
      const result = splitInitialSources(false, [storeSrc]);
      expect(result).toEqual({ store: storeSrc, index: undefined });
    });

    it('puts an index source in the index slot', () => {
      const result = splitInitialSources(false, [indexSrc]);
      expect(result).toEqual({ store: undefined, index: indexSrc });
    });

    it('returns both undefined for empty sources', () => {
      const result = splitInitialSources(false, []);
      expect(result).toEqual({ store: undefined, index: undefined });
    });
  });
});

describe('computeDefaultToggle', () => {
  it('returns indexPattern when only index source exists', () => {
    expect(
      computeDefaultToggle({
        store: undefined,
        index: { type: 'index', name: 'idx' },
      })
    ).toBe('indexPattern');
  });

  it('returns entityStore when only store source exists', () => {
    expect(
      computeDefaultToggle({
        store: { type: 'store', name: 'st' },
        index: undefined,
      })
    ).toBe('entityStore');
  });

  it('returns indexPattern when both sources exist (index takes priority)', () => {
    expect(
      computeDefaultToggle({
        store: { type: 'store', name: 'st' },
        index: { type: 'index', name: 'idx' },
      })
    ).toBe('indexPattern');
  });

  it('returns none when neither source exists', () => {
    expect(computeDefaultToggle({ store: undefined, index: undefined })).toBe('none');
  });
});

describe('buildEntitySources', () => {
  const makeState = (overrides: Partial<PerTypeState> = {}): PerTypeState => ({
    filterQuery: EMPTY_QUERY,
    indexPatterns: [],
    entityField: '',
    range: DEFAULT_RANGE,
    dirty: false,
    ...overrides,
  });

  describe('non-managed', () => {
    it('emits one source matching active toggle', () => {
      const states = {
        store: makeState({ filterQuery: { query: 'risk > 50', language: 'kuery' }, dirty: true }),
        index: makeState(),
      };
      const result = buildEntitySources(states, 'entityStore', false, 'WL');
      expect(result).toHaveLength(1);
      expect(result![0].type).toBe('store');
    });

    it('emits index source when toggle is indexPattern', () => {
      const states = {
        store: makeState(),
        index: makeState({
          indexPatterns: [{ label: 'logs-*' }],
          dirty: true,
        }),
      };
      const result = buildEntitySources(states, 'indexPattern', false, 'WL');
      expect(result).toHaveLength(1);
      expect(result![0].type).toBe('index');
    });
  });

  describe('managed', () => {
    it('emits only dirty sources', () => {
      const states = {
        store: makeState({ filterQuery: { query: 'risk > 50', language: 'kuery' }, dirty: true }),
        index: makeState({ dirty: false }),
      };
      const result = buildEntitySources(states, 'entityStore', true, 'WL');
      expect(result).toHaveLength(1);
      expect(result![0].type).toBe('store');
    });

    it('emits both when both are dirty', () => {
      const states = {
        store: makeState({ filterQuery: { query: 'a:1', language: 'kuery' }, dirty: true }),
        index: makeState({ indexPatterns: [{ label: 'logs-*' }], dirty: true }),
      };
      const result = buildEntitySources(states, 'entityStore', true, 'WL');
      expect(result).toHaveLength(2);
      expect(result!.map((s) => s.type)).toEqual(['store', 'index']);
    });

    it('returns undefined when nothing is dirty', () => {
      const states = {
        store: makeState({ dirty: false }),
        index: makeState({ dirty: false }),
      };
      const result = buildEntitySources(states, 'entityStore', true, 'WL');
      expect(result).toBeUndefined();
    });
  });
});

describe('getToggleButtons', () => {
  it('returns three buttons: none, entityStore, indexPattern', () => {
    const buttons = getToggleButtons();
    expect(buttons).toHaveLength(3);
    expect(buttons[0].id).toBe('none');
    expect(buttons[1].id).toBe('entityStore');
    expect(buttons[2].id).toBe('indexPattern');
  });
});
