/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { resolveScopedModel } from './scoped_model';

const FEATURE_ID = 'threat_intel_enrich';

const request = {} as KibanaRequest;

const createInference = (): jest.Mocked<InferenceServerStart> =>
  ({
    getChatModel: jest.fn().mockResolvedValue({ chatModel: true }),
    getClient: jest.fn().mockReturnValue({ client: true }),
    getConnectorById: jest
      .fn()
      .mockImplementation(async (connectorId: string) => ({ connectorId })),
    getDefaultConnector: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<InferenceServerStart>);

const createSearchInferenceEndpoints = (
  connectorId: string | undefined
): SearchInferenceEndpointsPluginStart =>
  ({
    endpoints: {
      getForFeature: jest.fn().mockResolvedValue({
        endpoints: connectorId ? [{ connectorId }] : [],
        warnings: [],
        soEntryFound: true,
      }),
    },
  } as unknown as SearchInferenceEndpointsPluginStart);

const createUiSettingsClient = (defaultConnector?: string): IUiSettingsClient =>
  ({
    get: jest
      .fn()
      .mockImplementation(async (key: string) =>
        key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR ? defaultConnector : undefined
      ),
  } as unknown as IUiSettingsClient);

describe('resolveScopedModel', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => jest.clearAllMocks());

  it('returns no_inference_plugin when the inference plugin is missing', async () => {
    const outcome = await resolveScopedModel({
      inference: undefined,
      searchInferenceEndpoints: createSearchInferenceEndpoints('any'),
      request,
      uiSettingsClient: createUiSettingsClient(),
      featureId: FEATURE_ID,
      logger,
    });

    expect(outcome).toEqual(expect.objectContaining({ ok: false, reason: 'no_inference_plugin' }));
  });

  it('builds the model from the endpoint registered for the feature', async () => {
    const inference = createInference();

    const outcome = await resolveScopedModel({
      inference,
      searchInferenceEndpoints: createSearchInferenceEndpoints('feature-endpoint'),
      request,
      uiSettingsClient: createUiSettingsClient('genai-default'),
      featureId: FEATURE_ID,
      logger,
    });

    expect(outcome.ok).toBe(true);
    expect(inference.getChatModel).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'feature-endpoint' })
    );
  });

  it('does not fall back to the genAi default when the registry resolves no endpoint', async () => {
    // Both threat-intel features set `ignoreGlobalDefault`, so taking the
    // cluster-wide default here would put enrich and Diamond on the same model.
    const inference = createInference();

    const outcome = await resolveScopedModel({
      inference,
      searchInferenceEndpoints: createSearchInferenceEndpoints(undefined),
      request,
      uiSettingsClient: createUiSettingsClient('genai-default'),
      featureId: FEATURE_ID,
      logger,
    });

    expect(outcome).toEqual(expect.objectContaining({ ok: false, reason: 'no_connector' }));
    expect(inference.getChatModel).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ignoreGlobalDefault'));
  });

  it('falls back to the genAi default when searchInferenceEndpoints is unavailable', async () => {
    const inference = createInference();

    const outcome = await resolveScopedModel({
      inference,
      searchInferenceEndpoints: undefined,
      request,
      uiSettingsClient: createUiSettingsClient('genai-default'),
      featureId: FEATURE_ID,
      logger,
    });

    expect(outcome.ok).toBe(true);
    expect(inference.getChatModel).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'genai-default' })
    );
  });

  it('logs a warning when reading the default-connector UI setting fails', async () => {
    // A `uiSettingsClient.get` failure (setting not registered, serialization,
    // permission fault) used to fall through silently. It must surface a warn so
    // a misconfiguration is diagnosable rather than looking like "no connector".
    const inference = createInference();
    const uiSettingsClient = {
      get: jest.fn().mockRejectedValue(new Error('ui settings unavailable')),
    } as unknown as IUiSettingsClient;

    await resolveScopedModel({
      inference,
      searchInferenceEndpoints: undefined,
      request,
      uiSettingsClient,
      featureId: FEATURE_ID,
      logger,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR)
    );
  });

  it('reports no_connector when the feature endpoint cannot be built', async () => {
    const inference = createInference();
    inference.getChatModel.mockRejectedValue(new Error('endpoint missing on this deployment'));

    const outcome = await resolveScopedModel({
      inference,
      searchInferenceEndpoints: createSearchInferenceEndpoints('feature-endpoint'),
      request,
      uiSettingsClient: createUiSettingsClient('genai-default'),
      featureId: FEATURE_ID,
      logger,
    });

    // Degrading to the cluster-wide default here would silently move this stage
    // off the tier an operator picked for it.
    expect(outcome).toEqual(expect.objectContaining({ ok: false, reason: 'no_connector' }));
    expect(inference.getChatModel).not.toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'genai-default' })
    );
  });

  it('returns no_connector when nothing resolves', async () => {
    const outcome = await resolveScopedModel({
      inference: createInference(),
      searchInferenceEndpoints: createSearchInferenceEndpoints(undefined),
      request,
      uiSettingsClient: createUiSettingsClient(),
      featureId: FEATURE_ID,
      logger,
    });

    expect(outcome).toEqual(expect.objectContaining({ ok: false, reason: 'no_connector' }));
  });
});

// Each feature registers two recommended endpoints so there is somewhere to go when
// the preferred one is unusable. Only trying the head meant a registered-but-broken
// endpoint skipped straight past the alternative to a hard failure.
describe('resolveScopedModel — endpoint fallback within a feature', () => {
  const twoEndpoints = {
    endpoints: {
      getForFeature: jest.fn().mockResolvedValue({
        endpoints: [{ connectorId: '.preferred' }, { connectorId: '.alternative' }],
      }),
    },
  };

  it('falls through to the next registered endpoint when the first cannot build', async () => {
    const inference = {
      getChatModel: jest.fn(async ({ connectorId }: { connectorId: string }) => {
        if (connectorId === '.preferred') throw new Error('endpoint unavailable');
        return {};
      }),
      getClient: jest.fn(() => ({})),
      getConnectorById: jest.fn(async () => ({ connectorId: '.alternative' })),
    };

    const result = await resolveScopedModel({
      inference: inference as never,
      searchInferenceEndpoints: twoEndpoints as never,
      request: {} as never,
      uiSettingsClient: { get: jest.fn() } as never,
      featureId: 'threat_intel_enrich',
      logger: loggingSystemMock.createLogger(),
    });

    expect(result.ok).toBe(true);
    expect(inference.getChatModel).toHaveBeenCalledTimes(2);
    expect(inference.getConnectorById).toHaveBeenCalledWith('.alternative', expect.anything());
  });

  it('stops at the first endpoint that builds', async () => {
    const inference = {
      getChatModel: jest.fn(async () => ({})),
      getClient: jest.fn(() => ({})),
      getConnectorById: jest.fn(async () => ({ connectorId: '.preferred' })),
    };

    const result = await resolveScopedModel({
      inference: inference as never,
      searchInferenceEndpoints: twoEndpoints as never,
      request: {} as never,
      uiSettingsClient: { get: jest.fn() } as never,
      featureId: 'threat_intel_enrich',
      logger: loggingSystemMock.createLogger(),
    });

    expect(result.ok).toBe(true);
    expect(inference.getChatModel).toHaveBeenCalledTimes(1);
  });
});
