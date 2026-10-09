/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncRoutes } from './sync_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route = syncRoutes['GET /internal/streams/_knowledge_indicators/_streams_with_indicators'];

type HandlerParams = Parameters<typeof route.handler>[0];

const makeHandlerParams = ({ sourceIds }: { sourceIds: string[] }): HandlerParams =>
  ({
    params: {},
    request: {},
    getScopedClients: jest.fn().mockResolvedValue({
      licensing: {},
      sourcesClient: {
        list: jest.fn().mockResolvedValue({
          sources: sourceIds.map((id) => ({ id, enabled: true })),
          total: sourceIds.length,
          page: 1,
          per_page: 100,
        }),
      },
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
        getSourceIdsToReconcile: jest.fn().mockResolvedValue(sourceIds),
        findSourceIdsWithOwnedRules: jest.fn().mockResolvedValue(sourceIds),
        setSourceRulesEnabled: jest.fn().mockResolvedValue(undefined),
        deleteOwnedRules: jest.fn().mockResolvedValue(undefined),
        deleteAllQueries: jest.fn().mockResolvedValue(undefined),
        deleteIndicators: jest.fn().mockResolvedValue(undefined),
      }),
    }),
    workflowClients: {},
    maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
    server: {} as HandlerParams['server'],
  } as unknown as HandlerParams);

describe('streamsWithIndicatorsRoute', () => {
  beforeEach(() => {
    (assertSignificantEventsAccess as jest.Mock).mockClear();
  });

  it('maps source ids to the foreach item shape', async () => {
    const result = await route.handler(
      makeHandlerParams({ sourceIds: ['logs.nginx', 'logs.app'] })
    );

    expect(result).toEqual({
      sources: [{ sourceId: 'logs.nginx' }, { sourceId: 'logs.app' }],
    });
  });

  it('returns an empty list when there is nothing to reconcile', async () => {
    const result = await route.handler(makeHandlerParams({ sourceIds: [] }));

    expect(result).toEqual({ sources: [] });
  });

  it('enforces significant events access', async () => {
    await route.handler(makeHandlerParams({ sourceIds: [] }));

    expect(assertSignificantEventsAccess).toHaveBeenCalledTimes(1);
  });
});

describe('reconcileSourceRoute', () => {
  const reconcileSource = syncRoutes['POST /internal/streams/{sourceId}/_reconcile_source'];
  type ReconcileParams = Parameters<typeof reconcileSource.handler>[0];

  const SOURCE = { id: 'source-1', slug: 'nginx', enabled: true, esql_updated_at: 'rev-2' };

  const makeReconcileParams = () => {
    const scheduleSourceOnboarding = jest.fn().mockResolvedValue(true);
    const sourceKnowledgeState = {
      runExclusive: jest.fn(
        async ({ run }: { run: (state: object, checkpoint: jest.Mock) => Promise<unknown> }) =>
          run({ revision: 'rev-1' }, jest.fn())
      ),
    };
    const handlerParams = {
      params: { path: { sourceId: SOURCE.id }, body: { sourceSlug: SOURCE.slug } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        sourcesClient: {
          list: jest.fn().mockResolvedValue({ sources: [SOURCE] }),
          get: jest.fn().mockResolvedValue({ source: SOURCE }),
        },
        sourceKnowledgeState,
        scheduleSourceOnboarding,
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          setSourceRulesEnabled: jest.fn().mockResolvedValue(undefined),
          deleteOwnedRules: jest.fn().mockResolvedValue(undefined),
          deleteAllQueries: jest.fn().mockResolvedValue(undefined),
          deleteIndicators: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      workflowClients: {},
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      server: {} as ReconcileParams['server'],
    } as unknown as ReconcileParams;
    return { handlerParams, scheduleSourceOnboarding };
  };

  it('schedules the new revision even when continuous onboarding is off', async () => {
    const { handlerParams, scheduleSourceOnboarding } = makeReconcileParams();

    await expect(reconcileSource.handler(handlerParams)).resolves.toEqual({ reconciled: true });

    expect(scheduleSourceOnboarding).toHaveBeenCalledWith(SOURCE, {
      ignoreContinuousSetting: true,
    });
  });
});
