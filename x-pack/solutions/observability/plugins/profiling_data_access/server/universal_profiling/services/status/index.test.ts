/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import { createDefaultCloudSetupState } from '../../lib/cloud_setup';
import { createDefaultSetupState, mergePartialSetupStates } from '../../lib/setup';
import type { RegisterServicesParams } from '../../../services/register_services';
import { getCloudSetupState, getSelfManagedSetupState } from '../setup_state';
import { createGetStatusService } from '.';

jest.mock('../setup_state', () => ({
  getCloudSetupState: jest.fn(),
  getSelfManagedSetupState: jest.fn(),
}));

const mockedGetCloudSetupState = jest.mocked(getCloudSetupState);
const mockedGetSelfManagedSetupState = jest.mocked(getSelfManagedSetupState);

describe('createGetStatusService', () => {
  const createParams = (isCloudEnabled: boolean) =>
    ({
      createProfilingEsClient: jest.fn(),
      logger: {
        debug: jest.fn(),
      },
      deps: { cloud: { isCloudEnabled } },
    }) as unknown as RegisterServicesParams;

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

    mockedGetCloudSetupState.mockResolvedValue(cloudSetupState);

    const getStatus = createGetStatusService(createParams(true));

    await expect(getStatus({ soClient, esClient, spaceId: 'test-space' })).resolves.toEqual({
      profiling_enabled: true,
      has_setup: true,
      has_data: true,
      pre_8_9_1_data: false,
    });
    expect(mockedGetSelfManagedSetupState).not.toHaveBeenCalled();
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

    mockedGetSelfManagedSetupState.mockResolvedValue(setupState);

    const getStatus = createGetStatusService(createParams(false));

    await expect(getStatus({ soClient, esClient, spaceId: 'test-space' })).resolves.toEqual({
      profiling_enabled: true,
      has_setup: true,
      has_data: true,
      pre_8_9_1_data: true,
    });
    expect(mockedGetCloudSetupState).not.toHaveBeenCalled();
  });

  it('passes the abort signal to the setup state', async () => {
    mockedGetSelfManagedSetupState.mockResolvedValue(createDefaultSetupState());
    const abortSignal = new AbortController().signal;

    const getStatus = createGetStatusService(createParams(false));
    await getStatus({ soClient, esClient, abortSignal });

    expect(mockedGetSelfManagedSetupState).toHaveBeenCalledWith(
      expect.objectContaining({ esClient, soClient, abortSignal })
    );
  });
});
