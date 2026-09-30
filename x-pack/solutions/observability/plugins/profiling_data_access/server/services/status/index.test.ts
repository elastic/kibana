/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import { createGetOtelStatusService } from '../../otel/services/status';
import { createGetStatusService } from '../../universal_profiling/services/status';
import type { RegisterServicesParams } from '../register_services';
import { createGetProfilingStatusService } from '.';

jest.mock('../../otel/services/status', () => ({
  createGetOtelStatusService: jest.fn(),
}));

jest.mock('../../universal_profiling/services/status', () => ({
  createGetStatusService: jest.fn(),
}));

const mockedCreateGetOtelStatusService = jest.mocked(createGetOtelStatusService);
const mockedCreateGetStatusService = jest.mocked(createGetStatusService);

describe('createGetProfilingStatusService', () => {
  const internalUserEsClient = {} as IScopedClusterClient['asInternalUser'];
  const esClient = {
    asInternalUser: internalUserEsClient,
    asCurrentUser: {},
  } as IScopedClusterClient;
  const soClient = {} as SavedObjectsClientContract;

  const getOtelStatus = jest.fn();
  const getUniversalProfilingStatus = jest.fn();
  const profilingStatus = jest.fn();
  const createProfilingEsClient = jest
    .fn()
    .mockReturnValue({ universalProfiling: { status: profilingStatus } });

  const createService = (
    buildFlavor: RegisterServicesParams['buildFlavor'] = 'traditional'
  ): ReturnType<typeof createGetProfilingStatusService> =>
    createGetProfilingStatusService({
      buildFlavor,
      createProfilingEsClient,
      logger: { debug: jest.fn() },
      deps: {},
    } as unknown as RegisterServicesParams);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateGetOtelStatusService.mockReturnValue(getOtelStatus);
    mockedCreateGetStatusService.mockReturnValue(getUniversalProfilingStatus);
    profilingStatus.mockResolvedValue({ profiling: { enabled: true } });
    getOtelStatus.mockResolvedValue({ isAvailable: true, hasData: true });
    getUniversalProfilingStatus.mockResolvedValue({
      profiling_enabled: true,
      has_setup: true,
      has_data: false,
      pre_8_9_1_data: true,
    });
  });

  it('skips the schema checks when profiling is disabled in Elasticsearch', async () => {
    profilingStatus.mockResolvedValue({ profiling: { enabled: false } });

    await expect(createService()({ esClient, soClient })).resolves.toEqual({
      isEnabled: false,
      otel: { isAvailable: true, hasData: false },
      universalProfiling: {
        isAvailable: true,
        hasSetup: false,
        hasData: false,
        hasLegacyData: false,
      },
    });
    expect(getOtelStatus).not.toHaveBeenCalled();
    expect(getUniversalProfilingStatus).not.toHaveBeenCalled();
  });

  it('reads whether profiling is enabled as the internal user', async () => {
    await createService()({ esClient, soClient });

    expect(createProfilingEsClient).toHaveBeenCalledWith({
      esClient: internalUserEsClient,
      abortSignal: undefined,
    });
  });

  it('combines the OTel and Universal Profiling statuses on traditional builds', async () => {
    await expect(createService()({ esClient, soClient, spaceId: 'my-space' })).resolves.toEqual({
      isEnabled: true,
      otel: { isAvailable: true, hasData: true },
      universalProfiling: {
        isAvailable: true,
        hasSetup: true,
        hasData: false,
        hasLegacyData: true,
      },
    });
    expect(getUniversalProfilingStatus).toHaveBeenCalledWith({
      esClient,
      soClient,
      spaceId: 'my-space',
      abortSignal: undefined,
    });
  });

  it('skips the Universal Profiling checks on serverless builds', async () => {
    await expect(createService('serverless')({ esClient, soClient })).resolves.toEqual({
      isEnabled: true,
      otel: { isAvailable: true, hasData: true },
      universalProfiling: {
        isAvailable: false,
        hasSetup: false,
        hasData: false,
        hasLegacyData: false,
      },
    });
    expect(getUniversalProfilingStatus).not.toHaveBeenCalled();
    expect(getOtelStatus).toHaveBeenCalled();
  });

  it('reports Universal Profiling as unavailable on serverless when profiling is disabled', async () => {
    profilingStatus.mockResolvedValue({ profiling: { enabled: false } });

    const status = await createService('serverless')({ esClient, soClient });

    expect(status.universalProfiling.isAvailable).toBe(false);
  });

  it('passes the abort signal to every check', async () => {
    const abortSignal = new AbortController().signal;

    await createService()({ esClient, soClient, abortSignal });

    expect(createProfilingEsClient).toHaveBeenCalledWith({
      esClient: internalUserEsClient,
      abortSignal,
    });
    expect(getOtelStatus).toHaveBeenCalledWith({ esClient, abortSignal });
    expect(getUniversalProfilingStatus).toHaveBeenCalledWith(
      expect.objectContaining({ abortSignal })
    );
  });

  it('rethrows when the profiling status request fails', async () => {
    const error = new Error('status failed');
    profilingStatus.mockRejectedValue(error);

    await expect(createService()({ esClient, soClient })).rejects.toBe(error);
  });

  it('rethrows when the OTel check fails', async () => {
    const error = new Error('otel failed');
    getOtelStatus.mockRejectedValue(error);

    await expect(createService()({ esClient, soClient })).rejects.toBe(error);
  });

  it('rethrows when the Universal Profiling check fails', async () => {
    const error = new Error('universal profiling failed');
    getUniversalProfilingStatus.mockRejectedValue(error);

    await expect(createService()({ esClient, soClient })).rejects.toBe(error);
  });
});
