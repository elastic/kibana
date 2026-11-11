/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NightshiftModelNotFoundError } from '@kbn/significant-events-schema';
import {
  EVENT_CHAIN_DEPTH_HEADER,
  EVENT_CHAIN_SOURCE_EXECUTION_HEADER,
} from '@kbn/workflows-extensions/server';
import type { SignificantEventsMaintenanceState } from '../../../../../common/maintenance/state_machine';
import { FEATURE_IDENTIFICATION_AGENT_ID } from '../../../../agent_builder/agents/feature_identification';
import {
  MAX_INFERENCE_DOCUMENT_BYTES,
  MAX_INFERENCE_DOCUMENT_FIELDS,
  MAX_INFERENCE_FIELD_NAME_LENGTH,
} from '../../../../lib/significant_events/features';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { internalIdentifyKIFeaturesRoutes } from './identify_route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const mockGetStreamSamplingSource = jest.fn();
const mockGetStreamTypeFromDefinition = jest.fn();
const mockIdentifyInferredFeatures = jest.fn();
const mockBuildFeatureIdentificationInput = jest.fn();
const mockIdentifyComputedFeatures = jest.fn();
const mockShouldIdentifyFeatures = jest.fn();
const mockResolveNightshiftModelForRequest = jest.fn(
  async ({ requestedId }: { requestedId?: string }) => requestedId ?? 'default-connector'
);

jest.mock('@kbn/streams-schema', () => ({
  getStreamSamplingSource: (...args: unknown[]) => mockGetStreamSamplingSource(...args),
  getStreamTypeFromDefinition: (...args: unknown[]) => mockGetStreamTypeFromDefinition(...args),
}));

jest.mock('../../../../lib/significant_events/features', () => ({
  MS_PER_DAY: 86_400_000,
  MAX_INFERENCE_DOCUMENTS_BYTES: 288 * 1024,
  MAX_INFERENCE_DOCUMENT_BYTES: 32 * 1024,
  MAX_INFERENCE_DOCUMENT_FIELDS: 100,
  MAX_INFERENCE_FIELD_NAME_LENGTH: 1024,
  buildTelemetry: jest.fn(),
  prepareInferredSampling: jest.fn(),
  buildFeatureIdentificationInput: (...args: unknown[]) =>
    mockBuildFeatureIdentificationInput(...args),
  identifyInferredFeatures: (...args: unknown[]) => mockIdentifyInferredFeatures(...args),
  identifyComputedFeatures: (...args: unknown[]) => mockIdentifyComputedFeatures(...args),
}));

jest.mock('../../../../lib/significant_events/features/should_identify_features', () => ({
  shouldIdentifyFeatures: (...args: unknown[]) => mockShouldIdentifyFeatures(...args),
}));

jest.mock('@kbn/nightshift-ai', () => ({
  ...jest.requireActual('@kbn/nightshift-ai'),
  resolveNightshiftModelForRequest: (options: { requestedId?: string }) =>
    mockResolveNightshiftModelForRequest(options),
}));

const prepareRoute =
  internalIdentifyKIFeaturesRoutes[
    'POST /internal/streams/{sourceId}/features/_identify/inferred/prepare'
  ];
const inputRoute =
  internalIdentifyKIFeaturesRoutes[
    'POST /internal/streams/{sourceId}/features/_identify/inferred/input'
  ];
const inferredRoute =
  internalIdentifyKIFeaturesRoutes['POST /internal/streams/{sourceId}/features/_identify/inferred'];
const computedRoute =
  internalIdentifyKIFeaturesRoutes['POST /internal/streams/{sourceId}/features/_identify/computed'];
const shouldIdentifyRoute =
  internalIdentifyKIFeaturesRoutes['GET /internal/streams/{sourceId}/features/_should_identify'];

type InputHandlerParams = Parameters<typeof inputRoute.handler>[0];
type InferredHandlerParams = Parameters<typeof inferredRoute.handler>[0];
type ComputedHandlerParams = Parameters<typeof computedRoute.handler>[0];
type ShouldIdentifyHandlerParams = Parameters<typeof shouldIdentifyRoute.handler>[0];

const createInputParams = (documents: Array<{ _id: string; fields: Record<string, unknown> }>) => ({
  path: { sourceId: 'logs.test' },
  body: {
    documents,
    maxExcludedFeaturesInPrompt: 10,
  },
});

const makeMaintenanceService = (state: SignificantEventsMaintenanceState = 'enabled') => ({
  getState: jest.fn().mockResolvedValue(state),
});

const makeRequest = () => ({
  spaceId: 'default',
  events: {
    aborted$: {
      subscribe: jest.fn(),
    },
  },
});

const makeRouteLogger = () => ({
  error: jest.fn(),
  warn: jest.fn(),
});

const makeServerDeps = () => {
  const request = makeRequest();
  const routeLogger = makeRouteLogger();
  const source = {
    id: 'logs.test',
    title: 'logs.test',
    description: 'Checkout logs',
    view_name: '$.nightshift.sources.default.logs',
  };
  const kiClient = {};
  const conversation = { rounds: [{ steps: [] }] };
  const conversationClient = {
    get: jest.fn().mockResolvedValue(conversation),
    create: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
  };
  const agentBuilder = {
    agents: { ensure: jest.fn().mockResolvedValue(undefined) },
    conversations: { getScopedClient: jest.fn().mockResolvedValue(conversationClient) },
  };
  const server = {
    agentBuilder,
    inference: {},
    core: { savedObjects: {}, uiSettings: {} },
  };
  const licensing = {};
  const maintenanceService = makeMaintenanceService();
  const telemetry = { trackFeaturesIdentified: jest.fn() };

  mockGetStreamTypeFromDefinition.mockReturnValue('logs');

  const common = {
    request,
    getScopedClients: jest.fn().mockResolvedValue({
      sourcesClient: { get: jest.fn().mockResolvedValue({ source }) },
      licensing,
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
    }),
    server,
    logger: { get: jest.fn().mockReturnValue(routeLogger) },
    telemetry,
    maintenanceService,
  };

  return {
    common,
    request,
    kiClient,
    agentBuilder,
    conversation,
    conversationClient,
    server,
    licensing,
    maintenanceService,
    telemetry,
  };
};

const makeInputHandlerParams = () => {
  const deps = makeServerDeps();
  mockBuildFeatureIdentificationInput.mockResolvedValue({ message: 'identify these documents' });

  const handlerParams = {
    ...deps.common,
    params: {
      path: { sourceId: 'logs.test' },
      body: {
        connectorId: 'connector-1',
        documents: [{ _id: 'document-1', fields: { message: 'test message' } }],
        maxExcludedFeaturesInPrompt: 5,
        maxPreviouslyIdentifiedFeatures: 6,
      },
    },
  } as unknown as InputHandlerParams;

  return { ...deps, handlerParams };
};

const makeInferredHandlerParams = () => {
  const deps = makeServerDeps();
  const identifyResult = { features: [], documentsSampled: 10 };
  mockIdentifyInferredFeatures.mockResolvedValue(identifyResult);

  const handlerParams = {
    ...deps.common,
    params: {
      path: { sourceId: 'logs.test' },
      body: {
        connectorId: 'connector-1',
        conversationId: 'conversation-1',
        runId: 'run-1',
        iteration: 2,
        documents: [{ _id: 'document-1', fields: { message: 'test message' } }],
        samplingTelemetry: {
          totalFilters: 3,
          filtersCapped: false,
          hasFilteredDocuments: true,
        },
      },
    },
  } as unknown as InferredHandlerParams;

  return { ...deps, handlerParams, identifyResult };
};

const makeComputedHandlerParams = () => {
  const request = makeRequest();
  const routeLogger = makeRouteLogger();
  const source = {
    id: 'logs.test',
    title: 'logs.test',
    description: 'Checkout logs',
    view_name: '$.nightshift.sources.default.logs',
  };
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
      path: { sourceId: 'logs.test' },
      body: {
        start: 100,
        end: 200,
        runId: 'run-1',
        computedFeaturesTimeoutMs: 7_000,
      },
    },
    request,
    getScopedClients: jest.fn().mockResolvedValue({
      streamDataEsClient,
      sourcesClient: { get: jest.fn().mockResolvedValue({ source }) },
      tuningConfig: {},
      licensing,
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
    }),
    server,
    logger: { get: jest.fn().mockReturnValue(routeLogger) },
    telemetry: {},
    maintenanceService,
  } as unknown as ComputedHandlerParams;

  return {
    handlerParams,
    request,
    routeLogger,
    source,
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
      path: { sourceId: 'logs.test' },
      body: {
        sampleSize: 20,
        entityFilteredRatio: 0,
        diverseRatio: 1,
        maxEntityFilters: 10,
        samplingTimeoutMs: 1_000,
      },
    };

    expect(prepareRoute.params.safeParse(prepareParams).success).toBe(true);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, maxEntityFilters: undefined },
      }).success
    ).toBe(false);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, maxEntityFilters: 51 },
      }).success
    ).toBe(false);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, samplingTimeoutMs: undefined },
      }).success
    ).toBe(false);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { entityFilteredRatio: 0 },
      }).success
    ).toBe(false);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, entityFilteredRatio: undefined },
      }).success
    ).toBe(false);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, diverseRatio: undefined },
      }).success
    ).toBe(false);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, sampleSize: 101 },
      }).success
    ).toBe(false);
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
        path: { sourceId: 'logs.test' },
        body: { computedFeaturesTimeoutMs: 240_001 },
      }).success
    ).toBe(false);
    expect(
      computedRoute.params.safeParse({
        path: { sourceId: 'logs.test' },
        body: { computedFeaturesTimeoutMs: 60_000 },
      }).success
    ).toBe(true);
    expect(
      computedRoute.params.safeParse({
        path: { sourceId: 'logs.test' },
        body: {},
      }).success
    ).toBe(false);
  });

  it('requires maxExcludedFeaturesInPrompt on the input route', () => {
    const params = createInputParams([{ _id: '1', fields: { message: 'ok' } }]);
    expect(inputRoute.params.safeParse(params).success).toBe(true);
    expect(
      inputRoute.params.safeParse({
        ...params,
        body: { ...params.body, maxExcludedFeaturesInPrompt: undefined },
      }).success
    ).toBe(false);
    expect(
      inputRoute.params.safeParse({
        ...params,
        body: { ...params.body, maxExcludedFeaturesInPrompt: 51 },
      }).success
    ).toBe(false);
  });

  it('enforces the compact inference document contract', () => {
    expect(
      inputRoute.params.safeParse(createInputParams([{ _id: '1', fields: { message: 'ok' } }]))
        .success
    ).toBe(true);
    expect(inputRoute.params.safeParse(createInputParams([])).success).toBe(false);
    expect(
      inputRoute.params.safeParse(
        createInputParams([
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
      inputRoute.params.safeParse(
        createInputParams([
          {
            _id: '1',
            fields: { ['x'.repeat(MAX_INFERENCE_FIELD_NAME_LENGTH + 1)]: 'value' },
          },
        ])
      ).success
    ).toBe(false);
    expect(
      inputRoute.params.safeParse(
        createInputParams([
          { _id: '1', fields: { message: 'x'.repeat(MAX_INFERENCE_DOCUMENT_BYTES) } },
        ])
      ).success
    ).toBe(false);
    expect(
      inputRoute.params.safeParse(
        createInputParams(
          Array.from({ length: 30 }, (_, index) => ({
            _id: `${index}`,
            fields: { message: 'x'.repeat(30_000) },
          }))
        )
      ).success
    ).toBe(false);
  });
});

describe('inferred feature identification input route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects _identify/inferred/input with 409 while paused before building anything', async () => {
    const { handlerParams, common } = makeInputHandlerParams();
    handlerParams.maintenanceService = makeMaintenanceService(
      'paused'
    ) as unknown as InputHandlerParams['maintenanceService'];

    await expect(inputRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(mockBuildFeatureIdentificationInput).not.toHaveBeenCalled();
    expect(common.server.agentBuilder.agents.ensure).not.toHaveBeenCalled();
  });

  it('installs the agent in the request space, then returns what the ai.agent step runs with', async () => {
    const { handlerParams, agentBuilder, conversationClient, kiClient } = makeInputHandlerParams();

    await expect(inputRoute.handler(handlerParams)).resolves.toEqual({
      agentId: FEATURE_IDENTIFICATION_AGENT_ID,
      connectorId: 'connector-1',
      conversationId: 'conversation-1',
      message: 'identify these documents',
    });

    expect(conversationClient.create).toHaveBeenCalledWith({
      agentId: FEATURE_IDENTIFICATION_AGENT_ID,
      title: 'Feature identification: logs.test',
      accessControl: { access_mode: 'public' },
    });

    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        agent: expect.objectContaining({ id: FEATURE_IDENTIFICATION_AGENT_ID }),
      })
    );
    expect(mockBuildFeatureIdentificationInput).toHaveBeenCalledWith(
      expect.objectContaining({
        kiClient,
        sourceId: 'logs.test',
        documents: [{ _id: 'document-1', fields: { message: 'test message' } }],
        tuning: { maxExcludedFeaturesInPrompt: 5, maxPreviouslyIdentifiedFeatures: 6 },
      })
    );
  });

  it('fails the request when the agent cannot be installed', async () => {
    const { handlerParams, agentBuilder } = makeInputHandlerParams();
    agentBuilder.agents.ensure.mockRejectedValue(new Error('agents index unavailable'));

    await expect(inputRoute.handler(handlerParams)).rejects.toThrow('agents index unavailable');
    expect(mockBuildFeatureIdentificationInput).not.toHaveBeenCalled();
  });

  it('maps an unknown connector override to a 400 response', async () => {
    const { handlerParams } = makeInputHandlerParams();
    mockResolveNightshiftModelForRequest.mockRejectedValueOnce(
      new NightshiftModelNotFoundError('missing-model')
    );
    handlerParams.params.body.connectorId = 'missing-model';

    await expect(inputRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
    expect(mockBuildFeatureIdentificationInput).not.toHaveBeenCalled();
  });
});

describe('inferred feature identification route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects _identify/inferred with 409 while paused before reading the conversation', async () => {
    const { handlerParams, agentBuilder } = makeInferredHandlerParams();
    handlerParams.maintenanceService = makeMaintenanceService(
      'paused'
    ) as unknown as InferredHandlerParams['maintenanceService'];

    await expect(inferredRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(mockIdentifyInferredFeatures).not.toHaveBeenCalled();
    expect(agentBuilder.conversations.getScopedClient).not.toHaveBeenCalled();
  });

  it('reconciles the conversation the agent step stored', async () => {
    const {
      handlerParams,
      request,
      kiClient,
      agentBuilder,
      conversation,
      conversationClient,
      server,
      licensing,
      maintenanceService,
      telemetry,
      identifyResult,
    } = makeInferredHandlerParams();

    await expect(inferredRoute.handler(handlerParams)).resolves.toEqual({
      ...identifyResult,
      connectorId: 'connector-1',
    });

    expect(assertSignificantEventsAccess).toHaveBeenCalledWith({ server, licensing });
    expect(maintenanceService.getState).toHaveBeenCalledWith({ request });
    expect(agentBuilder.conversations.getScopedClient).toHaveBeenCalledWith({ request });
    expect(conversationClient.get).toHaveBeenCalledWith('conversation-1');
    expect(mockIdentifyInferredFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        kiClient,
        agentConversation: conversation,
        sourceId: 'logs.test',
        connectorId: 'connector-1',
        runId: 'run-1',
        iteration: 2,
        documents: [{ _id: 'document-1', fields: { message: 'test message' } }],
        totalFilters: 3,
        filtersCapped: false,
        hasFilteredDocuments: true,
        trackFeaturesIdentified: expect.any(Function),
      })
    );
    expect(telemetry.trackFeaturesIdentified).not.toHaveBeenCalled();
  });

  it('reconciles a failed iteration when the conversation cannot be read', async () => {
    const { handlerParams, conversationClient } = makeInferredHandlerParams();
    conversationClient.get.mockRejectedValue(new Error('conversation not found'));

    await inferredRoute.handler(handlerParams);

    expect(mockIdentifyInferredFeatures).toHaveBeenCalledWith(
      expect.objectContaining({ agentConversation: undefined })
    );
  });

  it('normalizes a blank run id before identifying inferred features', async () => {
    const { handlerParams } = makeInferredHandlerParams();
    handlerParams.params.body.runId = '';

    await inferredRoute.handler(handlerParams);

    const { runId } = mockIdentifyInferredFeatures.mock.calls[0][0];
    expect(runId).toEqual(expect.any(String));
    expect(runId).not.toBe('');
  });

  it('uses trusted workflow request provenance independently of the legacy run id', async () => {
    const { handlerParams, telemetry } = makeInferredHandlerParams();
    Object.assign(handlerParams.request, {
      isInternalApiRequest: true,
      headers: {
        [EVENT_CHAIN_DEPTH_HEADER]: '0',
        [EVENT_CHAIN_SOURCE_EXECUTION_HEADER]: 'workflow-run-1',
      },
    });
    handlerParams.params.body.parentWorkflowExecutionId = 'onboarding-run-1';

    await inferredRoute.handler(handlerParams);
    const track = mockIdentifyInferredFeatures.mock.calls[0][0].trackFeaturesIdentified;
    track?.({ run_id: 'run-1' } as never);

    expect(telemetry.trackFeaturesIdentified).toHaveBeenCalledWith(
      expect.objectContaining({
        run_id: 'run-1',
        workflow_execution_id: 'workflow-run-1',
        parent_workflow_execution_id: 'onboarding-run-1',
      })
    );
  });
});

describe('computed feature identification route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects _identify/computed with 409 while paused', async () => {
    const getKnowledgeIndicatorClient = jest.fn();
    const handlerParams = {
      params: { path: { sourceId: 'logs.test' }, body: null },
      request: { spaceId: 'default' },
      getScopedClients: jest.fn().mockResolvedValue({
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
        sourceId: 'logs.test',
        target: {
          id: 'logs.test',
          name: 'logs.test',
          description: 'Checkout logs',
          sources: ['$.nightshift.sources.default.logs'],
          samplingSource: '$.nightshift.sources.default.logs',
        },
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
    jest.clearAllMocks();
  });

  it('allows _should_identify while paused', async () => {
    const kiClient = {};
    const maintenanceService = makeMaintenanceService('paused');
    mockShouldIdentifyFeatures.mockResolvedValue(true);
    const handlerParams = {
      params: {
        path: { sourceId: 'logs.test' },
        query: { thresholdHours: 24 },
      },
      request: { spaceId: 'default' },
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        sourcesClient: { get: jest.fn().mockResolvedValue({ source: { id: 'logs.test' } }) },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
      }),
      server: {},
      maintenanceService,
    } as unknown as ShouldIdentifyHandlerParams;

    await expect(shouldIdentifyRoute.handler(handlerParams)).resolves.toBe(true);
    expect(maintenanceService.getState).not.toHaveBeenCalled();
    expect(mockShouldIdentifyFeatures).toHaveBeenCalledWith({
      kiClient,
      sourceId: 'logs.test',
      thresholdHours: 24,
    });
  });
});
