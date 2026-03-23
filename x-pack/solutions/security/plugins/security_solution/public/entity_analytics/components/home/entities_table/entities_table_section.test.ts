/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { ENTITY_FIELDS } from './constants';
import {
  transformResolutionFilter,
  buildResolutionGroupFilter,
  extractMatchPhraseValue,
  groupFilterMap,
} from './entities_table_section';

const createFilter = (query: Filter['query']): Filter => ({ query, meta: {} });

describe('transformResolutionFilter', () => {
  it('transforms match_phrase on resolved_to into bool/should', () => {
    const filter = createFilter({
      match_phrase: {
        [ENTITY_FIELDS.RESOLVED_TO]: { query: 'target-entity-id' },
      },
    });

    const result = transformResolutionFilter(filter);

    expect(result.query).toEqual({
      bool: {
        should: [
          { term: { [ENTITY_FIELDS.ENTITY_ID]: 'target-entity-id' } },
          { term: { [ENTITY_FIELDS.RESOLVED_TO]: 'target-entity-id' } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('handles match_phrase with plain string value', () => {
    const filter = createFilter({
      match_phrase: {
        [ENTITY_FIELDS.RESOLVED_TO]: 'target-entity-id',
      },
    });

    const result = transformResolutionFilter(filter);

    expect(result.query).toBeDefined();
    expect(result.query?.bool?.should).toEqual([
      { term: { [ENTITY_FIELDS.ENTITY_ID]: 'target-entity-id' } },
      { term: { [ENTITY_FIELDS.RESOLVED_TO]: 'target-entity-id' } },
    ]);
  });

  it('passes through match_phrase on other fields unchanged', () => {
    const filter = createFilter({
      match_phrase: { 'entity.EngineMetadata.Type': { query: 'user' } },
    });

    const result = transformResolutionFilter(filter);

    expect(result).toBe(filter);
  });

  it('passes through filters without match_phrase unchanged', () => {
    const filter = createFilter({
      bool: { filter: [{ term: { field: 'value' } }] },
    });

    const result = transformResolutionFilter(filter);

    expect(result).toBe(filter);
  });

  it('preserves filter meta', () => {
    const filter: Filter = {
      query: {
        match_phrase: {
          [ENTITY_FIELDS.RESOLVED_TO]: { query: 'target-id' },
        },
      },
      meta: { alias: 'test', disabled: false },
    };

    const result = transformResolutionFilter(filter);

    expect(result.meta).toEqual({ alias: 'test', disabled: false });
  });
});

describe('extractMatchPhraseValue', () => {
  it('extracts query value from match_phrase', () => {
    const filter = createFilter({
      match_phrase: { [ENTITY_FIELDS.RESOLVED_TO]: { query: 'entity-123' } },
    });

    expect(extractMatchPhraseValue(filter)).toBe('entity-123');
  });

  it('returns undefined for non-match_phrase filters', () => {
    const filter = createFilter({
      bool: { should: [{ term: { field: 'value' } }] },
    });

    expect(extractMatchPhraseValue(filter)).toBeUndefined();
  });

  it('returns undefined for empty filter', () => {
    const filter = createFilter(undefined);

    expect(extractMatchPhraseValue(filter)).toBeUndefined();
  });

  it('extracts value only from specified field when field param is provided', () => {
    const filter = createFilter({
      match_phrase: { 'entity.EngineMetadata.Type': { query: 'user' } },
    });

    expect(extractMatchPhraseValue(filter, ENTITY_FIELDS.RESOLVED_TO)).toBeUndefined();
    expect(extractMatchPhraseValue(filter, 'entity.EngineMetadata.Type')).toBe('user');
  });
});

describe('buildResolutionGroupFilter', () => {
  it('builds bool/should from match_phrase filters', () => {
    const filters = [
      createFilter({
        match_phrase: { [ENTITY_FIELDS.RESOLVED_TO]: { query: 'target-entity' } },
      }),
    ];

    const result = buildResolutionGroupFilter(filters);

    expect(result).toEqual([
      {
        bool: {
          should: [
            { term: { [ENTITY_FIELDS.ENTITY_ID]: 'target-entity' } },
            { term: { [ENTITY_FIELDS.RESOLVED_TO]: 'target-entity' } },
          ],
          minimum_should_match: 1,
        },
      },
    ]);
  });

  it('returns undefined when no match_phrase filters exist', () => {
    const filters = [
      createFilter({
        bool: { should: [{ term: { field: 'value' } }] },
      }),
    ];

    expect(buildResolutionGroupFilter(filters)).toBeUndefined();
  });

  it('returns undefined for empty filter array', () => {
    expect(buildResolutionGroupFilter([])).toBeUndefined();
  });

  it('ignores non-resolution match_phrase filters', () => {
    const filters = [
      createFilter({
        match_phrase: { 'entity.EngineMetadata.Type': { query: 'user' } },
      }),
    ];

    expect(buildResolutionGroupFilter(filters)).toBeUndefined();
  });

  it('uses first match_phrase value when multiple filters present', () => {
    const filters = [
      createFilter({
        match_phrase: { [ENTITY_FIELDS.RESOLVED_TO]: { query: 'first-entity' } },
      }),
      createFilter({
        match_phrase: { [ENTITY_FIELDS.RESOLVED_TO]: { query: 'second-entity' } },
      }),
    ];

    const result = buildResolutionGroupFilter(filters);

    expect(result?.[0].bool.should).toEqual(
      expect.arrayContaining([{ term: { [ENTITY_FIELDS.ENTITY_ID]: 'first-entity' } }])
    );
  });
});

describe('groupFilterMap', () => {
  it('passes through match_phrase filters', () => {
    const filter = createFilter({
      match_phrase: { field: { query: 'value' } },
    });

    expect(groupFilterMap(filter)).toBe(filter);
  });

  it('passes through bool/should filters', () => {
    const filter = createFilter({
      bool: { should: [{ term: { field: 'value' } }] },
    });

    expect(groupFilterMap(filter)).toBe(filter);
  });

  it('passes through bool/filter filters', () => {
    const filter = createFilter({
      bool: { filter: [{ term: { field: 'value' } }] },
    });

    expect(groupFilterMap(filter)).toBe(filter);
  });

  it('passes through any filter with a query', () => {
    const filter = createFilter({
      term: { field: 'value' },
    });

    expect(groupFilterMap(filter)).toBe(filter);
  });

  it('returns null for null input', () => {
    expect(groupFilterMap(null)).toBeNull();
  });

  it('returns null for filter without query', () => {
    expect(groupFilterMap({ meta: {} } as Filter)).toBeNull();
  });
});

describe('resolution filter pipeline regression', () => {
  const resolutionMatchPhraseFilter = createFilter({
    match_phrase: {
      [ENTITY_FIELDS.RESOLVED_TO]: { query: 'target-entity-id' },
    },
  });

  it('buildResolutionGroupFilter works with raw match_phrase filters', () => {
    const rawFilters = [resolutionMatchPhraseFilter]
      .map(groupFilterMap)
      .filter(Boolean) as Filter[];

    const result = buildResolutionGroupFilter(rawFilters);

    expect(result).toBeDefined();
    expect(result?.[0].bool.should).toHaveLength(2);
  });

  it('buildResolutionGroupFilter returns undefined after transformResolutionFilter (regression scenario)', () => {
    // This test documents the regression: applying transformResolutionFilter
    // before buildResolutionGroupFilter removes the match_phrase that
    // buildResolutionGroupFilter needs, causing it to return undefined (no filters).
    const transformedFilters = [resolutionMatchPhraseFilter]
      .map(transformResolutionFilter)
      .map(groupFilterMap)
      .filter(Boolean) as Filter[];

    const result = buildResolutionGroupFilter(transformedFilters);

    // After transformation, match_phrase is gone → buildResolutionGroupFilter can't find it
    expect(result).toBeUndefined();
  });

  it('buildResolutionGroupFilter preserves non-resolution filters from parent groups', () => {
    // When resolution is leaf in Entity Type > Resolution, the parent entity type
    // filter must be preserved alongside the resolution bool query.
    const entityTypeFilter = createFilter({
      match_phrase: { 'entity.EngineMetadata.Type': { query: 'user' } },
    });
    const rawFilters = [resolutionMatchPhraseFilter, entityTypeFilter]
      .map(groupFilterMap)
      .filter(Boolean) as Filter[];

    const resolutionQueryFilter = buildResolutionGroupFilter(rawFilters);

    // Resolution query is present
    expect(resolutionQueryFilter).toBeDefined();
    expect(resolutionQueryFilter?.[0].bool.should).toHaveLength(2);

    // Entity type filter is NOT included in resolutionQueryFilter — it must be
    // preserved separately by the caller (DataTableWithLocalPagination)
    const nonResolutionFilters = rawFilters.filter(
      (f) => !f?.query?.match_phrase?.[ENTITY_FIELDS.RESOLVED_TO]
    );
    expect(nonResolutionFilters).toHaveLength(1);
    expect(nonResolutionFilters[0].query).toEqual({
      match_phrase: { 'entity.EngineMetadata.Type': { query: 'user' } },
    });
  });

  it('transformResolutionFilter is safe to apply to already-transformed filters (idempotent for non-match_phrase)', () => {
    // When resolution is a parent group level and entity type is the leaf,
    // transformResolutionFilter may see already-transformed bool/should filters.
    // It should pass them through unchanged.
    const alreadyTransformed = transformResolutionFilter(resolutionMatchPhraseFilter);
    const doubleTransformed = transformResolutionFilter(alreadyTransformed);

    expect(doubleTransformed).toBe(alreadyTransformed);
  });
});
