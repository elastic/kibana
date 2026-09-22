/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import { createDefaultCloudSetupState } from '../../../common/cloud_setup';
import { createDefaultSetupState, mergePartialSetupStates } from '../../../common/setup';
import type { RegisterServicesParams } from '../register_services';
import { getSetupState } from '../setup_state';
import { createGetStatusService } from '.';

jest.mock('../setup_state', () => ({
  getSetupState: jest.fn(),
}));

const mockedGetSetupState = jest.mocked(getSetupState);

describe('createGetStatusService', () => {
  const registerServicesParams = {
    createProfilingEsClient: jest.fn(),
    logger: {
      debug: jest.fn(),
    },
    deps: {},
  } as unknown as RegisterServicesParams;

  const soClient = {} as SavedObjectsClientContract;
  const esClient = {} as IScopedClusterClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns expected status for cloud setup state', async () => {
    const cloudSetupState = mergePartialSetupStates(createDefaultCloudSetupState(), [
      {
        profiling: { enabled: true },
        data: { available: true },
        resource_management: { enabled: true },
        resources: { created: true, pre_8_9_1_data: false },
        settings: { configured: true },
        policies: {
          collector: { installed: true },
          symbolizer: { installed: true },
          apm: { profilingEnabled: false },
        },
      },
    ]);

    mockedGetSetupState.mockResolvedValue({
      type: 'cloud',
      setupState: cloudSetupState,
    });

    const getStatus = createGetStatusService(registerServicesParams);

    await expect(getStatus({ soClient, esClient, spaceId: 'test-space' })).resolves.toEqual({
      type: 'cloud',
      profiling_enabled: true,
      has_setup: true,
      has_data: true,
      pre_8_9_1_data: false,
    });
  });

  it('returns expected status for self-managed setup state', async () => {
    const setupState = mergePartialSetupStates(createDefaultSetupState(), [
      {
        profiling: { enabled: true },
        data: { available: true },
        resource_management: { enabled: true },
        resources: { created: true, pre_8_9_1_data: true },
        settings: { configured: true },
      },
    ]);

    mockedGetSetupState.mockResolvedValue({
      type: 'self-managed',
      setupState,
    });

    const getStatus = createGetStatusService(registerServicesParams);

    await expect(getStatus({ soClient, esClient, spaceId: 'test-space' })).resolves.toEqual({
      type: 'self-managed',
      profiling_enabled: true,
      has_setup: true,
      has_data: true,
      pre_8_9_1_data: true,
    });
  });

  it('returns expected status for serverless setup state', async () => {
    const setupState = mergePartialSetupStates(createDefaultSetupState(), [
      {
        profiling: { enabled: false },
        data: { available: false },
        resources: { pre_8_9_1_data: false },
      },
    ]);

    mockedGetSetupState.mockResolvedValue({
      type: 'serverless',
      setupState,
    });

    const getStatus = createGetStatusService(registerServicesParams);

    await expect(
      getStatus({ soClient, esClient, spaceId: 'test-space', isServerless: true })
    ).resolves.toEqual({
      type: 'serverless',
      profiling_enabled: false,
      has_setup: false,
      has_data: false,
      pre_8_9_1_data: false,
    });
  });

  it('handles 403 exceptions from getSetupState gracefully', async () => {
    mockedGetSetupState.mockRejectedValue({
      meta: {
        statusCode: 403,
      },
    });

    const getStatus = createGetStatusService(registerServicesParams);

    await expect(getStatus({ soClient, esClient, spaceId: 'test-space' })).resolves.toEqual({
      profiling_enabled: true,
      has_setup: true,
      pre_8_9_1_data: false,
      has_data: true,
      unauthorized: true,
    });
  });
});
