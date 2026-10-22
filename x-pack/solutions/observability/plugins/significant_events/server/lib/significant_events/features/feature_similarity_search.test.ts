/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import { findSimilarFeatures } from './feature_similarity_search';

const makeFeature = (overrides: Partial<Feature> & Pick<Feature, 'id' | 'source_id'>): Feature => ({
  uuid: `${overrides.source_id}:${overrides.id}`,
  type: 'technology',
  description: 'desc',
  properties: {},
  confidence: 50,
  ...overrides,
});

const args = {
  candidate_id: 'redis',
  title: 'Redis',
  description: 'cache',
  type: 'technology' as const,
};

const SLUGS: Record<string, string> = {
  'id-logs': 'logs',
  'id-payments': 'payments',
  'id-checkout': 'checkout',
  'id-cart': 'cart',
};

const search = (
  hits: Feature[],
  currentSourceId = 'id-checkout',
  holders: Map<string, string[]> = new Map()
) =>
  findSimilarFeatures({
    kiClient: {
      findFeaturesAcrossSources: jest.fn().mockResolvedValue({ hits }),
      getFeatureSourcesBySlug: jest.fn().mockResolvedValue(holders),
    },
    sourceIds: Object.keys(SLUGS),
    currentSourceId,
    getSourceSlug: (id) => SLUGS[id],
    args,
  });

describe('findSimilarFeatures', () => {
  it('skips the holder lookup without matches', async () => {
    const findFeaturesAcrossSources = jest.fn().mockResolvedValue({ hits: [] });
    const getFeatureSourcesBySlug = jest.fn();

    await findSimilarFeatures({
      kiClient: { findFeaturesAcrossSources, getFeatureSourcesBySlug },
      sourceIds: ['id-logs'],
      currentSourceId: 'id-logs',
      getSourceSlug: (id) => id,
      args,
    });

    expect(getFeatureSourcesBySlug).not.toHaveBeenCalled();
  });

  it('searches without a per-copy limit', async () => {
    const findFeaturesAcrossSources = jest.fn().mockResolvedValue({ hits: [] });

    await findSimilarFeatures({
      kiClient: { findFeaturesAcrossSources, getFeatureSourcesBySlug: jest.fn() },
      sourceIds: ['id-logs'],
      currentSourceId: 'id-logs',
      getSourceSlug: (id) => id,
      args,
    });

    expect(findFeaturesAcrossSources).toHaveBeenCalledWith(['id-logs'], 'redis Redis cache', {
      featureType: 'technology',
      searchMode: 'semantic',
    });
  });

  it('completes sources from the exact slug lookup', async () => {
    const result = await search(
      [makeFeature({ id: 'redis', source_id: 'id-cart' })],
      'id-checkout',
      new Map([['redis', ['id-logs', 'id-payments', 'id-cart']]])
    );

    expect(result[0].sources).toEqual(['cart', 'logs', 'payments']);
  });

  it('collapses copies of a slug into one hit listing every source', async () => {
    const result = await search([
      makeFeature({ id: 'redis', source_id: 'id-cart', confidence: 60 }),
      makeFeature({
        id: 'Redis',
        source_id: 'id-logs',
        confidence: 90,
        subtype: 'cache',
        properties: { technology: 'redis' },
      }),
      makeFeature({ id: 'redis', source_id: 'id-payments', confidence: 70 }),
    ]);

    expect(result).toEqual([
      {
        id: 'Redis',
        title: 'Redis',
        description: 'desc',
        type: 'technology',
        subtype: 'cache',
        properties: { technology: 'redis' },
        confidence: 90,
        sources: ['cart', 'logs', 'payments'],
      },
    ]);
  });

  it('collapses before windowing', async () => {
    const duplicates = Object.keys(SLUGS).map((sourceId) =>
      makeFeature({ id: 'redis', source_id: sourceId })
    );
    const distinct = ['memcached', 'varnish', 'etcd', 'consul', 'nats'].map((id) =>
      makeFeature({ id, source_id: 'id-logs' })
    );
    const result = await search([...duplicates, ...distinct]);

    expect(result.map(({ id }) => id)).toEqual(['redis', 'memcached', 'varnish', 'etcd', 'consul']);
  });

  it('prefers the current source on a confidence tie, then the latest update', async () => {
    const local = await search([
      makeFeature({ id: 'redis', source_id: 'id-cart', title: 'other' }),
      makeFeature({ id: 'redis', source_id: 'id-checkout', title: 'current' }),
    ]);
    expect(local[0].title).toBe('current');

    const recent = await search([
      makeFeature({
        id: 'redis',
        source_id: 'id-cart',
        title: 'old',
        updated_at: '2026-01-01T00:00:00.000Z',
      }),
      makeFeature({
        id: 'redis',
        source_id: 'id-payments',
        title: 'new',
        updated_at: '2026-03-01T00:00:00.000Z',
      }),
    ]);
    expect(recent[0].title).toBe('new');
  });
});
