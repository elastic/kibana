/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import { internalDetectionOverviewRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const overviewRoute =
  internalDetectionOverviewRoutes['GET /internal/significant_events/detection/_overview'];

describe('GET /internal/significant_events/detection/_overview', () => {
  it('returns list-aligned counts for readable sources and the requested time range', async () => {
    const from = '2026-10-19T07:00:00.000Z';
    const to = '2026-10-20T07:00:00.000Z';
    const countFeatures = jest.fn().mockResolvedValue(11);
    const countEntities = jest.fn().mockResolvedValue(1500);
    const countUnbackedQueries = jest.fn().mockResolvedValue(4);
    const countRuleBackedQueries = jest.fn().mockResolvedValue(7);
    const findLatestPaginated = jest.fn().mockResolvedValue({ total: 5 });
    const findLatestByCurrentStatePaginated = jest.fn().mockResolvedValue({ total: 3 });
    const assertReadable = jest.fn(async (sourceId: string) => {
      if (sourceId === 'source-unreadable') {
        throw forbidden();
      }
    });

    const response = await overviewRoute.handler({
      params: { query: { from, to } },
      request: {},
      server: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        sourcesClient: {
          list: jest.fn().mockResolvedValue({
            sources: [{ id: 'source-readable' }, { id: 'source-unreadable' }],
            total: 2,
          }),
          assertReadable,
        },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          countFeatures,
          countEntities,
          countUnbackedQueries,
          countRuleBackedQueries,
        }),
        getDetectionClient: jest.fn().mockResolvedValue({ findLatestPaginated }),
        getEventSearchClient: jest.fn().mockResolvedValue({ findLatestByCurrentStatePaginated }),
      }),
    } as never);

    expect(countFeatures).toHaveBeenCalledWith(['source-readable']);
    expect(countEntities).toHaveBeenCalledWith(['source-readable']);
    expect(countUnbackedQueries).toHaveBeenCalledWith(['source-readable']);
    expect(countRuleBackedQueries).toHaveBeenCalledWith(['source-readable']);
    expect(findLatestPaginated).toHaveBeenCalledWith({ from, to, page: 1, perPage: 1 });
    expect(findLatestByCurrentStatePaginated).toHaveBeenCalledWith({
      from,
      to,
      page: 1,
      perPage: 1,
    });
    expect(response).toEqual({
      entities: 1500,
      knowledge_indicators: 15,
      active_rules: 7,
      detections: 5,
      significant_events: 3,
    });
  });

  it('narrows the significant events count to the requested statuses only', async () => {
    const from = '2026-10-19T07:00:00.000Z';
    const to = '2026-10-20T07:00:00.000Z';
    const findLatestPaginated = jest.fn().mockResolvedValue({ total: 5 });
    const findLatestByCurrentStatePaginated = jest.fn().mockResolvedValue({ total: 2 });

    const response = await overviewRoute.handler({
      params: { query: { from, to, status: ['active', 'recovering'] } },
      request: {},
      server: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        sourcesClient: {
          list: jest.fn().mockResolvedValue({ sources: [{ id: 'source-a' }], total: 1 }),
          assertReadable: jest.fn().mockResolvedValue(undefined),
        },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          countFeatures: jest.fn().mockResolvedValue(0),
          countEntities: jest.fn().mockResolvedValue(0),
          countUnbackedQueries: jest.fn().mockResolvedValue(0),
          countRuleBackedQueries: jest.fn().mockResolvedValue(0),
        }),
        getDetectionClient: jest.fn().mockResolvedValue({ findLatestPaginated }),
        getEventSearchClient: jest.fn().mockResolvedValue({ findLatestByCurrentStatePaginated }),
      }),
    } as never);

    expect(findLatestByCurrentStatePaginated).toHaveBeenCalledWith({
      from,
      to,
      status: ['active', 'recovering'],
      page: 1,
      perPage: 1,
    });
    // Detections are not events: the status filter must not leak into their count.
    expect(findLatestPaginated).toHaveBeenCalledWith({ from, to, page: 1, perPage: 1 });
    expect(response.significant_events).toBe(2);
  });
});
