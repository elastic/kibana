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
jest.mock('@kbn/ai-tools', () => ({
  ...jest.requireActual('@kbn/ai-tools'),
  getEsqlColumnSchema: jest.fn(),
}));

import { getEsqlColumnSchema } from '@kbn/ai-tools';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { reconcileSourceCatalog } from '../reconcile_source_catalog';
import { internalKIEligibleStreamsRoutes } from './eligible_streams_route';

const eligibleRoute = Object.values(internalKIEligibleStreamsRoutes)[0];
type HandlerParams = Parameters<typeof eligibleRoute.handler>[0];

const makeSource = (id: string, enabled: boolean) => ({
  id,
  slug: `${id}-slug`,
  view_name: `view-${id}`,
  enabled,
  esql_updated_at: '2020-01-01T00:00:00.000Z',
});

const makeEsqlQuery = (emptyViews: string[] = []) =>
  jest.fn(async ({ query }: { query: string }) => ({
    values: [[emptyViews.some((view) => query.includes(view)) ? 0 : 1]],
  }));

const makeHandlerParams = (
  esqlQuery = makeEsqlQuery(),
  keepAlivePersistentIndicators = jest.fn().mockResolvedValue({ refreshed: 0 })
): HandlerParams =>
  ({
    params: { query: { extractionIntervalHours: 6 } },
    request: {},
    server: {},
    logger: loggingSystemMock.createLogger(),
    maintenanceService: {},
    workflowClients: {
      streamsKIsOnboardingClient: { getRecentExecutions: jest.fn().mockResolvedValue([]) },
    },
    getScopedClients: jest.fn().mockResolvedValue({
      sourcesClient: {},
      streamDataEsClient: { esql: { query: esqlQuery } },
      licensing: {},
      uiSettingsClient: { get: jest.fn().mockResolvedValue(true) },
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ keepAlivePersistentIndicators }),
    }),
  } as unknown as HandlerParams);

describe('eligibleStreamsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getEsqlColumnSchema).mockResolvedValue([{ name: '@timestamp', type: 'date' }]);
  });

  it('returns a disabled source only in the disabled bucket', async () => {
    (reconcileSourceCatalog as jest.Mock).mockResolvedValue({
      sources: [makeSource('on', true), makeSource('off-a', false), makeSource('off-b', false)],
    });

    const response = await eligibleRoute.handler(makeHandlerParams());

    expect(response.disabled.map(({ sourceId }) => sourceId)).toEqual(['off-a', 'off-b']);
    expect(response.candidates.map(({ sourceId }) => sourceId)).toEqual(['on']);
  });

  it('leaves a source that cannot be sampled out of the candidates', async () => {
    (reconcileSourceCatalog as jest.Mock).mockResolvedValue({
      sources: [makeSource('no-timestamp', true), makeSource('ok', true)],
    });
    jest
      .mocked(getEsqlColumnSchema)
      .mockImplementation(async ({ index, fields }) =>
        index !== 'view-no-timestamp'
          ? [{ name: '@timestamp', type: 'date' }]
          : fields
          ? []
          : [{ name: 'message', type: 'text' }]
      );

    const response = await eligibleRoute.handler(makeHandlerParams());

    expect(response.candidates.map(({ sourceId }) => sourceId)).toEqual(['ok']);
    expect(response.unsupported.map(({ sourceId }) => sourceId)).toEqual(['no-timestamp']);
  });

  it('leaves out a source with no document in the whole-second time range it returns', async () => {
    (reconcileSourceCatalog as jest.Mock).mockResolvedValue({
      sources: [makeSource('quiet', true), makeSource('ok', true)],
    });
    const esqlQuery = makeEsqlQuery(['view-quiet']);
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-01-02T00:00:00.789Z'));

    try {
      const response = await eligibleRoute.handler(makeHandlerParams(esqlQuery));

      expect(response.candidates.map(({ sourceId }) => sourceId)).toEqual(['ok']);
      expect(response.empty.map(({ sourceId }) => sourceId)).toEqual(['quiet']);
      expect(response.timeRange).toEqual({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
      });
      expect(esqlQuery).toHaveBeenCalledWith(
        {
          query:
            'FROM view-quiet | WHERE @timestamp >= "2026-01-01T00:00:00.000Z" AND @timestamp <= "2026-01-02T00:00:00.000Z" | LIMIT 1 | STATS total = COUNT(*)',
        },
        expect.anything()
      );
    } finally {
      dateNow.mockRestore();
    }
  });

  it('keeps alive only the empty source, once per interval, and answers when that fails', async () => {
    (reconcileSourceCatalog as jest.Mock).mockResolvedValue({
      sources: [makeSource('quiet', true), makeSource('ok', true)],
    });
    const keepAlive = jest.fn().mockRejectedValue(new Error('lease held'));

    const response = await eligibleRoute.handler(
      makeHandlerParams(makeEsqlQuery(['view-quiet']), keepAlive)
    );

    const oneIntervalBeforeEnd = new Date(
      Date.parse(response.timeRange.to) - 6 * 3_600_000
    ).toISOString();
    expect(keepAlive.mock.calls).toEqual([
      ['quiet', { lastRefreshedBefore: oneIntervalBeforeEnd }],
    ]);
  });
});
