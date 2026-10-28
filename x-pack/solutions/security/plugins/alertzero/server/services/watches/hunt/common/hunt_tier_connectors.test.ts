/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { readHuntTier, walkHuntTierConnectors } from './hunt_tier_connectors';

const request = {} as KibanaRequest;
const logger = loggingSystemMock.createLogger();
const featureId = 'alertzero_frontier';

const registryReturning = (result: unknown) =>
  ({
    endpoints: { getForFeature: jest.fn().mockResolvedValue(result) },
  } as unknown as SearchInferenceEndpointsPluginStart);

const deployment = ({
  genAiDefault,
  inferenceDefault,
}: { genAiDefault?: string; inferenceDefault?: string } = {}) => ({
  inference: {
    getDefaultConnector: jest
      .fn()
      .mockResolvedValue(inferenceDefault ? { connectorId: inferenceDefault } : undefined),
  } as never,
  uiSettingsClient: { get: jest.fn().mockResolvedValue(genAiDefault) } as never,
});

describe('readHuntTier', () => {
  it('reports the first endpoint with how the registry got there', async () => {
    const searchInferenceEndpoints = registryReturning({
      endpoints: [{ connectorId: 'opus', isRecommended: true }, { connectorId: 'other' }],
      soEntryFound: false,
    });

    expect(await readHuntTier({ searchInferenceEndpoints, featureId, request, logger })).toEqual({
      connectorId: 'opus',
      soEntryFound: false,
      isRecommended: true,
    });
  });

  it('keeps soEntryFound when a saved pick left nothing behind', async () => {
    const searchInferenceEndpoints = registryReturning({ endpoints: [], soEntryFound: true });

    expect(await readHuntTier({ searchInferenceEndpoints, featureId, request, logger })).toEqual({
      connectorId: undefined,
      soEntryFound: true,
      isRecommended: false,
    });
  });

  it('reads nothing, and warns, when the registry read fails', async () => {
    const searchInferenceEndpoints = {
      endpoints: { getForFeature: jest.fn().mockRejectedValue(new Error('so read failed')) },
    } as unknown as SearchInferenceEndpointsPluginStart;

    expect(await readHuntTier({ searchInferenceEndpoints, featureId, request, logger })).toEqual({
      soEntryFound: false,
      isRecommended: false,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('so read failed'));
  });

  it('words the failure for a readiness report differently from a hunt resolving a model', async () => {
    const searchInferenceEndpoints = {
      endpoints: { getForFeature: jest.fn().mockRejectedValue(new Error('so read failed')) },
    } as unknown as SearchInferenceEndpointsPluginStart;
    const reportLogger = loggingSystemMock.createLogger();

    await readHuntTier({
      searchInferenceEndpoints,
      featureId,
      request,
      logger: reportLogger,
      purpose: 'report',
    });

    expect(reportLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[hunt:readiness]'));
    expect(reportLogger.warn).not.toHaveBeenCalledWith(expect.stringContaining('[hunt:connector]'));
  });

  it('reads nothing without the registry', async () => {
    expect(
      await readHuntTier({ searchInferenceEndpoints: undefined, featureId, request, logger })
    ).toEqual({ soEntryFound: false, isRecommended: false });
  });
});

describe('walkHuntTierConnectors', () => {
  const walk = (
    searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined,
    defaults: ReturnType<typeof deployment>,
    accept: (connector: { connectorId: string }) => Promise<string | undefined>
  ) =>
    walkHuntTierConnectors({
      ...defaults,
      searchInferenceEndpoints,
      featureId,
      request,
      logger,
      accept: (connector) => accept(connector),
    });

  it('offers the tier endpoint, then the genAi default, then the inference default, in that order', async () => {
    const seen: string[] = [];
    const searchInferenceEndpoints = registryReturning({
      endpoints: [{ connectorId: 'tier-first' }],
      soEntryFound: false,
    });

    const result = await walk(
      searchInferenceEndpoints,
      deployment({ genAiDefault: 'genai', inferenceDefault: 'inference' }),
      async ({ connectorId }) => {
        seen.push(connectorId);
        return undefined;
      }
    );

    expect(seen).toEqual(['tier-first', 'genai', 'inference']);
    expect(result.accepted).toBeUndefined();
  });

  it('stops at the first accepted candidate and never reads the deployment defaults', async () => {
    const defaults = deployment({ genAiDefault: 'genai' });
    const searchInferenceEndpoints = registryReturning({
      endpoints: [{ connectorId: 'tier-first', isRecommended: true }],
      soEntryFound: false,
    });

    const result = await walk(
      searchInferenceEndpoints,
      defaults,
      async ({ connectorId }) => connectorId
    );

    expect(result.accepted).toEqual({
      value: 'tier-first',
      connector: { connectorId: 'tier-first', label: `tier:${featureId}`, source: 'tier' },
    });
    expect((defaults.uiSettingsClient as { get: jest.Mock }).get).not.toHaveBeenCalled();
  });

  it('moves on to the deployment defaults when the tier endpoint is rejected', async () => {
    const searchInferenceEndpoints = registryReturning({
      endpoints: [{ connectorId: 'tier-first' }],
      soEntryFound: false,
    });

    const result = await walk(
      searchInferenceEndpoints,
      deployment({ genAiDefault: 'genai' }),
      async ({ connectorId }) => (connectorId === 'genai' ? connectorId : undefined)
    );

    expect(result.accepted?.connector).toEqual({
      connectorId: 'genai',
      label: 'genAi-default',
      source: 'fallback',
    });
  });

  it('goes straight to the deployment defaults when the tier list is empty, keeping what the registry said', async () => {
    const searchInferenceEndpoints = registryReturning({ endpoints: [], soEntryFound: true });

    const result = await walk(
      searchInferenceEndpoints,
      deployment({ inferenceDefault: 'inference' }),
      async ({ connectorId }) => connectorId
    );

    expect(result.tier.soEntryFound).toBe(true);
    expect(result.accepted?.connector.source).toBe('fallback');
  });

  it('accepts nothing when no candidate exists', async () => {
    const result = await walk(
      registryReturning({ endpoints: [], soEntryFound: false }),
      deployment(),
      async () => 'x'
    );

    expect(result.accepted).toBeUndefined();
  });
});
