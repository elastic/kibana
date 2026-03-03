/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, FilterStateStore } from '@kbn/es-query';
import { rewriteFilterForSloSummary, rewriteFiltersForSloSummary } from './rewrite_slo_filters';

const makeFilter = (key: string, query: Record<string, unknown>, negate = false): Filter => ({
  $state: { store: 'appState' as FilterStateStore },
  meta: { key, negate, disabled: false },
  query,
});

describe('rewriteFiltersForSloSummary', () => {
  describe('rewrites non-native fields to slo.groupings.*', () => {
    it('rewrites orchestrator.cluster.name in a match_phrase filter', () => {
      const filter = makeFilter('orchestrator.cluster.name', {
        match_phrase: { 'orchestrator.cluster.name': 'prod-cluster' },
      });
      const result = rewriteFilterForSloSummary(filter);
      expect(result.meta.key).toBe('slo.groupings.orchestrator.cluster.name');
      expect(result.query).toEqual({
        match_phrase: { 'slo.groupings.orchestrator.cluster.name': 'prod-cluster' },
      });
    });

    it('rewrites k8s.cluster.name in a term filter', () => {
      const filter = makeFilter('k8s.cluster.name', {
        term: { 'k8s.cluster.name': 'staging' },
      });
      const result = rewriteFilterForSloSummary(filter);
      expect(result.meta.key).toBe('slo.groupings.k8s.cluster.name');
      expect(result.query).toEqual({
        term: { 'slo.groupings.k8s.cluster.name': 'staging' },
      });
    });

    it('rewrites host.name in a term filter', () => {
      const filter = makeFilter('host.name', {
        term: { 'host.name': 'web-01' },
      });
      const result = rewriteFilterForSloSummary(filter);
      expect(result.meta.key).toBe('slo.groupings.host.name');
      expect(result.query).toEqual({
        term: { 'slo.groupings.host.name': 'web-01' },
      });
    });

    it('rewrites an exists filter', () => {
      const filter = makeFilter('orchestrator.cluster.name', {
        exists: { field: 'orchestrator.cluster.name' },
      });
      const result = rewriteFilterForSloSummary(filter);
      expect(result.meta.key).toBe('slo.groupings.orchestrator.cluster.name');
      expect(result.query).toEqual({
        exists: { field: 'slo.groupings.orchestrator.cluster.name' },
      });
    });

    it('rewrites fields inside a nested bool query', () => {
      const filter = makeFilter('orchestrator.cluster.name', {
        bool: {
          should: [
            { match_phrase: { 'orchestrator.cluster.name': 'prod' } },
            { match_phrase: { 'orchestrator.cluster.name': 'staging' } },
          ],
          minimum_should_match: 1,
        },
      });
      const result = rewriteFilterForSloSummary(filter);
      expect(result.meta.key).toBe('slo.groupings.orchestrator.cluster.name');
      expect(result.query).toEqual({
        bool: {
          should: [
            { match_phrase: { 'slo.groupings.orchestrator.cluster.name': 'prod' } },
            { match_phrase: { 'slo.groupings.orchestrator.cluster.name': 'staging' } },
          ],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('leaves native summary fields unchanged', () => {
    it('leaves status unchanged', () => {
      const filter = makeFilter('status', { term: { status: 'VIOLATED' } });
      const result = rewriteFilterForSloSummary(filter);
      expect(result.meta.key).toBe('status');
      expect(result.query).toEqual({ term: { status: 'VIOLATED' } });
    });

    it('leaves slo.tags unchanged', () => {
      const filter = makeFilter('slo.tags', { term: { 'slo.tags': 'production' } });
      const result = rewriteFilterForSloSummary(filter);
      expect(result.meta.key).toBe('slo.tags');
      expect(result.query).toEqual({ term: { 'slo.tags': 'production' } });
    });

    it('leaves service.name unchanged', () => {
      const filter = makeFilter('service.name', { term: { 'service.name': 'my-svc' } });
      const result = rewriteFilterForSloSummary(filter);
      expect(result.meta.key).toBe('service.name');
      expect(result.query).toEqual({ term: { 'service.name': 'my-svc' } });
    });

    it('leaves all summary mapping top-level fields unchanged', () => {
      const nativeLeafFields = ['sliValue', 'statusCode', 'status', 'spaceId', 'isTempDoc'];
      const nativeNestedFields = [
        'slo.name',
        'service.environment',
        'transaction.type',
        'monitor.id',
        'observer.geo.name',
        'fiveMinuteBurnRate.value',
        'oneHourBurnRate.goodEvents',
        'oneDayBurnRate.totalEvents',
        'errorBudgetInitial',
      ];

      for (const field of [...nativeLeafFields, ...nativeNestedFields]) {
        const filter = makeFilter(field, { term: { [field]: 'val' } });
        const result = rewriteFilterForSloSummary(filter);
        expect(result.meta.key).toBe(field);
        expect(result.query).toEqual({ term: { [field]: 'val' } });
      }
    });
  });

  describe('edge cases', () => {
    it('rewrites subpaths of native leaf fields (e.g. status.reason)', () => {
      const filter = makeFilter('status.reason', { term: { 'status.reason': 'timeout' } });
      const result = rewriteFilterForSloSummary(filter);
      expect(result.meta.key).toBe('slo.groupings.status.reason');
      expect(result.query).toEqual({ term: { 'slo.groupings.status.reason': 'timeout' } });
    });

    it('does not double-prefix slo.groupings.* fields', () => {
      const filter = makeFilter('slo.groupings.region', {
        term: { 'slo.groupings.region': 'us-east-1' },
      });
      const result = rewriteFilterForSloSummary(filter);
      expect(result.meta.key).toBe('slo.groupings.region');
      expect(result.query).toEqual({ term: { 'slo.groupings.region': 'us-east-1' } });
    });

    it('returns filter as-is when meta.key is undefined', () => {
      const filter: Filter = {
        meta: { disabled: false },
        query: { match_all: {} },
      };
      expect(rewriteFilterForSloSummary(filter)).toBe(filter);
    });

    it('handles filter with no query property', () => {
      const filter = makeFilter('orchestrator.cluster.name', undefined as any);
      const result = rewriteFilterForSloSummary(filter);
      expect(result.meta.key).toBe('slo.groupings.orchestrator.cluster.name');
      expect(result.query).toBeUndefined();
    });
  });

  describe('rewriteFiltersForSloSummary (batch)', () => {
    it('rewrites an array of mixed filters', () => {
      const filters = [
        makeFilter('orchestrator.cluster.name', {
          match_phrase: { 'orchestrator.cluster.name': 'prod' },
        }),
        makeFilter('status', { term: { status: 'HEALTHY' } }),
        makeFilter('host.name', { term: { 'host.name': 'web-01' } }),
      ];
      const results = rewriteFiltersForSloSummary(filters);
      expect(results[0].meta.key).toBe('slo.groupings.orchestrator.cluster.name');
      expect(results[1].meta.key).toBe('status');
      expect(results[2].meta.key).toBe('slo.groupings.host.name');
    });
  });
});
