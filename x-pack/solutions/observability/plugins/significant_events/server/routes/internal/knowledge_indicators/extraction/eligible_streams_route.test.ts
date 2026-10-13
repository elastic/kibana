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

const makeHandlerParams = (logger: { info: jest.Mock }): HandlerParams =>
  ({
    params: undefined,
    request: {},
    logger,
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

  it('logs the ids of disabled sources it skips', async () => {
    (reconcileSourceCatalog as jest.Mock).mockResolvedValue({
      sources: [makeSource('on', true), makeSource('off-a', false), makeSource('off-b', false)],
    });
    const logger = { info: jest.fn() };

    const response = await eligibleRoute.handler(makeHandlerParams(logger));

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Continuous onboarding skipped 2 disabled source(s): off-a, off-b'
    );
    expect(response.candidates.map(({ sourceId }) => sourceId)).toEqual(['on']);
  });

  it('does not log when every source is enabled', async () => {
    (reconcileSourceCatalog as jest.Mock).mockResolvedValue({
      sources: [makeSource('on', true)],
    });
    const logger = { info: jest.fn() };

    await eligibleRoute.handler(makeHandlerParams(logger));

    expect(logger.info).not.toHaveBeenCalled();
  });
});
