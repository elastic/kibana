/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../reconcile_source_catalog', () => ({
  reconcileSourceCatalog: jest.fn(),
}));

import { reconcileSourceCatalog } from '../reconcile_source_catalog';
import { internalKIEligibleStreamsRoutes } from './eligible_streams_route';

const eligibleRoute = Object.values(internalKIEligibleStreamsRoutes)[0];
type HandlerParams = Parameters<typeof eligibleRoute.handler>[0];

const makeSource = (id: string, enabled: boolean) => ({
  id,
  slug: `${id}-slug`,
  enabled,
  esql_updated_at: '2020-01-01T00:00:00.000Z',
});

const makeHandlerParams = (): HandlerParams =>
  ({
    params: undefined,
    request: {},
    server: {},
    maintenanceService: {},
    workflowClients: {
      streamsKIsOnboardingClient: { getRecentExecutions: jest.fn().mockResolvedValue([]) },
    },
    getScopedClients: jest.fn().mockResolvedValue({
      sourcesClient: {},
      licensing: {},
      uiSettingsClient: { get: jest.fn().mockResolvedValue(true) },
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({}),
    }),
  } as unknown as HandlerParams);

describe('eligibleStreamsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a disabled source only in the disabled bucket', async () => {
    (reconcileSourceCatalog as jest.Mock).mockResolvedValue({
      sources: [makeSource('on', true), makeSource('off-a', false), makeSource('off-b', false)],
    });

    const response = await eligibleRoute.handler(makeHandlerParams());

    expect(response.disabled.map(({ sourceId }) => sourceId)).toEqual(['off-a', 'off-b']);
    expect(response.candidates.map(({ sourceId }) => sourceId)).toEqual(['on']);
  });
});
