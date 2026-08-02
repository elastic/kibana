/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndDiscoveryContextBucket } from '.';
import { buildDiscoveryContexts } from '.';

const bucket = (overrides: Partial<PndDiscoveryContextBucket> = {}): PndDiscoveryContextBucket => ({
  destination_ip: { buckets: [] },
  doc_count: 1,
  host_name: { buckets: [] },
  max_risk_score: { value: 47 },
  source_ip: { buckets: [] },
  user_name: { buckets: [] },
  ...overrides,
});

describe('buildDiscoveryContexts', () => {
  it('keys each context on its Attack Discovery id', () => {
    expect(
      buildDiscoveryContexts({ buckets: { 'ad-1': bucket() } }).map((c) => c.correlationId)
    ).toEqual(['ad-1']);
  });

  it('projects a terms bucket onto an entity', () => {
    expect(
      buildDiscoveryContexts({
        buckets: { 'ad-1': bucket({ host_name: { buckets: [{ doc_count: 3, key: 'host-a' }] } }) },
      })[0].entities
    ).toEqual([{ count: 3, field: 'host.name', value: 'host-a' }]);
  });

  it('merges the entity terms of every aggregated field', () => {
    expect(
      buildDiscoveryContexts({
        buckets: {
          'ad-1': bucket({
            host_name: { buckets: [{ doc_count: 1, key: 'host-a' }] },
            user_name: { buckets: [{ doc_count: 1, key: 'user-a' }] },
          }),
        },
      })[0].entities.map(({ field }) => field)
    ).toEqual(['host.name', 'user.name']);
  });

  it('orders the entities by count, highest first', () => {
    expect(
      buildDiscoveryContexts({
        buckets: {
          'ad-1': bucket({
            host_name: { buckets: [{ doc_count: 1, key: 'host-a' }] },
            user_name: { buckets: [{ doc_count: 9, key: 'user-a' }] },
          }),
        },
      })[0].entities.map(({ count }) => count)
    ).toEqual([9, 1]);
  });

  /**
   * The chips render in the order they arrive, so a tie must not reshuffle between two reads of
   * the same data.
   */
  it('breaks a count tie deterministically, by field then value', () => {
    expect(
      buildDiscoveryContexts({
        buckets: {
          'ad-1': bucket({
            host_name: {
              buckets: [
                { doc_count: 2, key: 'host-b' },
                { doc_count: 2, key: 'host-a' },
              ],
            },
            user_name: { buckets: [{ doc_count: 2, key: 'user-a' }] },
          }),
        },
      })[0].entities.map(({ value }) => value)
    ).toEqual(['host-a', 'host-b', 'user-a']);
  });

  it('reports the max risk score of the constituent alerts (D5)', () => {
    expect(buildDiscoveryContexts({ buckets: { 'ad-1': bucket() } })[0].riskScore).toEqual(47);
  });

  /**
   * An absent score and a score of zero must not look the same downstream: the badge renders
   * nothing for the first and a `0` for the second.
   */
  it('omits the risk score entirely when the aggregation produced none', () => {
    expect(
      buildDiscoveryContexts({
        buckets: { 'ad-1': bucket({ max_risk_score: { value: null } }) },
      })[0]
    ).not.toHaveProperty('riskScore');
  });

  it('omits the risk score when the aggregation is absent altogether', () => {
    expect(
      buildDiscoveryContexts({
        buckets: { 'ad-1': bucket({ max_risk_score: undefined }) },
      })[0]
    ).not.toHaveProperty('riskScore');
  });

  it('keeps a genuine zero risk score', () => {
    expect(
      buildDiscoveryContexts({ buckets: { 'ad-1': bucket({ max_risk_score: { value: 0 } }) } })[0]
        .riskScore
    ).toEqual(0);
  });

  /**
   * Zero matching alerts means the constituent alerts are gone or unreadable, which the contract
   * represents as no entry — not as an entry claiming an empty blast radius and no score.
   */
  it('omits a discovery whose constituent alerts matched nothing', () => {
    expect(buildDiscoveryContexts({ buckets: { 'ad-1': bucket({ doc_count: 0 }) } })).toEqual([]);
  });

  it('returns nothing for an empty aggregation', () => {
    expect(buildDiscoveryContexts({ buckets: {} })).toEqual([]);
  });
});
