/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildCompositeAggQueryBase,
  buildBucketUserFilter,
  buildAccessEsqlQuery,
} from './shared_query_utils';
import { COMPOSITE_PAGE_SIZE, LOOKBACK_WINDOW } from '../constants';
import type { CompositeAfterKey, CompositeBucket } from '../types';

describe('buildCompositeAggQueryBase', () => {
  const sampleFilters = [{ term: { 'event.action': 'test' } }];

  describe('afterKey handling', () => {
    it('does not include "after" when no afterKey is provided', () => {
      const query = buildCompositeAggQueryBase(sampleFilters);
      expect(query.aggs.users.composite).not.toHaveProperty('after');
    });

    it('does not include "after" when afterKey is undefined', () => {
      const query = buildCompositeAggQueryBase(sampleFilters, undefined);
      expect(query.aggs.users.composite).not.toHaveProperty('after');
    });

    it('includes "after" when afterKey is provided', () => {
      const afterKey: CompositeAfterKey = { 'user.id': 'user-42', 'user.name': null };
      const query = buildCompositeAggQueryBase(sampleFilters, afterKey);
      expect(query.aggs.users.composite.after).toEqual(afterKey);
    });
  });

  describe('query structure', () => {
    it('uses the configured COMPOSITE_PAGE_SIZE', () => {
      const query = buildCompositeAggQueryBase(sampleFilters);
      expect(query.aggs.users.composite.size).toBe(COMPOSITE_PAGE_SIZE);
    });

    it('uses LOOKBACK_WINDOW in the timestamp range filter', () => {
      const query = buildCompositeAggQueryBase(sampleFilters);
      const filters = query.query.bool.filter;
      const rangeFilter = filters.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (f: any) => f.range?.['@timestamp']
      );
      expect(rangeFilter).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((rangeFilter as any).range['@timestamp'].gte).toBe(LOOKBACK_WINDOW);
    });

    it('sets size to 0 (no hits, aggregations only)', () => {
      const query = buildCompositeAggQueryBase(sampleFilters);
      expect(query.size).toBe(0);
    });

    it('includes the integration-specific filters', () => {
      const query = buildCompositeAggQueryBase(sampleFilters);
      expect(query.query.bool.filter).toContainEqual({ term: { 'event.action': 'test' } });
    });

    it('always filters for successful outcomes', () => {
      const query = buildCompositeAggQueryBase(sampleFilters);
      expect(query.query.bool.filter).toContainEqual({ term: { 'event.outcome': 'success' } });
    });

    it('generates at least one composite source with missing_bucket: true', () => {
      const query = buildCompositeAggQueryBase(sampleFilters);
      const sources = query.aggs.users.composite.sources;
      expect(sources.length).toBeGreaterThan(0);
      for (const source of sources) {
        const fieldName = Object.keys(source)[0];
        expect(source[fieldName].terms.missing_bucket).toBe(true);
      }
    });
  });
});

describe('buildBucketUserFilter', () => {
  it('returns a bool should filter with minimum_should_match: 1', () => {
    const buckets: CompositeBucket[] = [
      { key: { 'user.id': 'u1', 'user.name': 'alice' }, doc_count: 1 },
    ];
    const filter = buildBucketUserFilter(buckets);
    expect(filter!.bool!.minimum_should_match).toBe(1);
    expect(filter!.bool!.should).toBeDefined();
  });

  it('collects distinct values per field across multiple buckets', () => {
    const buckets: CompositeBucket[] = [
      { key: { 'user.id': 'u1', 'user.name': 'alice' }, doc_count: 1 },
      { key: { 'user.id': 'u2', 'user.name': 'bob' }, doc_count: 2 },
      { key: { 'user.id': 'u1', 'user.name': 'charlie' }, doc_count: 1 },
    ];
    const filter = buildBucketUserFilter(buckets);
    const should = filter!.bool!.should as Array<{ terms: Record<string, string[]> }>;

    const userIdClause = should.find((s) => s.terms['user.id']);
    const userNameClause = should.find((s) => s.terms['user.name']);

    expect(userIdClause?.terms['user.id']).toHaveLength(2);
    expect(userIdClause?.terms['user.id']).toEqual(expect.arrayContaining(['u1', 'u2']));

    expect(userNameClause?.terms['user.name']).toHaveLength(3);
    expect(userNameClause?.terms['user.name']).toEqual(
      expect.arrayContaining(['alice', 'bob', 'charlie'])
    );
  });

  it('skips null values in bucket keys', () => {
    const buckets: CompositeBucket[] = [
      { key: { 'user.id': 'u1', 'user.name': null }, doc_count: 1 },
    ];
    const filter = buildBucketUserFilter(buckets);
    const should = filter!.bool!.should as Array<{ terms: Record<string, string[]> }>;

    const userNameClause = should.find((s) => s.terms['user.name']);
    expect(userNameClause).toBeUndefined();
  });

  it('returns empty should array for empty buckets', () => {
    const filter = buildBucketUserFilter([]);
    expect(filter!.bool!.should).toEqual([]);
  });

  it('deduplicates values within the same field', () => {
    const buckets: CompositeBucket[] = [
      { key: { 'user.id': 'u1' }, doc_count: 1 },
      { key: { 'user.id': 'u1' }, doc_count: 2 },
      { key: { 'user.id': 'u1' }, doc_count: 3 },
    ];
    const filter = buildBucketUserFilter(buckets);
    const should = filter!.bool!.should as Array<{ terms: Record<string, string[]> }>;
    const userIdClause = should.find((s) => s.terms['user.id']);
    expect(userIdClause?.terms['user.id']).toHaveLength(1);
  });
});

describe('buildAccessEsqlQuery', () => {
  const indexPattern = 'logs-test-default';
  const whereClause = 'event.action == "test_action"';

  it('uses the provided index pattern in FROM', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain(`FROM ${indexPattern}`);
  });

  it('includes the provided WHERE clause', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain('event.action == "test_action"');
  });

  it('filters for successful outcomes', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain('event.outcome == "success"');
  });

  it('computes entity.namespace via field evaluations', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain('entity.namespace');
  });

  it('contains user identity fields', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain('user.id');
    expect(query).toContain('user.name');
  });

  it('contains host identity fields', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain('host.id');
    expect(query).toContain('host.name');
  });

  it('computes actorUserId via EVAL', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain('EVAL actorUserId =');
  });

  it('computes targetEntityId with COALESCE fallback to host.ip and host.mac', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain('COALESCE(');
    expect(query).toContain('TO_STRING(host.ip)');
    expect(query).toContain('TO_STRING(host.mac)');
  });

  it('uses MV_EXPAND on targetEntityId', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain('MV_EXPAND targetEntityId');
  });

  it('uses access_count > 4 as the frequency threshold', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain('access_count >= 4');
  });

  it('classifies into accesses_frequently and accesses_infrequently', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain('"accesses_frequently"');
    expect(query).toContain('"accesses_infrequently"');
  });

  it('groups final output by actorUserId', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toMatch(/BY actorUserId$/m);
  });

  it('applies a LIMIT matching the composite page size', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toContain(`| LIMIT ${COMPOSITE_PAGE_SIZE}`);
  });

  it('includes SET unmapped_fields="nullify" before FROM to handle missing fields like entity.id on raw event indices', () => {
    const query = buildAccessEsqlQuery(indexPattern, whereClause);
    expect(query).toMatch(/^SET unmapped_fields="nullify";\nFROM/);
  });
});
