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

const mockResolveSignificantEventsModelForRequest = jest.fn().mockResolvedValue('canonical-model');

jest.mock('../../../model_resolution', () => ({
  resolveSignificantEventsModelForRequest: (...args: unknown[]) =>
    mockResolveSignificantEventsModelForRequest(...args),
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
  const request = {};
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
  expect(mockResolveSignificantEventsModelForRequest).toHaveBeenCalledWith({
    request,
    inference: server.inference,
    savedObjects: server.core.savedObjects,
    uiSettings: server.core.uiSettings,
    step: 'discovery',
    requestedId: 'model-alias',
  });
});

it('maps an unknown connector to a 400 response', async () => {
  const { handlerParams } = makeHandlerParams();
  mockResolveSignificantEventsModelForRequest.mockRejectedValueOnce(
    new NightshiftModelNotFoundError('missing-model')
  );

  await expect(route.handler(handlerParams)).rejects.toMatchObject({
    output: { statusCode: 400 },
  });
});
