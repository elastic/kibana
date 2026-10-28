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

function makeClient() {
  const getFeatures = jest.fn(async () => ({ hits: inputFeatures }));
  const client = new TopologySnapshotClient({
    reader: { getFeatures },
    logger: loggerMock.create(),
    now: () => new Date(BUILT_AT),
  });
  return { client, getFeatures };
}

describe('TopologySnapshotClient', () => {
  it('reads the topology features of the given sources in one call', async () => {
    const { client, getFeatures } = makeClient();

    const snapshot = await client.get(['src-a', 'src-b']);

    expect(getFeatures).toHaveBeenCalledWith(['src-a', 'src-b'], {
      type: ['entity', 'infrastructure', 'dependency'],
      limit: expect.any(Number),
    });
    expect(snapshot).toEqual(
      buildTopologySnapshot({
        features: inputFeatures,
        sourceIds: ['src-a', 'src-b'],
        builtAt: BUILT_AT,
      })
    );
  });

  it('returns an empty snapshot without reading when there are no sources', async () => {
    const { client, getFeatures } = makeClient();

    const snapshot = await client.get([]);

    expect(getFeatures).not.toHaveBeenCalled();
    expect(snapshot).toMatchObject({ nodes: [], edges: [], node_count: 0, edge_count: 0 });
  });
});
