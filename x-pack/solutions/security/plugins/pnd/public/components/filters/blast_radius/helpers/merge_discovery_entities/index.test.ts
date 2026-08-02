/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndDiscoveryContext } from '@kbn/pnd-common';

import { mergeDiscoveryEntities } from '.';

const hostWeb1 = { count: 3, field: 'host.name', value: 'web-1' };
const hostWeb2 = { count: 1, field: 'host.name', value: 'web-2' };
const userRoot = { count: 2, field: 'user.name', value: 'root' };

const contexts: PndDiscoveryContext[] = [
  { correlationId: 'ad-1', entities: [hostWeb1, userRoot] },
  { correlationId: 'ad-2', entities: [hostWeb1, hostWeb2] },
];

describe('mergeDiscoveryEntities', () => {
  it('returns nothing when there are no contexts', () => {
    expect(mergeDiscoveryEntities([])).toEqual([]);
  });

  it('returns nothing when every context is empty', () => {
    expect(mergeDiscoveryEntities([{ correlationId: 'ad-1', entities: [] }])).toEqual([]);
  });

  /** A chip's count is how many constituent alerts carry the term, across every discovery. */
  it('sums the counts of the same field and value across discoveries', () => {
    const merged = mergeDiscoveryEntities(contexts);

    expect(merged.find(({ value }) => value === 'web-1')?.count).toEqual(6);
  });

  it('records every discovery that contributed an entity', () => {
    const merged = mergeDiscoveryEntities(contexts);

    expect(merged.find(({ value }) => value === 'web-1')?.correlationIds).toEqual(['ad-1', 'ad-2']);
  });

  it('records only the discovery that contributed a single-discovery entity', () => {
    const merged = mergeDiscoveryEntities(contexts);

    expect(merged.find(({ value }) => value === 'root')?.correlationIds).toEqual(['ad-1']);
  });

  /**
   * `host.name`/`web-1` and `user.name`/`web-1` are different entities. Merging on the value alone
   * would draw one chip that filtered the queue by two unrelated things.
   */
  it('keeps the same value on two fields as two entities', () => {
    const merged = mergeDiscoveryEntities([
      {
        correlationId: 'ad-1',
        entities: [
          { count: 1, field: 'host.name', value: 'web-1' },
          { count: 1, field: 'user.name', value: 'web-1' },
        ],
      },
    ]);

    expect(merged).toHaveLength(2);
  });

  it('carries the id the chip is keyed and filtered by', () => {
    const merged = mergeDiscoveryEntities([{ correlationId: 'ad-1', entities: [hostWeb1] }]);

    expect(merged[0]).toEqual({
      correlationIds: ['ad-1'],
      count: 3,
      field: 'host.name',
      id: 'host.name:web-1',
      value: 'web-1',
    });
  });

  /** Highest count first: the chip row leads with the entity the most alerts agree on. */
  it('orders entities by descending count', () => {
    const merged = mergeDiscoveryEntities(contexts);

    expect(merged.map(({ value }) => value)).toEqual(['web-1', 'root', 'web-2']);
  });

  it('breaks a count tie on the field, ascending', () => {
    const merged = mergeDiscoveryEntities([
      {
        correlationId: 'ad-1',
        entities: [
          { count: 1, field: 'user.name', value: 'root' },
          { count: 1, field: 'host.name', value: 'web-1' },
        ],
      },
    ]);

    expect(merged.map(({ field }) => field)).toEqual(['host.name', 'user.name']);
  });

  it('breaks a count and field tie on the value, ascending', () => {
    const merged = mergeDiscoveryEntities([
      {
        correlationId: 'ad-1',
        entities: [
          { count: 1, field: 'host.name', value: 'web-2' },
          { count: 1, field: 'host.name', value: 'web-1' },
        ],
      },
    ]);

    expect(merged.map(({ value }) => value)).toEqual(['web-1', 'web-2']);
  });

  /**
   * The response's own order is not significant, so the same set of contexts in another order is
   * the same blast radius — otherwise the chip row would reshuffle between two renders of
   * identical data.
   */
  it('is independent of the order the contexts arrived in', () => {
    expect(mergeDiscoveryEntities([...contexts].reverse())).toEqual(
      mergeDiscoveryEntities(contexts)
    );
  });

  it('leaves the contexts it was given untouched', () => {
    const original: PndDiscoveryContext[] = [
      { correlationId: 'ad-1', entities: [{ ...hostWeb1 }] },
    ];

    mergeDiscoveryEntities(original);

    expect(original).toEqual([{ correlationId: 'ad-1', entities: [hostWeb1] }]);
  });

  /** A risk score is annotation 5's business; the blast radius reads only the entities. */
  it('ignores the risk score', () => {
    const merged = mergeDiscoveryEntities([
      { correlationId: 'ad-1', entities: [hostWeb1], riskScore: 73 },
    ]);

    expect(merged.map(({ value }) => value)).toEqual(['web-1']);
  });
});
