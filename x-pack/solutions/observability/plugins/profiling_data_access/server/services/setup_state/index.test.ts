/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { RegisterServicesParams } from '../register_services';
import * as setupStateModule from '.';
import { cloudSetupState } from './cloud_setup_state';
import { selfManagedSetupState } from './self_managed_setup_state';

jest.mock('./cloud_setup_state', () => ({
  cloudSetupState: jest.fn(),
}));

jest.mock('./self_managed_setup_state', () => ({
  selfManagedSetupState: jest.fn(),
}));

const mockedCloudSetupState = jest.mocked(cloudSetupState);
const mockedSelfManagedSetupState = jest.mocked(selfManagedSetupState);

describe('setup state services', () => {
  const logger = {
    debug: jest.fn(),
  } as unknown as RegisterServicesParams['logger'];

  const packagePolicyService = {} as NonNullable<
    RegisterServicesParams['deps']['fleet']
  >['packagePolicyService'];
  const soClient = {} as SavedObjectsClientContract;
  const internalEsClient = {} as IScopedClusterClient['asInternalUser'];
  const currentEsClient = {} as IScopedClusterClient['asCurrentUser'];
  const esClient = {
    asInternalUser: internalEsClient,
    asCurrentUser: currentEsClient,
  } as IScopedClusterClient;

  const internalProfilingClient = { name: 'internal-profiling-client' };
  const currentProfilingClient = { name: 'current-profiling-client' };

  const createProfilingEsClient = jest.fn(({ esClient: scopedClient }: { esClient: unknown }) => {
    if (scopedClient === internalEsClient) {
      return internalProfilingClient as any;
    }
    if (scopedClient === currentEsClient) {
      return currentProfilingClient as any;
    }
    throw new Error('Unexpected scoped ES client');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCloudSetupState', () => {
    it('reads the cloud setup state when Fleet is available', async () => {
      const setupState = { cloud: true } as any;
      mockedCloudSetupState.mockResolvedValue(setupState);

      const result = await setupStateModule.getCloudSetupState({
        createProfilingEsClient,
        deps: {
          cloud: { isCloudEnabled: true } as RegisterServicesParams['deps']['cloud'],
          fleet: { packagePolicyService } as RegisterServicesParams['deps']['fleet'],
        },
        esClient,
        logger,
        soClient,
        spaceId: 'my-space',
      });

      expect(result).toBe(setupState);
      expect(mockedCloudSetupState).toHaveBeenCalledWith({
        client: internalProfilingClient,
        clientWithProfilingAuth: currentProfilingClient,
        logger,
        soClient,
        spaceId: 'my-space',
        packagePolicyClient: packagePolicyService,
        isCloudEnabled: true,
      });
      expect(mockedSelfManagedSetupState).not.toHaveBeenCalled();
    });

    it('throws when Fleet is not available', async () => {
      await expect(
        setupStateModule.getCloudSetupState({
          createProfilingEsClient,
          deps: {
            cloud: { isCloudEnabled: true } as RegisterServicesParams['deps']['cloud'],
          },
          esClient,
          logger,
          soClient,
        })
      ).rejects.toThrow('Elastic Fleet is required to set up Universal Profiling on Cloud');

      expect(mockedCloudSetupState).not.toHaveBeenCalled();
    });
  });

  describe('getSelfManagedSetupState', () => {
    it('reads the self-managed setup state in the default space', async () => {
      const setupState = { selfManaged: true } as any;
      mockedSelfManagedSetupState.mockResolvedValue(setupState);

      const result = await setupStateModule.getSelfManagedSetupState({
        createProfilingEsClient,
        deps: {},
        esClient,
        logger,
        soClient,
      });

      expect(result).toBe(setupState);
      expect(mockedSelfManagedSetupState).toHaveBeenCalledWith({
        client: internalProfilingClient,
        clientWithProfilingAuth: currentProfilingClient,
        logger,
        soClient,
        spaceId: 'default',
      });
      expect(mockedCloudSetupState).not.toHaveBeenCalled();
    });
  });
});
