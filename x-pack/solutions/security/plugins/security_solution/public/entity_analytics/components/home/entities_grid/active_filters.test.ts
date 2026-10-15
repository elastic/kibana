/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../../common/entity_analytics/types';
import { RiskSeverity } from '../../../../../common/search_strategy';
import type { ESBoolQuery } from '../../../../../common/typed_json';
import { toDsl, toEsql } from './active_filters';
import type { ActiveFilters } from './active_filters';
import { EMPTY_ENTITY_FILTERS } from './common';

const NONE: ActiveFilters = {
  search: {},
  entityFilters: EMPTY_ENTITY_FILTERS,
  tileEntityIds: null,
  rowsMode: 'resolved',
};

const SEARCH_DSL: ESBoolQuery = {
  bool: {
    filter: [{ match_phrase: { 'entity.name': 'web-1' } }],
    must: [],
    should: [],
    must_not: [],
  },
};

const ALL: ActiveFilters = {
  search: { esql: 'KQL("""entity.name: web-1""")', dsl: SEARCH_DSL },
  entityFilters: {
    ...EMPTY_ENTITY_FILTERS,
    entityTypes: [EntityType.host],
    watchlists: ['w1'],
  },
  tileEntityIds: ['host:a', 'host:b'],
  rowsMode: 'resolved',
};

const RESOLVED_ROWS_ONLY = {
  exists: { field: 'entity.relationships.resolution.resolved_to' },
};

describe('toEsql', () => {
  it('has no expressions without filters', () => {
    expect(toEsql(NONE)).toEqual({ searchExpression: undefined, entityExpression: undefined });
  });

  it('keeps the search apart and joins the dropdowns with the tile', () => {
    expect(toEsql(ALL)).toEqual({
      searchExpression: 'KQL("""entity.name: web-1""")',
      entityExpression:
        'entity.EngineMetadata.Type IN ("host") AND MV_CONTAINS(entity.attributes.watchlists, "w1") AND entity.id IN ("host:a", "host:b")',
    });
  });

  it('tests the risk level of a resolved entity on resolved rows, and the own level on individual rows', () => {
    const filters = {
      ...NONE,
      entityFilters: { ...EMPTY_ENTITY_FILTERS, riskLevels: [RiskSeverity.High] },
    };

    expect(toEsql(filters).entityExpression).toBe(
      '(entity.relationships.resolution.risk.calculated_level IN ("High") OR (entity.relationships.resolution.risk.calculated_level IS NULL AND entity.risk.calculated_level IN ("High")))'
    );
    expect(toEsql({ ...filters, rowsMode: 'individual' }).entityExpression).toBe(
      'entity.risk.calculated_level IN ("High")'
    );
  });

  it('keeps the tile entities and their records in individual rows', () => {
    expect(toEsql({ ...NONE, tileEntityIds: ['host:a'], rowsMode: 'individual' })).toEqual({
      searchExpression: undefined,
      entityExpression:
        '(entity.id IN ("host:a") OR entity.relationships.resolution.resolved_to IN ("host:a"))',
    });
  });

  it('matches nothing for a tile without entities', () => {
    expect(toEsql({ ...NONE, tileEntityIds: [] }).entityExpression).toBe('false');
  });
});

describe('toDsl', () => {
  it('keeps only targets for resolved rows, and nothing else without filters', () => {
    expect(toDsl(NONE)).toEqual({
      bool: { filter: [], must: [], must_not: [RESOLVED_ROWS_ONLY], should: [] },
    });
    expect(toDsl({ ...NONE, rowsMode: 'individual' })).toBeUndefined();
  });

  it('combines the search, the dropdowns and the tile', () => {
    expect(toDsl(ALL)).toEqual({
      bool: {
        filter: [
          SEARCH_DSL,
          { terms: { 'entity.EngineMetadata.Type': ['host'] } },
          { terms: { 'entity.attributes.watchlists': ['w1'] } },
          { terms: { 'entity.id': ['host:a', 'host:b'] } },
        ],
        must: [],
        must_not: [RESOLVED_ROWS_ONLY],
        should: [],
      },
    });
  });

  it('matches nothing for a tile without entities', () => {
    expect(toDsl({ ...NONE, tileEntityIds: [], rowsMode: 'individual' })).toEqual({
      bool: { filter: [{ match_none: {} }], must: [], must_not: [], should: [] },
    });
  });
});
