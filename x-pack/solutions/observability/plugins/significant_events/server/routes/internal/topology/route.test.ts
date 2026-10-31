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

const route = internalTopologyRoutes['GET /internal/significant_events/topology'];

const setup = (sourceIds?: string[]) => {
  const get = jest.fn().mockResolvedValue({ nodes: [], edges: [] });
  const resources = {
    params: { query: sourceIds ? { sourceIds } : undefined },
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
    }),
  };
  return { resources, get };
};

describe('GET /internal/significant_events/topology', () => {
  it('builds from every readable source when none are requested', async () => {
    const { resources, get } = setup();

    await route.handler(resources as never);

    expect(get).toHaveBeenCalledWith(['source-1', 'source-2']);
  });

  it('builds from the readable subset of the requested sources', async () => {
    const { resources, get } = setup(['source-2', 'unreadable']);

    await route.handler(resources as never);

    expect(get).toHaveBeenCalledWith(['source-2']);
  });
});
