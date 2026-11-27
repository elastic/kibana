/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Feature } from '@kbn/significant-events-schema';
import { TopologySnapshotClient } from './topology_snapshot_client';
import { buildTopologySnapshot } from './build_topology_snapshot';

const BUILT_AT = '2026-10-21T10:00:00.000Z';

const feature = (overrides: Partial<Feature> & Pick<Feature, 'id' | 'type'>): Feature => ({
  uuid: `${overrides.source_id ?? 'src-a'}:${overrides.id}`,
  source_id: 'src-a',
  description: overrides.id,
  properties: {},
  confidence: 80,
  ...overrides,
});

const inputFeatures: Feature[] = [
  feature({ id: 'checkout', type: 'entity', properties: { name: 'checkout' } }),
  feature({ id: 'orders-db', type: 'entity', properties: { name: 'orders-db' } }),
  feature({
    id: 'checkout-orders',
    type: 'dependency',
    properties: { source: 'checkout', target: 'orders-db' },
  }),
];

function makeClient(
  pages: Array<{
    hits: Feature[];
    nextCursor?: { sourceId: string; type: string; id: string };
  }> = [{ hits: inputFeatures }]
) {
  const getTopologyFeaturesPage = jest.fn();
  for (const page of pages) {
    getTopologyFeaturesPage.mockResolvedValueOnce(page);
  }
  const logger = loggerMock.create();
  const client = new TopologySnapshotClient({
    reader: { getTopologyFeaturesPage },
    logger,
    now: () => new Date(BUILT_AT),
  });
  return { client, getTopologyFeaturesPage, logger };
}

describe('TopologySnapshotClient', () => {
  it('reads every page at one point in time', async () => {
    const cursor = { sourceId: 'src-a', type: 'feature', id: inputFeatures[0].uuid };
    const { client, getTopologyFeaturesPage } = makeClient([
      { hits: inputFeatures.slice(0, 1), nextCursor: cursor },
      { hits: inputFeatures.slice(1) },
    ]);

    const snapshot = await client.get(['src-a', 'src-b']);

    expect(getTopologyFeaturesPage).toHaveBeenNthCalledWith(1, {
      sourceIds: ['src-a', 'src-b'],
      featureTypes: ['entity', 'dependency'],
      asOf: BUILT_AT,
      after: undefined,
      size: 5_000,
    });
    expect(getTopologyFeaturesPage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ after: cursor, asOf: BUILT_AT })
    );
    expect(snapshot).toEqual(
      buildTopologySnapshot({
        features: inputFeatures,
        sourceIds: ['src-a', 'src-b'],
        builtAt: BUILT_AT,
      })
    );
  });

  it('stops after three pages and marks the snapshot truncated', async () => {
    const cursors = ['one', 'two', 'three'].map((id) => ({
      sourceId: 'src-a',
      type: 'feature',
      id,
    }));
    const { client, getTopologyFeaturesPage } = makeClient(
      cursors.map((nextCursor) => ({ hits: [], nextCursor }))
    );

    const snapshot = await client.get(['src-a']);

    expect(getTopologyFeaturesPage).toHaveBeenCalledTimes(3);
    expect(snapshot.truncated).toBe(true);
  });
});
