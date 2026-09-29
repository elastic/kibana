/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { SignificantEventsMaintenanceState } from '../../../../../common/maintenance/state_machine';
import {
  MAX_INFERENCE_DOCUMENT_BYTES,
  MAX_INFERENCE_DOCUMENT_FIELDS,
  MAX_INFERENCE_FIELD_NAME_LENGTH,
} from '../../../../lib/significant_events/features';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { internalIdentifyKIFeaturesRoutes } from './identify_route';

vi.mock('../../../utils/assert_significant_events_access', () => {
  const mocked = {
    assertSignificantEventsAccess: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});

const mockGetStreamSamplingSource = vi.fn();
const mockGetStreamTypeFromDefinition = vi.fn();
const mockIdentifyInferredFeatures = vi.fn();
const mockIdentifyComputedFeatures = vi.fn();
const mockShouldIdentifyFeatures = vi.fn();

vi.mock('@kbn/streams-schema', () => {
  const mocked = {
    getStreamSamplingSource: (...args: unknown[]) => mockGetStreamSamplingSource(...args),
    getStreamTypeFromDefinition: (...args: unknown[]) => mockGetStreamTypeFromDefinition(...args),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../lib/significant_events/features', () => {
  const mocked = {
    MS_PER_DAY: 86_400_000,
    MAX_INFERENCE_DOCUMENTS_BYTES: 288 * 1024,
    MAX_INFERENCE_DOCUMENT_BYTES: 32 * 1024,
    MAX_INFERENCE_DOCUMENT_FIELDS: 100,
    MAX_INFERENCE_FIELD_NAME_LENGTH: 1024,
    buildTelemetry: vi.fn(),
    prepareInferredSampling: vi.fn(),
    identifyInferredFeatures: (...args: unknown[]) => mockIdentifyInferredFeatures(...args),
    identifyComputedFeatures: (...args: unknown[]) => mockIdentifyComputedFeatures(...args),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../lib/significant_events/features/should_identify_features', () => {
  const mocked = {
    shouldIdentifyFeatures: (...args: unknown[]) => mockShouldIdentifyFeatures(...args),
  };
  return { ...mocked, default: mocked };
});

vi.mock(
  '../../../../lib/semantic_code_search_grounding/is_significant_events_semantic_code_search_grounding_enabled',
  () => {
    const mocked = {
      isSignificantEventsSemanticCodeSearchGroundingEnabled: vi.fn().mockResolvedValue(false),
    };
    return { ...mocked, default: mocked };
  }
);

const prepareRoute =
  internalIdentifyKIFeaturesRoutes[
    'POST /internal/streams/{streamName}/features/_identify/inferred/prepare'
  ];
const inferredRoute =
  internalIdentifyKIFeaturesRoutes[
    'POST /internal/streams/{streamName}/features/_identify/inferred'
  ];
const computedRoute =
  internalIdentifyKIFeaturesRoutes[
    'POST /internal/streams/{streamName}/features/_identify/computed'
  ];
const shouldIdentifyRoute =
  internalIdentifyKIFeaturesRoutes['GET /internal/streams/{streamName}/features/_should_identify'];

type InferredHandlerParams = Parameters<typeof inferredRoute.handler>[0];
type ComputedHandlerParams = Parameters<typeof computedRoute.handler>[0];
type ShouldIdentifyHandlerParams = Parameters<typeof shouldIdentifyRoute.handler>[0];

const createInferredParams = (
  documents: Array<{ _id: string; fields: Record<string, unknown> }>
) => ({
  path: { streamName: 'logs.test' },
  body: {
    documents,
    samplingTelemetry: {
      totalFilters: 0,
      filtersCapped: false,
      hasFilteredDocuments: false,
    },
  },
});

const makeMaintenanceService = (state: SignificantEventsMaintenanceState = 'enabled') => ({
  getState: vi.fn().mockResolvedValue(state),
});

const makeRequest = () => ({
  events: {
    aborted$: {
      subscribe: vi.fn(),
    },
  },
});

const makeRouteLogger = () => ({
  error: vi.fn(),
  warn: vi.fn(),
});

const makeInferredHandlerParams = ({
  ensureEnabled = vi.fn().mockResolvedValue(undefined),
}: {
  ensureEnabled?: Mock;
} = {}) => {
  const request = makeRequest();
  const routeLogger = makeRouteLogger();
  const stream = { name: 'logs.test' };
  const kiClient = {};
  const agentBuilder = {};
  const server = {
    searchInferenceEndpoints: {},
    agentBuilder,
  };
  const licensing = {};
  const maintenanceService = makeMaintenanceService();
  const telemetry = { trackFeaturesIdentified: vi.fn() };
  const identifyResult = { features: [], documentsSampled: 10 };

  mockGetStreamTypeFromDefinition.mockReturnValue('logs');
  mockIdentifyInferredFeatures.mockResolvedValue(identifyResult);

  const handlerParams = {
    params: {
      path: { streamName: 'logs.test' },
      body: {
        connectorId: 'connector-1',
        runId: 'run-1',
        iteration: 2,
        documents: [{ _id: 'document-1', fields: { message: 'test message' } }],
        samplingTelemetry: {
          totalFilters: 3,
          filtersCapped: false,
          hasFilteredDocuments: true,
        },
        maxExcludedFeaturesInPrompt: 5,
        maxPreviouslyIdentifiedFeatures: 6,
      },
    },
    request,
    getScopedClients: vi.fn().mockResolvedValue({
      scopedClusterClient: { asCurrentUser: {} },
      streamDataEsClient: {},
      streamsClient: { getStream: vi.fn().mockResolvedValue(stream) },
      soClient: {},
      tuningConfig: {},
      licensing,
      getKnowledgeIndicatorClient: vi.fn().mockResolvedValue(kiClient),
    }),
    server,
    logger: { get: vi.fn().mockReturnValue(routeLogger) },
    telemetry,
    syncWorkflowService: { ensureEnabled },
    maintenanceService,
  } as unknown as InferredHandlerParams;

  return {
    handlerParams,
    request,
    routeLogger,
    stream,
    kiClient,
    agentBuilder,
    server,
    licensing,
    maintenanceService,
    telemetry,
    identifyResult,
    ensureEnabled,
  };
};

const makeComputedHandlerParams = () => {
  const request = makeRequest();
  const routeLogger = makeRouteLogger();
  const stream = { name: 'logs.test' };
  const kiClient = {};
  const streamDataEsClient = {};
  const server = { agentBuilder: undefined };
  const licensing = {};
  const maintenanceService = makeMaintenanceService();
  const identifyResult = {
    features: [{ id: 'document-count' }],
    errors: [{ featureType: 'service-name', error: 'field unavailable' }],
  };

  mockIdentifyComputedFeatures.mockResolvedValue(identifyResult);

  const handlerParams = {
    params: {
      path: { streamName: 'logs.test' },
      body: {
        start: 100,
        end: 200,
        runId: 'run-1',
        computedFeaturesTimeoutMs: 7_000,
      },
    },
    request,
    getScopedClients: vi.fn().mockResolvedValue({
      streamDataEsClient,
      streamsClient: { getStream: vi.fn().mockResolvedValue(stream) },
      tuningConfig: {},
      licensing,
      getKnowledgeIndicatorClient: vi.fn().mockResolvedValue(kiClient),
    }),
    server,
    logger: { get: vi.fn().mockReturnValue(routeLogger) },
    telemetry: {},
    maintenanceService,
  } as unknown as ComputedHandlerParams;

  return {
    handlerParams,
    request,
    routeLogger,
    stream,
    kiClient,
    streamDataEsClient,
    server,
    licensing,
    maintenanceService,
    identifyResult,
  };
};

describe('feature identification route schemas', () => {
  it('bounds ratios and timeouts', () => {
    const prepareParams = {
      path: { streamName: 'logs.test' },
      body: {
        entityFilteredRatio: 0,
        diverseRatio: 1,
        samplingTimeoutMs: 1_000,
      },
    };

    expect(prepareRoute.params.safeParse(prepareParams).success).toBe(true);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, entityFilteredRatio: -0.1 },
      }).success
    ).toBe(false);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, diverseRatio: 1.1 },
      }).success
    ).toBe(false);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, samplingTimeoutMs: 999 },
      }).success
    ).toBe(false);
    expect(
      computedRoute.params.safeParse({
        path: { streamName: 'logs.test' },
        body: { computedFeaturesTimeoutMs: 240_001 },
      }).success
    ).toBe(false);
  });

  it('enforces the compact inference document contract', () => {
    expect(
      inferredRoute.params.safeParse(
        createInferredParams([{ _id: '1', fields: { message: 'ok' } }])
      ).success
    ).toBe(true);
    expect(inferredRoute.params.safeParse(createInferredParams([])).success).toBe(false);
    expect(
      inferredRoute.params.safeParse(
        createInferredParams([
          {
            _id: '1',
            fields: Object.fromEntries(
              Array.from({ length: MAX_INFERENCE_DOCUMENT_FIELDS + 1 }, (_, index) => [
                `field-${index}`,
                'value',
              ])
            ),
          },
        ])
      ).success
    ).toBe(false);
    expect(
      inferredRoute.params.safeParse(
        createInferredParams([
          {
            _id: '1',
            fields: { ['x'.repeat(MAX_INFERENCE_FIELD_NAME_LENGTH + 1)]: 'value' },
          },
        ])
      ).success
    ).toBe(false);
    expect(
      inferredRoute.params.safeParse(
        createInferredParams([
          { _id: '1', fields: { message: 'x'.repeat(MAX_INFERENCE_DOCUMENT_BYTES) } },
        ])
      ).success
    ).toBe(false);
    expect(
      inferredRoute.params.safeParse(
        createInferredParams(
          Array.from({ length: 30 }, (_, index) => ({
            _id: `${index}`,
            fields: { message: 'x'.repeat(30_000) },
          }))
        )
      ).success
    ).toBe(false);
  });
});

describe('inferred feature identification route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects _identify/inferred with 409 while paused before touching inference', async () => {
    const getKnowledgeIndicatorClient = vi.fn();
    const handlerParams = {
      params: { path: { streamName: 'logs.test' }, body: null },
      request: {},
      getScopedClients: vi.fn().mockResolvedValue({
        licensing: {},
        getKnowledgeIndicatorClient,
      }),
      server: {},
      maintenanceService: makeMaintenanceService('paused'),
    } as unknown as InferredHandlerParams;

    await expect(inferredRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(mockIdentifyInferredFeatures).not.toHaveBeenCalled();
    expect(getKnowledgeIndicatorClient).not.toHaveBeenCalled();
  });

  it('identifies inferred features and bootstraps the sync workflow while enabled', async () => {
    const {
      handlerParams,
      request,
      stream,
      kiClient,
      agentBuilder,
      server,
      licensing,
      maintenanceService,
      telemetry,
      identifyResult,
      ensureEnabled,
    } = makeInferredHandlerParams();

    await expect(inferredRoute.handler(handlerParams)).resolves.toEqual({
      ...identifyResult,
      connectorId: 'connector-1',
    });

    expect(assertSignificantEventsAccess).toHaveBeenCalledWith({ server, licensing });
    expect(maintenanceService.getState).toHaveBeenCalledWith({ request });
    expect(mockIdentifyInferredFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        agentBuilder,
        request,
        kiClient,
        streamName: 'logs.test',
        streamType: 'logs',
        connectorId: 'connector-1',
        runId: 'run-1',
        iteration: 2,
        documents: [{ _id: 'document-1', fields: { message: 'test message' } }],
        totalFilters: 3,
        filtersCapped: false,
        hasFilteredDocuments: true,
        tuning: {
          max_excluded_features_in_prompt: 5,
          maxPreviouslyIdentifiedFeatures: 6,
        },
        trackFeaturesIdentified: expect.any(Function),
      })
    );
    expect(mockGetStreamTypeFromDefinition).toHaveBeenCalledWith(stream);
    expect(telemetry.trackFeaturesIdentified).not.toHaveBeenCalled();
    expect(ensureEnabled).toHaveBeenCalledWith({ request });
  });

  it('normalizes a blank run id before identifying inferred features', async () => {
    const { handlerParams } = makeInferredHandlerParams();
    handlerParams.params.body.runId = '';

    await inferredRoute.handler(handlerParams);

    const { runId } = mockIdentifyInferredFeatures.mock.calls[0][0];
    expect(runId).toEqual(expect.any(String));
    expect(runId).not.toBe('');
  });

  it('returns identification results when sync workflow bootstrap fails', async () => {
    const ensureEnabled = vi.fn().mockRejectedValue(new Error('workflow unavailable'));
    const { handlerParams, routeLogger, identifyResult } = makeInferredHandlerParams({
      ensureEnabled,
    });

    await expect(inferredRoute.handler(handlerParams)).resolves.toEqual({
      ...identifyResult,
      connectorId: 'connector-1',
    });
    expect(routeLogger.warn).toHaveBeenCalledWith(
      'Failed to ensure KI sync workflow is enabled: workflow unavailable'
    );
  });
});

describe('computed feature identification route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects _identify/computed with 409 while paused', async () => {
    const getKnowledgeIndicatorClient = vi.fn();
    const handlerParams = {
      params: { path: { streamName: 'logs.test' }, body: null },
      request: {},
      getScopedClients: vi.fn().mockResolvedValue({
        licensing: {},
        getKnowledgeIndicatorClient,
      }),
      server: {},
      maintenanceService: makeMaintenanceService('paused'),
    } as unknown as ComputedHandlerParams;

    await expect(computedRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(getKnowledgeIndicatorClient).not.toHaveBeenCalled();
  });

  it('identifies computed features and maps the route response while enabled', async () => {
    const {
      handlerParams,
      request,
      stream,
      kiClient,
      streamDataEsClient,
      server,
      licensing,
      maintenanceService,
      identifyResult,
    } = makeComputedHandlerParams();

    await expect(computedRoute.handler(handlerParams)).resolves.toEqual({
      computedFeatures: identifyResult.features,
      computedFeaturesCount: identifyResult.features.length,
      errors: identifyResult.errors,
    });

    expect(assertSignificantEventsAccess).toHaveBeenCalledWith({ server, licensing });
    expect(maintenanceService.getState).toHaveBeenCalledWith({ request });
    expect(mockIdentifyComputedFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        stream,
        streamName: 'logs.test',
        start: 100,
        end: 200,
        esClient: streamDataEsClient,
        kiClient,
        runId: 'run-1',
        timeoutMs: 7_000,
        signal: expect.any(AbortSignal),
      })
    );
  });
});

describe('should identify features route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows _should_identify while paused', async () => {
    const kiClient = {};
    const maintenanceService = makeMaintenanceService('paused');
    mockShouldIdentifyFeatures.mockResolvedValue(true);
    const handlerParams = {
      params: {
        path: { streamName: 'logs.test' },
        query: { thresholdHours: 24 },
      },
      request: {},
      getScopedClients: vi.fn().mockResolvedValue({
        licensing: {},
        getKnowledgeIndicatorClient: vi.fn().mockResolvedValue(kiClient),
      }),
      server: {},
      maintenanceService,
    } as unknown as ShouldIdentifyHandlerParams;

    await expect(shouldIdentifyRoute.handler(handlerParams)).resolves.toBe(true);
    expect(maintenanceService.getState).not.toHaveBeenCalled();
    expect(mockShouldIdentifyFeatures).toHaveBeenCalledWith({
      kiClient,
      streamName: 'logs.test',
      thresholdHours: 24,
    });
  });
});
