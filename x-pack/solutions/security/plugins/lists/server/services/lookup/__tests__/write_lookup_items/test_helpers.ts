/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import { transformListItemToElasticQuery } from '../../../utils';
import type { CoalescedBound } from '../../coalesce_ranges';
import { coalesceBounds, coalesceRangeValues, parseValueToBound } from '../../coalesce_ranges';

export const TEST_INDEX = '.value-list-default-test';

export type EsClientMock = ReturnType<
  typeof elasticsearchClientMock.createScopedClusterClient
>['asCurrentUser'];

export const createEsClientMock = (): EsClientMock =>
  elasticsearchClientMock.createScopedClusterClient().asCurrentUser;

/** The request body of the nth `esClient.search` call (reads are paged over a PIT). */
export const searchArg = (
  esClient: EsClientMock,
  n: number
): { _source: string[]; query: unknown } => (esClient.search as jest.Mock).mock.calls[n][0];

// Mirror the production id helpers so tests can assert the exact document ids.
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
export const sourceId = (value: string): string => `src:${sha256(value)}`;
export const coalescedId = (bound: CoalescedBound): string =>
  sha256(`${bound.range_start}-${bound.range_end}`);

/** Build a search response body carrying the given docs, as the client returns it. */
export const searchResponse = <T>(
  docs: Array<{ _id: string; _source: T }>
): estypes.SearchResponse<T> => ({
  _shards: { failed: 0, successful: 1, total: 1 },
  hits: {
    hits: docs.map((doc) => ({ _id: doc._id, _index: TEST_INDEX, _source: doc._source })),
    max_score: null,
    total: { relation: 'eq', value: docs.length },
  },
  timed_out: false,
  took: 1,
});

/** A coalesced doc as stored/returned: bounds only, id derived from the bounds. */
export const coalescedDoc = (
  bound: CoalescedBound
): { _id: string; _source: { range_end: string; range_start: string } } => ({
  _id: coalescedId(bound),
  _source: { range_end: bound.range_end, range_start: bound.range_start },
});

/** A source doc as stored/returned for the localized delete window read. */
export const sourceBoundDoc = (
  bound: CoalescedBound
): { _id: string; _source: { src_end: string; src_start: string } } => ({
  _id: sourceId(`${bound.range_start}-${bound.range_end}`),
  _source: { src_end: bound.range_end, src_start: bound.range_start },
});

// ---- expected bulk operation builders (what the code should send to esClient.bulk) ----

export const expectedSourceOps = (type: Type, values: string[]): unknown[] =>
  values.flatMap((value) => {
    const bound = parseValueToBound(type, value);
    const doc =
      bound != null
        ? { kind: 'source', src_end: bound.range_end, src_start: bound.range_start, value }
        : { kind: 'source', value };
    return [{ index: { _id: sourceId(value) } }, doc];
  });

export const expectedIndexCoalescedOps = (bounds: CoalescedBound[]): unknown[] =>
  bounds.flatMap((bound) => [
    { index: { _id: coalescedId(bound) } },
    { kind: 'coalesced', range_end: bound.range_end, range_start: bound.range_start },
  ]);

export const expectedDeleteOps = (ids: string[]): unknown[] =>
  ids.map((id) => ({ delete: { _id: id } }));

export const equalityId = (value: string): string => sha256(value);

export const expectedEqualityOps = (type: Type, values: string[]): unknown[] =>
  values.flatMap((value) => {
    const serialized = transformListItemToElasticQuery({ type, value });
    if (serialized == null) return [];
    return [{ index: { _id: sha256(value) } }, { value: Object.values(serialized)[0] }];
  });

// ---- expected search queries (what the localized paths should target) ----

export const coalescedWindowQuery = (bound: CoalescedBound): { bool: { filter: unknown[] } } => ({
  bool: {
    filter: [
      { term: { kind: 'coalesced' } },
      { range: { range_start: { lte: bound.range_end } } },
      { range: { range_end: { gte: bound.range_start } } },
    ],
  },
});

export const sourceWindowQuery = (interval: CoalescedBound): { bool: { filter: unknown[] } } => ({
  bool: {
    filter: [
      { term: { kind: 'source' } },
      { range: { src_start: { lte: interval.range_end } } },
      { range: { src_end: { gte: interval.range_start } } },
    ],
  },
});

// ---- per-type fixtures. Expected coalescing is derived from the real functions,
// so these tests assert wiring (inputs -> ES ops), not the coalescing math itself
// (that lives in coalesce_ranges.test.ts). ----

export interface RangeFixture {
  type: Type;
  // one authored value and its parsed stored bounds
  single: string;
  singleBound: CoalescedBound;
  // an existing coalesced interval that the single value overlaps, and the merge
  overlapExisting: CoalescedBound;
  overlapMerged: CoalescedBound;
  // a batch of authored values and their coalesced projection
  batch: string[];
  batchCoalesced: CoalescedBound[];
  // a delete that fragments: the covered interval, the sources that remain, the result
  deleteBridge: string;
  deleteBridgeBound: CoalescedBound;
  deleteCovering: CoalescedBound;
  deleteRemaining: CoalescedBound[];
  deleteFragments: CoalescedBound[];
}

const bound = (type: Type, value: string): CoalescedBound => {
  const parsed = parseValueToBound(type, value);
  if (parsed == null) throw new Error(`fixture value does not parse: ${type} ${value}`);
  return parsed;
};

const makeFixture = (
  type: Type,
  opts: {
    single: string;
    overlapExisting: CoalescedBound;
    batch: string[];
    deleteBridge: string;
    deleteCovering: CoalescedBound;
    deleteRemaining: CoalescedBound[];
  }
): RangeFixture => {
  const singleBound = bound(type, opts.single);
  return {
    batch: opts.batch,
    batchCoalesced: coalesceRangeValues(type, opts.batch),
    deleteBridge: opts.deleteBridge,
    deleteBridgeBound: bound(type, opts.deleteBridge),
    deleteCovering: opts.deleteCovering,
    deleteFragments: coalesceBounds(type, opts.deleteRemaining),
    deleteRemaining: opts.deleteRemaining,
    overlapExisting: opts.overlapExisting,
    overlapMerged: coalesceBounds(type, [opts.overlapExisting, singleBound])[0],
    single: opts.single,
    singleBound,
    type,
  };
};

export const RANGE_FIXTURES: RangeFixture[] = [
  makeFixture('ip_range', {
    batch: ['10.0.0.0/24', '10.0.5.0/24'],
    deleteBridge: '10.0.0.200-10.0.2.50',
    deleteCovering: { range_end: '10.0.2.255', range_start: '10.0.0.0' },
    deleteRemaining: [
      { range_end: '10.0.0.255', range_start: '10.0.0.0' },
      { range_end: '10.0.2.255', range_start: '10.0.1.0' },
    ],
    overlapExisting: { range_end: '10.0.1.255', range_start: '10.0.0.128' },
    single: '10.0.0.0/24',
  }),
  makeFixture('date_range', {
    batch: [
      '2026-01-01T00:00:00.000Z,2026-01-31T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z,2026-06-30T00:00:00.000Z',
    ],
    deleteBridge: '2026-01-20T00:00:00.000Z,2026-02-20T00:00:00.000Z',
    deleteCovering: {
      range_end: '2026-03-31T00:00:00.000Z',
      range_start: '2026-01-01T00:00:00.000Z',
    },
    deleteRemaining: [
      { range_end: '2026-01-31T00:00:00.000Z', range_start: '2026-01-01T00:00:00.000Z' },
      { range_end: '2026-03-31T00:00:00.000Z', range_start: '2026-03-01T00:00:00.000Z' },
    ],
    overlapExisting: {
      range_end: '2026-02-15T00:00:00.000Z',
      range_start: '2026-01-15T00:00:00.000Z',
    },
    single: '2026-01-01T00:00:00.000Z,2026-01-31T00:00:00.000Z',
  }),
  makeFixture('integer_range', {
    batch: ['1-10', '5-20', '100-200'],
    deleteBridge: '20-80',
    deleteCovering: { range_end: '100', range_start: '1' },
    deleteRemaining: [
      { range_end: '10', range_start: '1' },
      { range_end: '100', range_start: '90' },
    ],
    overlapExisting: { range_end: '30', range_start: '15' },
    single: '10-20',
  }),
  makeFixture('long_range', {
    batch: ['1000-2000', '1500-3000'],
    deleteBridge: '2000-8000',
    deleteCovering: { range_end: '10000', range_start: '1000' },
    deleteRemaining: [
      { range_end: '1500', range_start: '1000' },
      { range_end: '10000', range_start: '9000' },
    ],
    overlapExisting: { range_end: '3000', range_start: '1500' },
    single: '1000-2000',
  }),
  makeFixture('float_range', {
    batch: ['1.5-2.5', '5.5-6.5'],
    deleteBridge: '2-8',
    deleteCovering: { range_end: '10', range_start: '1.5' },
    deleteRemaining: [
      { range_end: '2.5', range_start: '1.5' },
      { range_end: '10', range_start: '9' },
    ],
    overlapExisting: { range_end: '3', range_start: '2' },
    single: '1.5-2.5',
  }),
  makeFixture('double_range', {
    batch: ['10.5-20.5', '50.5-60.5'],
    deleteBridge: '20-80',
    deleteCovering: { range_end: '100.5', range_start: '10.5' },
    deleteRemaining: [
      { range_end: '20.5', range_start: '10.5' },
      { range_end: '100.5', range_start: '90.5' },
    ],
    overlapExisting: { range_end: '30', range_start: '20' },
    single: '10.5-20.5',
  }),
];
