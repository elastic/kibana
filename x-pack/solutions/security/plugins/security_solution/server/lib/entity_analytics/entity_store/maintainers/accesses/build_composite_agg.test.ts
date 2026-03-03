/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCompositeAggQuery, buildBucketUserFilter } from './build_composite_agg';
import { COMPOSITE_PAGE_SIZE, LOOKBACK_WINDOW } from './constants';
import type { CompositeAfterKey, CompositeBucket } from './types';

describe('buildCompositeAggQuery', () => {
  describe('afterKey handling', () => {
    it('does not include "after" when no afterKey is provided', () => {
      const query = buildCompositeAggQuery();
      expect(query.aggs.users.composite).not.toHaveProperty('after');
    });

    it('does not include "after" when afterKey is undefined', () => {
      const query = buildCompositeAggQuery(undefined);
      expect(query.aggs.users.composite).not.toHaveProperty('after');
    });

    it('includes "after" when afterKey is provided', () => {
      const afterKey: CompositeAfterKey = { 'user.id': 'user-42', 'user.name': null };
      const query = buildCompositeAggQuery(afterKey);
      expect(query.aggs.users.composite.after).toEqual(afterKey);
    });
  });

  describe('query structure', () => {
    it('uses the configured COMPOSITE_PAGE_SIZE', () => {
      const query = buildCompositeAggQuery();
      expect(query.aggs.users.composite.size).toBe(COMPOSITE_PAGE_SIZE);
    });

    it('uses LOOKBACK_WINDOW in the timestamp range filter', () => {
      const query = buildCompositeAggQuery();
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
      const query = buildCompositeAggQuery();
      expect(query.size).toBe(0);
    });

    it('generates at least one composite source with missing_bucket: true', () => {
      const query = buildCompositeAggQuery();
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
