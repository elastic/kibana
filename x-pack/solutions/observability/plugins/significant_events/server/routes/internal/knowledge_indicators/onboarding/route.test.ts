/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KIsOnboardingStep,
  MAX_ID_LENGTH,
  NightshiftModelNotFoundError,
  SignificantEventsWorkflowStatus,
} from '@kbn/significant-events-schema';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { internalKIOnboardingRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const mockResolveNightshiftModelForRequest = jest.fn(async ({ step }: { step: string }) =>
  step === 'kiExtraction' ? 'canonical-features-model' : 'canonical-queries-model'
);

jest.mock('@kbn/nightshift-ai', () => ({
  ...jest.requireActual('@kbn/nightshift-ai'),
  resolveNightshiftModelForRequest: (options: { step: string }) =>
    mockResolveNightshiftModelForRequest(options),
}));

const route = internalKIOnboardingRoutes['POST /internal/streams/{streamName}/onboarding/_execute'];
const bulkStatusRoute =
  internalKIOnboardingRoutes['POST /internal/streams/onboarding/_bulk_status'];
type HandlerParams = Parameters<typeof route.handler>[0];

const makeHandlerParams = ({
  steps = [KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration],
  connectors = { features: 'features-alias', queries: 'queries-alias' },
}: {
  steps?: KIsOnboardingStep[];
  connectors?: { features?: string; queries?: string };
} = {}) => {
  const run = jest.fn().mockResolvedValue({ executionId: 'execution-1' });
  const getSource = jest
    .fn()
    .mockResolvedValue({ source: { id: 'logs.test', slug: 'logs-test', enabled: true } });
  const request = {};
  const server = {
    inference: {},
    core: { savedObjects: {}, uiSettings: {} },
  };
  const licensing = {};

  return {
    handlerParams: {
      params: {
        path: { streamName: 'logs.test' },
        body: {
          action: 'schedule',
          from: 1,
          to: 2,
          steps,
          connectors,
        },
      },
      request,
      getScopedClients: jest.fn().mockResolvedValue({
        licensing,
        sourcesClient: { get: getSource },
      }),
      server,
      workflowClients: { streamsKIsOnboardingClient: { run } },
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
    } as unknown as HandlerParams,
    getSource,
    licensing,
    request,
    run,
    server,
  };
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('bounds per-step connector overrides', () => {
  expect(
    route.params.safeParse({
      path: { streamName: 'logs.test' },
      body: {
        action: 'schedule',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
        connectors: { features: 'x'.repeat(MAX_ID_LENGTH + 1) },
      },
    }).success
  ).toBe(false);
});

it('resolves strict overrides and forwards canonical connector IDs', async () => {
  const { handlerParams, licensing, run, server } = makeHandlerParams();

  await expect(route.handler(handlerParams)).resolves.toEqual({
    status: SignificantEventsWorkflowStatus.InProgress,
    executionId: 'execution-1',
  });

  expect(assertSignificantEventsAccess).toHaveBeenCalledWith({ server, licensing });
  expect(mockResolveNightshiftModelForRequest).toHaveBeenCalledWith(
    expect.objectContaining({ step: 'kiExtraction', requestedId: 'features-alias' })
  );
  expect(mockResolveNightshiftModelForRequest).toHaveBeenCalledWith(
    expect.objectContaining({ step: 'kiQueryGeneration', requestedId: 'queries-alias' })
  );
  expect(run).toHaveBeenCalledWith({
    inputs: {
      streamName: 'logs.test',
      sourceSlug: 'logs-test',
      features: {
        skip: false,
        start: 1,
        end: 2,
        connectorId: 'canonical-features-model',
      },
      queries: {
        skip: false,
        connectorId: 'canonical-queries-model',
      },
    },
    request: handlerParams.request,
  });
});

it('does not resolve or forward a model for a skipped step', async () => {
  const { handlerParams, run } = makeHandlerParams({
    steps: [KIsOnboardingStep.QueriesGeneration],
  });

  await route.handler(handlerParams);

  expect(mockResolveNightshiftModelForRequest).toHaveBeenCalledTimes(1);
  expect(mockResolveNightshiftModelForRequest).toHaveBeenCalledWith(
    expect.objectContaining({ step: 'kiQueryGeneration' })
  );
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({
      inputs: expect.objectContaining({
        features: { skip: true, start: 1, end: 2 },
      }),
    })
  );
});

it('maps an unknown strict override to a 400 response', async () => {
  const { handlerParams, run } = makeHandlerParams();
  mockResolveNightshiftModelForRequest.mockRejectedValueOnce(
    new NightshiftModelNotFoundError('missing-model')
  );

  await expect(route.handler(handlerParams)).rejects.toMatchObject({
    output: { statusCode: 400 },
  });
  expect(run).not.toHaveBeenCalled();
});

describe('onboardingBulkStatusRoute', () => {
  it('returns not_started for ids outside the space catalog', async () => {
    const getStatuses = jest.fn().mockResolvedValue({
      'source-a': {
        status: SignificantEventsWorkflowStatus.InProgress,
        executionId: 'exec-1',
      },
    });
    const handlerParams = {
      params: { body: { streamNames: ['source-a', 'other-space-source'] } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        sourcesClient: {
          list: jest.fn().mockResolvedValue({
            sources: [{ id: 'source-a', slug: 'slug-a' }],
            total: 1,
            page: 1,
            per_page: 10_000,
          }),
        },
      }),
      server: {},
      workflowClients: {
        streamsKIsOnboardingClient: { getStatuses },
      },
    } as unknown as Parameters<typeof bulkStatusRoute.handler>[0];

    const result = await bulkStatusRoute.handler(handlerParams);

    expect(getStatuses).toHaveBeenCalledWith({
      sources: [{ id: 'source-a', slug: 'slug-a' }],
      request: handlerParams.request,
    });
    expect(result).toEqual({
      'source-a': {
        status: SignificantEventsWorkflowStatus.InProgress,
        executionId: 'exec-1',
      },
      'other-space-source': {
        status: SignificantEventsWorkflowStatus.NotStarted,
        executionId: null,
      },
    });
    expect(assertSignificantEventsAccess).toHaveBeenCalled();
  });
});

describe('onboardingExecuteRoute', () => {
  it('rejects scheduling a disabled source', async () => {
    const run = jest.fn();
    const handlerParams = {
      params: {
        path: { streamName: 'source-a' },
        body: { action: 'schedule', from: Date.now(), to: Date.now(), steps: [] },
      },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        sourcesClient: {
          get: jest.fn().mockResolvedValue({
            source: { id: 'source-a', enabled: false },
          }),
        },
      }),
      server: {},
      workflowClients: {
        streamsKIsOnboardingClient: { run },
      },
      maintenanceService: { getState: jest.fn() },
    } as unknown as HandlerParams;

    const error = await route.handler(handlerParams).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      message: 'Cannot schedule onboarding for a disabled source',
      output: { statusCode: 400 },
    });
    expect(run).not.toHaveBeenCalled();
  });
});
