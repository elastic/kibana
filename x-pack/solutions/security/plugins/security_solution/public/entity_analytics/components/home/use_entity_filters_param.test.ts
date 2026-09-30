/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { getEntityFilterESQL, useEntityFiltersParam } from './use_entity_filters_param';
import { toBucketMap } from './entity_filters_bar';
import type { AggregationsStringTermsAggregate } from '@elastic/elasticsearch/lib/api/types';
import { EntityType } from '../../../../common/entity_analytics/types';

// ─── toBucketMap ────────────────────────────────────────────────────────────

describe('toBucketMap', () => {
  it('returns an empty object when the input is undefined', () => {
    expect(toBucketMap(undefined)).toEqual({});
  });

  it('returns an empty object when buckets is not an array (e.g. shard error response)', () => {
    const raw = { buckets: {} } as unknown as AggregationsStringTermsAggregate;
    expect(toBucketMap(raw)).toEqual({});
  });

  it('returns a map of value to count for each bucket', () => {
    const raw: AggregationsStringTermsAggregate = {
      buckets: [
        { key: 'Critical', doc_count: 5 },
        { key: 'High', doc_count: 3 },
      ],
    };
    expect(toBucketMap(raw)).toEqual({ Critical: 5, High: 3 });
  });
});

// ─── useEntityFiltersParam ────────────────────────────────────────────────────────

const makeWrapper = (initialSearch = '') => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, { initialEntries: [`/${initialSearch}`] }, children);
  return { wrapper };
};

describe('useEntityFiltersParam', () => {
  describe('reading and writing filters to the URL', () => {
    it('starts with all filters empty when the URL has no params', () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useEntityFiltersParam(), { wrapper });
      expect(result.current.entityFilters).toEqual({
        entityTypes: [],
        riskLevels: [],
        assetCriticality: [],
        watchlists: [],
        dataSources: [],
      });
    });

    it('picks up filters that are already in the URL', () => {
      const { wrapper } = makeWrapper('?entityTypes=host,user&riskLevels=Critical');
      const { result } = renderHook(() => useEntityFiltersParam(), { wrapper });
      expect(result.current.entityFilters.entityTypes).toEqual(['host', 'user']);
      expect(result.current.entityFilters.riskLevels).toEqual(['Critical']);
    });

    it('selecting a filter updates the URL and the returned filter state', () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useEntityFiltersParam(), { wrapper });

      act(() => {
        result.current.setEntityFilters({
          entityTypes: [EntityType.host],
          riskLevels: ['High'],
          assetCriticality: [],
          watchlists: [],
          dataSources: [],
        });
      });

      expect(result.current.entityFilters.entityTypes).toEqual([EntityType.host]);
      expect(result.current.entityFilters.riskLevels).toEqual(['High']);
    });

    it('silently drops invalid values for closed-set filters', () => {
      const { wrapper } = makeWrapper('?entityTypes=host,unsupported&riskLevels=Critical,bogus');
      const { result } = renderHook(() => useEntityFiltersParam(), { wrapper });
      expect(result.current.entityFilters.entityTypes).toEqual(['host']);
      expect(result.current.entityFilters.riskLevels).toEqual(['Critical']);
    });

    it('clearing a filter removes its key from the URL', () => {
      const { wrapper } = makeWrapper('?entityTypes=host');
      const { result } = renderHook(() => useEntityFiltersParam(), { wrapper });

      act(() => {
        result.current.setEntityFilters({
          entityTypes: [],
          riskLevels: [],
          assetCriticality: [],
          watchlists: [],
          dataSources: [],
        });
      });

      expect(result.current.entityFilters.entityTypes).toEqual([]);
    });
  });
});

describe('getEntityFilterESQL', () => {
  it('escapes quotes and backslashes so URL-derived values stay one string literal', () => {
    const clauses = getEntityFilterESQL({
      entityTypes: [],
      riskLevels: [],
      assetCriticality: [],
      watchlists: [],
      dataSources: ['a" OR true OR "', 'x\\y'],
    });
    expect(clauses).toHaveLength(1);
    expect(clauses[0]).toBe(
      '| WHERE MV_CONTAINS(entity.source, "a\\" OR true OR \\"") OR MV_CONTAINS(entity.source, "x\\\\y")'
    );
  });

  it('uses MV_CONTAINS for watchlists and dataSources (multi-value fields)', () => {
    const clauses = getEntityFilterESQL({
      entityTypes: [],
      riskLevels: [],
      assetCriticality: [],
      watchlists: ['my-watchlist'],
      dataSources: [],
    });
    expect(clauses).toHaveLength(1);
    expect(clauses[0]).toBe('| WHERE MV_CONTAINS(entity.attributes.watchlists, "my-watchlist")');
  });

  it('uses IN for scalar fields like entityTypes', () => {
    const clauses = getEntityFilterESQL({
      entityTypes: ['host', 'user'],
      riskLevels: [],
      assetCriticality: [],
      watchlists: [],
      dataSources: [],
    });
    expect(clauses).toHaveLength(1);
    expect(clauses[0]).toBe('| WHERE entity.EngineMetadata.Type IN ("host", "user")');
  });
});
