/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

jest.mock('../run', () => ({
  runKiAutomatedResolution: jest.fn(async () => ({ lastRun: { resolutionsCreated: 1 } })),
}));
jest.mock('../../../domain/streams_features', () => ({
  createKnowledgeIndicatorsReader: jest.fn(async () => ({ listEntityFeatures: jest.fn() })),
}));
jest.mock('../../../domain/saved_objects', () => ({
  EntityStoreGlobalStateClient: jest.fn(),
}));
jest.mock('../../../domain/resolution', () => ({
  ResolutionClient: jest.fn(),
}));

import { createKiAutomatedResolutionMaintainerConfig } from '..';
import { runKiAutomatedResolution } from '../run';
import { createKnowledgeIndicatorsReader } from '../../../domain/streams_features';
import { EntityStoreGlobalStateClient } from '../../../domain/saved_objects';

const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as Logger;

const makeCore = () =>
  ({
    getStartServices: jest.fn(async () => [
      { savedObjects: { getScopedClient: jest.fn(() => ({})) } },
    ]),
  } as any);

const makeContext = () => ({
  status: { metadata: { namespace: 'default' }, state: { lastRun: null } },
  abortController: new AbortController(),
  logger,
  esClient: {},
  cpsEsClient: {},
  crudClient: {},
  fakeRequest: {},
  telemetry: { report: jest.fn() },
});

const mockGlobalStateFind = (config: unknown) => {
  (EntityStoreGlobalStateClient as unknown as jest.Mock).mockImplementation(() => ({
    find: jest.fn(async () => config),
  }));
};

describe('createKiAutomatedResolutionMaintainerConfig', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes the expected maintainer identity', () => {
    const config = createKiAutomatedResolutionMaintainerConfig({ core: makeCore() });
    expect(config.id).toBe('ki-automated-resolution');
    expect(config.minLicense).toBe('enterprise');
  });

  it('is a no-op when the flag is disabled', async () => {
    mockGlobalStateFind({
      logsExtraction: { useKiEntityResolution: false, kiEntityResolutionMinConfidence: 90 },
    });
    const config = createKiAutomatedResolutionMaintainerConfig({ core: makeCore() });

    const result = await config.run(makeContext() as any);

    expect(result).toEqual({ lastRun: null });
    expect(createKnowledgeIndicatorsReader).not.toHaveBeenCalled();
    expect(runKiAutomatedResolution).not.toHaveBeenCalled();
  });

  it('is a no-op when no global state exists for the namespace', async () => {
    mockGlobalStateFind(undefined);
    const config = createKiAutomatedResolutionMaintainerConfig({ core: makeCore() });

    const result = await config.run(makeContext() as any);

    expect(result).toEqual({ lastRun: null });
    expect(runKiAutomatedResolution).not.toHaveBeenCalled();
  });

  it('delegates to runKiAutomatedResolution with the configured floor and flags when enabled', async () => {
    mockGlobalStateFind({
      logsExtraction: {
        useKiEntityResolution: true,
        kiEntityResolutionMinConfidence: 80,
        kiEntityResolutionResolveIdpToIdp: true,
        kiEntityResolutionUseRules: true,
      },
    });
    const config = createKiAutomatedResolutionMaintainerConfig({ core: makeCore() });

    await config.run(makeContext() as any);

    expect(createKnowledgeIndicatorsReader).toHaveBeenCalledTimes(1);
    expect(runKiAutomatedResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'default',
        minConfidence: 80,
        resolveIdpToIdp: true,
        useRules: true,
      })
    );
  });

  it('passes useRules=false through when the rules sub-flag is off', async () => {
    mockGlobalStateFind({
      logsExtraction: {
        useKiEntityResolution: true,
        kiEntityResolutionMinConfidence: 90,
        kiEntityResolutionResolveIdpToIdp: false,
        kiEntityResolutionUseRules: false,
      },
    });
    const config = createKiAutomatedResolutionMaintainerConfig({ core: makeCore() });

    await config.run(makeContext() as any);

    expect(runKiAutomatedResolution).toHaveBeenCalledWith(
      expect.objectContaining({ useRules: false })
    );
  });

  it('passes resolveIdpToIdp=false through when the sub-flag is off', async () => {
    mockGlobalStateFind({
      logsExtraction: {
        useKiEntityResolution: true,
        kiEntityResolutionMinConfidence: 90,
        kiEntityResolutionResolveIdpToIdp: false,
      },
    });
    const config = createKiAutomatedResolutionMaintainerConfig({ core: makeCore() });

    await config.run(makeContext() as any);

    expect(runKiAutomatedResolution).toHaveBeenCalledWith(
      expect.objectContaining({ resolveIdpToIdp: false })
    );
  });
});
