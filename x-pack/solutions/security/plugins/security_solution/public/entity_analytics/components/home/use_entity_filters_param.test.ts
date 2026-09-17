/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useEntityFiltersParam, getEntityFilterTerms } from './use_entity_filters_param';
import { toBucketMap } from './entity_filters_bar';
import type { AggregationsStringTermsAggregate } from '@elastic/elasticsearch/lib/api/types';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { RiskSeverity } from '../../../../common/search_strategy';

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
          riskLevels: ['High' as RiskSeverity],
          assetCriticality: [],
          watchlists: [],
          dataSources: [],
        });
      });

      expect(result.current.entityFilters.entityTypes).toEqual([EntityType.host]);
      expect(result.current.entityFilters.riskLevels).toEqual(['High']);
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

describe('getEntityFilterTerms', () => {
  const empty = {
    entityTypes: [],
    riskLevels: [],
    assetCriticality: [],
    watchlists: [],
    dataSources: [],
  };

  it('returns empty array when no filters selected', () => {
    expect(getEntityFilterTerms(empty)).toEqual([]);
  });

  it('returns a terms clause for each active filter', () => {
    expect(
      getEntityFilterTerms({
        ...empty,
        riskLevels: ['Critical' as RiskSeverity],
        entityTypes: [EntityType.host],
      })
    ).toEqual(
      expect.arrayContaining([
        { terms: { 'entity.risk.calculated_level': ['Critical'] } },
        { terms: { 'entity.EngineMetadata.Type': ['host'] } },
      ])
    );
  });

  it('omits clauses for filters with no selection', () => {
    const result = getEntityFilterTerms({ ...empty, riskLevels: ['High' as RiskSeverity] });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ terms: { 'entity.risk.calculated_level': ['High'] } });
  });
});
