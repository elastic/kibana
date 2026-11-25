/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import type { Feature } from '@kbn/significant-events-schema';
import { MAX_ENTITIES } from '../../../lib/significant_events/entities/get_live_entities';
import { internalDetectionEntitiesRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route =
  internalDetectionEntitiesRoutes['GET /internal/significant_events/detection/_entities'];
const from = '2026-09-01T00:00:00.000Z';
const to = '2026-10-22T00:00:00.000Z';
const feature = (overrides: Partial<Feature> = {}): Feature => ({
  id: 'checkout',
  uuid: 'checkout-1',
  source_id: 'source-1',
  type: 'entity',
  subtype: 'Service',
  title: 'Checkout title',
  description: 'Checkout',
  properties: { name: 'Checkout' },
  confidence: 90,
  ...overrides,
});

const setup = (hits: Feature[]) => {
  const getFeatures = jest.fn().mockResolvedValue({ hits });
  const getQueryLinks = jest
    .fn()
    .mockResolvedValue([
      { query: { features: [{ id: 'checkout' }, { id: 'checkout' }, { id: 'technology' }] } },
      { query: { features: [{ id: 'checkout' }, { id: 'database' }] } },
      { query: { features: [{ id: 'technology' }] } },
      { query: {} },
    ]);
  const countActiveEventsByEntity = jest.fn().mockResolvedValue({
    entities: { checkout: 3, database: 1 },
    unassigned: 4,
  });
  const resources = {
    params: { query: { from, to } },
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
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ getFeatures, getQueryLinks }),
      getEventSearchClient: jest.fn().mockResolvedValue({ countActiveEventsByEntity }),
    }),
  };
  return { resources, getFeatures, getQueryLinks, countActiveEventsByEntity };
};

describe('GET /internal/significant_events/detection/_entities', () => {
  it('merges slugs across readable sources and counts each rule once per live slug', async () => {
    const { resources, getFeatures, getQueryLinks, countActiveEventsByEntity } = setup([
      feature(),
      feature({ source_id: 'source-2', uuid: 'checkout-2', subtype: 'database' }),
      feature({ uuid: 'checkout-3' }),
      feature({ id: 'database', properties: {}, title: 'Database', subtype: 'DATABASE' }),
      feature({ id: 'constructor', properties: {}, title: undefined }),
    ]);

    expect(await route.handler(resources as never)).toEqual({
      entities: [
        {
          id: 'checkout',
          name: 'Checkout',
          subtype: 'service',
          source_ids: ['source-1', 'source-2'],
          rules: 2,
          active_events: 3,
        },
        {
          id: 'database',
          name: 'Database',
          subtype: 'database',
          source_ids: ['source-1'],
          rules: 1,
          active_events: 1,
        },
        {
          id: 'constructor',
          name: 'constructor',
          subtype: 'service',
          source_ids: ['source-1'],
          rules: 0,
          active_events: 0,
        },
      ],
      unassigned: { rules: 2, active_events: 4 },
      truncated: false,
    });
    expect(getFeatures).toHaveBeenCalledWith(['source-1', 'source-2'], {
      type: ['entity'],
      limit: MAX_ENTITIES,
    });
    expect(getQueryLinks).toHaveBeenCalledWith(['source-1', 'source-2'], {
      ruleUnbacked: 'exclude',
    });
    expect(countActiveEventsByEntity).toHaveBeenCalledWith({ from, to }, [
      'checkout',
      'database',
      'constructor',
    ]);
  });

  it('reports truncation and withholds unassigned counts when the feature limit is reached', async () => {
    const { resources } = setup(
      Array.from({ length: MAX_ENTITIES }, (_, index) => feature({ id: `entity-${index}` }))
    );
    const response = await route.handler(resources as never);
    expect(response.entities).toHaveLength(MAX_ENTITIES);
    expect(response.truncated).toBe(true);
    expect(response.unassigned).toBeNull();
  });
});
