/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import { internalTopologyRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route = internalTopologyRoutes['GET /internal/nightshift/topology'];
const featuresRoute = internalTopologyRoutes['GET /internal/nightshift/topology/features'];

const setup = (sourceIds: string[], featureUuids?: string[]) => {
  const get = jest.fn().mockResolvedValue({ nodes: [], edges: [] });
  const getFeatures = jest.fn().mockResolvedValue({ hits: [] });
  const resources = {
    params: { query: { sourceIds, featureUuids } },
    request: {},
    server: {},
    getScopedClients: jest.fn().mockResolvedValue({
      licensing: {},
      sourcesClient: {
        list: jest.fn().mockResolvedValue({
          sources: [{ id: 'source-1' }, { id: 'source-2' }, { id: 'unreadable' }],
          total: 3,
        }),
        assertReadable: jest.fn(async (sourceId: string) => {
          if (sourceId === 'unreadable') throw forbidden();
        }),
      },
      getTopologySnapshotClient: jest.fn().mockResolvedValue({ get }),
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ getFeatures }),
    }),
  };
  return { resources, get, getFeatures };
};

describe('GET /internal/nightshift/topology', () => {
  it('builds from the readable subset of the requested sources', async () => {
    const { resources, get } = setup(['source-2', 'unreadable']);

    await route.handler(resources as never);

    expect(get).toHaveBeenCalledWith(['source-2']);
  });
});

describe('GET /internal/nightshift/topology/features', () => {
  it('looks up topology KIs by uuid within the readable sources', async () => {
    const { resources, getFeatures } = setup(['source-1', 'unreadable'], ['uuid-1']);

    await featuresRoute.handler(resources as never);

    expect(getFeatures).toHaveBeenCalledWith(['source-1'], {
      id: ['uuid-1'],
      type: ['entity', 'dependency'],
    });
  });
});
