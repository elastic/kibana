/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ID_LENGTH, NightshiftModelNotFoundError } from '@kbn/significant-events-schema';
import { internalDiscoveryRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const mockResolveNightshiftModelForRequest = jest.fn().mockResolvedValue('canonical-model');

jest.mock('@kbn/nightshift-ai', () => ({
  ...jest.requireActual('@kbn/nightshift-ai'),
  resolveNightshiftModelForRequest: (...args: unknown[]) =>
    mockResolveNightshiftModelForRequest(...args),
}));

const route =
  internalDiscoveryRoutes['POST /internal/streams/significant_events/discovery/_execute'];
type HandlerParams = Parameters<typeof route.handler>[0];

const makeHandlerParams = () => {
  const run = jest.fn(
    async ({
      connectorId,
      resolveModel,
    }: {
      connectorId?: string;
      resolveModel: (requestedId?: string) => Promise<string>;
    }) => {
      await resolveModel(connectorId);
      return { executionId: 'execution-1', isNew: true };
    }
  );
  const request = { spaceId: 'default' };
  const server = {
    agentBuilder: {},
    inference: {},
    core: { savedObjects: {}, uiSettings: {} },
  };

  return {
    handlerParams: {
      params: { body: { action: 'trigger', connector_id: 'model-alias' } },
      request,
      getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
      workflowClients: { significantEventsDiscoveryClient: { run } },
      getSpaceId: jest.fn().mockResolvedValue('space-a'),
      server,
      telemetry: { trackSignificantEventsDiscoveryTriggered: jest.fn() },
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
    } as unknown as HandlerParams,
    request,
    run,
    server,
  };
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('bounds the connector override', () => {
  expect(
    route.params.safeParse({
      body: {
        action: 'trigger',
        connector_id: 'x'.repeat(MAX_ID_LENGTH + 1),
      },
    }).success
  ).toBe(false);
});

it('passes a strict connector override and request-scoped resolver to the discovery client', async () => {
  const { handlerParams, request, run, server } = makeHandlerParams();

  await expect(route.handler(handlerParams)).resolves.toEqual({ executionId: 'execution-1' });

  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({
      request,
      spaceId: 'space-a',
      connectorId: 'model-alias',
      resolveModel: expect.any(Function),
    })
  );
  expect(mockResolveNightshiftModelForRequest).toHaveBeenCalledWith({
    request,
    inference: server.inference,
    savedObjects: server.core.savedObjects,
    uiSettings: server.core.uiSettings,
    step: 'discovery',
    requestedId: 'model-alias',
  });
});

describe('discovery completed report', () => {
  const completedRoute =
    internalDiscoveryRoutes['POST /internal/streams/significant_events/discovery/_completed'];
  type CompletedParams = Parameters<typeof completedRoute.handler>[0];

  const makeParams = ({
    getExecution = jest.fn().mockResolvedValue({
      startedAt: new Date(Date.now() - 90_000).toISOString(),
      finishedAt: undefined,
    }),
    getLastExecution = jest.fn().mockResolvedValue({ id: 'orchestrator-1' }),
    body = {},
  }: {
    getExecution?: jest.Mock;
    getLastExecution?: jest.Mock;
    body?: Record<string, unknown>;
  } = {}) => {
    const track = jest.fn();
    return {
      track,
      handlerParams: {
        params: {
          body: {
            discovery_execution_id: 'discovery-1',
            outcome: 'completed',
            has_work: true,
            processed_count: 4,
            written_event_count: 2,
            ...body,
          },
        },
        request: {},
        getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
        workflowClients: {
          significantEventsDiscoveryClient: { getExecution, getLastExecution },
        },
        getSpaceId: jest.fn().mockResolvedValue('space-a'),
        server: {},
        telemetry: { trackSignificantEventsDiscoveryCompleted: track },
        logger: { debug: jest.fn() },
      } as unknown as CompletedParams,
    };
  };

  it('pairs the report with the orchestrator run and measures the discovery execution', async () => {
    const { handlerParams, track } = makeParams();

    await expect(completedRoute.handler(handlerParams)).resolves.toEqual({ acknowledged: true });

    const [[reported]] = track.mock.calls;
    expect(reported).toMatchObject({
      execution_id: 'orchestrator-1',
      discovery_execution_id: 'discovery-1',
      space_id: 'space-a',
      alert_source: 'elastic.significant_events',
      outcome: 'completed',
      has_work: true,
      processed_count: 4,
      written_event_count: 2,
    });
    expect(reported.duration_ms).toBeGreaterThanOrEqual(90_000);
    expect(reported).not.toHaveProperty('error_message');
  });

  it('still reports when the execution records cannot be read', async () => {
    const { handlerParams, track } = makeParams({
      getExecution: jest.fn().mockRejectedValue(new Error('not found')),
      getLastExecution: jest.fn().mockRejectedValue(new Error('unavailable')),
      body: { outcome: 'failed', error_message: 'agent step failed' },
    });

    await completedRoute.handler(handlerParams);

    const [[reported]] = track.mock.calls;
    expect(reported).toMatchObject({ outcome: 'failed', error_message: 'agent step failed' });
    expect(reported).not.toHaveProperty('execution_id');
    expect(reported).not.toHaveProperty('duration_ms');
  });

  it('reports without a duration when the execution id is unknown', async () => {
    const { handlerParams, track } = makeParams({
      getExecution: jest.fn().mockResolvedValue(null),
      getLastExecution: jest.fn().mockResolvedValue(null),
    });

    await completedRoute.handler(handlerParams);

    const [[reported]] = track.mock.calls;
    expect(reported).toMatchObject({ discovery_execution_id: 'discovery-1', outcome: 'completed' });
    expect(reported).not.toHaveProperty('duration_ms');
    expect(reported).not.toHaveProperty('execution_id');
  });
});

it('maps an unknown connector to a 400 response', async () => {
  const { handlerParams } = makeHandlerParams();
  mockResolveNightshiftModelForRequest.mockRejectedValueOnce(
    new NightshiftModelNotFoundError('missing-model')
  );

  await expect(route.handler(handlerParams)).rejects.toMatchObject({
    output: { statusCode: 400 },
  });
});
