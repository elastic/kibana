/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { TaskCost } from '@kbn/task-manager-plugin/server/task';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { setExportProviders } from '../../../../common/endpoint/models/export_providers';
import { policyFactory } from '../../../../common/endpoint/models/policy_config';
import type { AzureBlobExportProvider } from '../../../../common/endpoint/types';
import type { EndpointAppContext } from '../../types';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import { createMockEndpointAppContext, createMockEndpointAppContextService } from '../../mocks';
import { EXPORT_PROVIDER_KEY_CLEANUP_TASK_TYPE, EXPORT_PROVIDER_KEY_MIN_AGE_MS } from './constants';
import type { ExportProviderKeyClientInterface, ExportProviderKeyMetadata } from './types';
import {
  EXPORT_PROVIDER_KEY_CLEANUP_TASK_DESCRIPTION,
  EXPORT_PROVIDER_KEY_CLEANUP_TASK_TITLE,
  ExportProviderKeyCleanupTask,
  runExportProviderKeyCleanup,
} from './cleanup_task';

const generator = new FleetPackagePolicyGenerator();
const KEY_ID = 'export-provider-key-1';
const PACKAGE_POLICY_ID = 'package-policy-1';
const NOW = Date.parse('2026-06-15T12:00:00.000Z');
const OLD_ENOUGH_CREATED_AT = new Date(NOW - EXPORT_PROVIDER_KEY_MIN_AGE_MS - 1000).toISOString();
const TOO_YOUNG_CREATED_AT = new Date(NOW - EXPORT_PROVIDER_KEY_MIN_AGE_MS + 1000).toISOString();

const createKeyMetadata = (
  overrides: Partial<ExportProviderKeyMetadata> = {}
): ExportProviderKeyMetadata => ({
  id: KEY_ID,
  package_policy_id: PACKAGE_POLICY_ID,
  account_name: 'mystorageaccount',
  created_at: OLD_ENOUGH_CREATED_AT,
  ...overrides,
});

/** An owner package policy whose providers reference exactly `keyIds` (default: none). */
const createOwner = (keyIds: string[] = []): PackagePolicy => {
  const providers: AzureBlobExportProvider[] = keyIds.map((keyId, index) => ({
    id: `provider-${index}`,
    type: 'azure_blob',
    account_name: 'myaccount',
    container: 'my-container',
    credentials: { type: 'account_key', key_id: keyId },
  }));
  const owner = generator.generateEndpointPackagePolicy({ id: PACKAGE_POLICY_ID });

  owner.inputs[0].config.policy.value = setExportProviders(policyFactory(), providers);

  return owner;
};

describe('ExportProviderKeyCleanupTask class', () => {
  let endpointAppContextMock: EndpointAppContext;
  let taskInstance: ExportProviderKeyCleanupTask;

  beforeEach(() => {
    endpointAppContextMock = createMockEndpointAppContext();
    taskInstance = new ExportProviderKeyCleanupTask({
      endpointAppContext: endpointAppContextMock,
    });
  });

  describe('#setup()', () => {
    it('registers the task definition with task manager', () => {
      const taskManagerSetupContractMock = taskManagerMock.createSetup();

      taskInstance.setup({ taskManager: taskManagerSetupContractMock });

      expect(taskManagerSetupContractMock.registerTaskDefinitions).toHaveBeenCalledWith({
        [EXPORT_PROVIDER_KEY_CLEANUP_TASK_TYPE]: {
          title: EXPORT_PROVIDER_KEY_CLEANUP_TASK_TITLE,
          description: EXPORT_PROVIDER_KEY_CLEANUP_TASK_DESCRIPTION,
          timeout: '5m',
          cost: TaskCost.Normal,
          maxAttempts: 3,
          createTaskRunner: expect.any(Function),
        },
      });
    });
  });

  describe('#start()', () => {
    it('schedules the task with a 1 hour interval when the feature flag is on', async () => {
      endpointAppContextMock.experimentalFeatures = {
        ...endpointAppContextMock.experimentalFeatures,
        responseActionsEndpointFileExport: true,
      };
      taskInstance.setup({ taskManager: taskManagerMock.createSetup() });
      const taskManagerStartContractMock = taskManagerMock.createStart();

      await taskInstance.start({ taskManager: taskManagerStartContractMock });

      expect(taskManagerStartContractMock.ensureScheduled).toHaveBeenCalledWith({
        id: EXPORT_PROVIDER_KEY_CLEANUP_TASK_TYPE,
        taskType: EXPORT_PROVIDER_KEY_CLEANUP_TASK_TYPE,
        scope: ['securitySolution'],
        schedule: { interval: '1h' },
        state: {},
        params: {},
      });
    });

    it("doesn't schedule the task when the feature flag is off", async () => {
      endpointAppContextMock.experimentalFeatures = {
        ...endpointAppContextMock.experimentalFeatures,
        responseActionsEndpointFileExport: false,
      };
      taskInstance.setup({ taskManager: taskManagerMock.createSetup() });
      const taskManagerStartContractMock = taskManagerMock.createStart();

      await taskInstance.start({ taskManager: taskManagerStartContractMock });

      expect(taskManagerStartContractMock.ensureScheduled).not.toHaveBeenCalled();
    });
  });

  describe('#stop()', () => {
    it('keeps the scheduled task, which other Kibana nodes still run', async () => {
      endpointAppContextMock.experimentalFeatures = {
        ...endpointAppContextMock.experimentalFeatures,
        responseActionsEndpointFileExport: true,
      };
      taskInstance.setup({ taskManager: taskManagerMock.createSetup() });
      const taskManagerStartContractMock = taskManagerMock.createStart();
      await taskInstance.start({ taskManager: taskManagerStartContractMock });

      await taskInstance.stop();

      expect(taskManagerStartContractMock.removeIfExists).not.toHaveBeenCalled();
      expect(taskManagerStartContractMock.remove).not.toHaveBeenCalled();
    });
  });
});

describe('runExportProviderKeyCleanup()', () => {
  let endpointServiceMock: jest.Mocked<EndpointAppContextService>;
  let keyClientMock: jest.Mocked<ExportProviderKeyClientInterface>;
  let packagePolicyServiceMock: jest.Mocked<PackagePolicyClient>;
  let logger: MockedLogger;

  beforeEach(() => {
    endpointServiceMock = createMockEndpointAppContextService();
    keyClientMock =
      endpointServiceMock.getExportProviderKeyClient() as jest.Mocked<ExportProviderKeyClientInterface>;
    packagePolicyServiceMock = endpointServiceMock.getInternalFleetServices()
      .packagePolicy as jest.Mocked<PackagePolicyClient>;
    logger = loggerMock.create();
  });

  const run = (signal: AbortSignal = new AbortController().signal) =>
    runExportProviderKeyCleanup({
      endpointService: endpointServiceMock,
      logger,
      now: NOW,
      signal,
    });

  it('deletes a key whose owner no longer exists in any space', async () => {
    const key = createKeyMetadata();
    keyClientMock.findAllKeys.mockImplementation(async function* () {
      yield [key];
    });
    packagePolicyServiceMock.getByIDs.mockResolvedValue([]);

    await run();

    expect(endpointServiceMock.getInternalFleetServices).toHaveBeenCalledWith(undefined, true);
    expect(packagePolicyServiceMock.getByIDs).toHaveBeenCalledWith(
      endpointServiceMock.getInternalFleetServices().getSoClient(),
      [PACKAGE_POLICY_ID],
      { ignoreMissing: true, spaceIds: ['*'] }
    );
    expect(keyClientMock.deleteKeys).toHaveBeenCalledWith([key]);
  });

  it("deletes a key the owner's providers no longer reference", async () => {
    const key = createKeyMetadata();
    const owner = createOwner([]);
    keyClientMock.findAllKeys.mockImplementation(async function* () {
      yield [key];
    });
    packagePolicyServiceMock.getByIDs.mockResolvedValue([owner]);

    await run();

    expect(keyClientMock.deleteKeys).toHaveBeenCalledWith([key]);
  });

  it("keeps a key the owner's provider still references", async () => {
    const key = createKeyMetadata();
    const owner = createOwner([KEY_ID]);
    keyClientMock.findAllKeys.mockImplementation(async function* () {
      yield [key];
    });
    packagePolicyServiceMock.getByIDs.mockResolvedValue([owner]);

    await run();

    expect(keyClientMock.deleteKeys).not.toHaveBeenCalled();
  });

  it('keeps a key younger than the minimum age without reading Fleet', async () => {
    const key = createKeyMetadata({
      created_at: TOO_YOUNG_CREATED_AT,
      package_policy_id: 'missing-policy',
    });
    keyClientMock.findAllKeys.mockImplementation(async function* () {
      yield [key];
    });

    await run();

    expect(packagePolicyServiceMock.getByIDs).not.toHaveBeenCalled();
    expect(keyClientMock.deleteKeys).not.toHaveBeenCalled();
  });

  it('treats an unparsable created_at as old enough to delete', async () => {
    const key = createKeyMetadata({
      created_at: 'not-a-date',
      package_policy_id: 'missing-policy',
    });
    keyClientMock.findAllKeys.mockImplementation(async function* () {
      yield [key];
    });
    packagePolicyServiceMock.getByIDs.mockResolvedValue([]);

    await run();

    expect(keyClientMock.deleteKeys).toHaveBeenCalledWith([key]);
  });

  it('skips a batch whose owner read fails, but still processes the next batch', async () => {
    const unreadableKey = createKeyMetadata({ id: 'key-1', package_policy_id: 'missing-1' });
    const readableKey = createKeyMetadata({ id: 'key-2', package_policy_id: 'missing-2' });
    keyClientMock.findAllKeys.mockImplementation(async function* () {
      yield [unreadableKey];
      yield [readableKey];
    });
    packagePolicyServiceMock.getByIDs.mockRejectedValueOnce(new Error('Fleet is unavailable'));
    packagePolicyServiceMock.getByIDs.mockResolvedValueOnce([]);

    await run();

    expect(keyClientMock.deleteKeys).toHaveBeenCalledTimes(1);
    expect(keyClientMock.deleteKeys).toHaveBeenCalledWith([readableKey]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('missing-1'));
  });

  it('stops before processing the next batch once the signal is aborted', async () => {
    const abortController = new AbortController();
    const firstKey = createKeyMetadata({ id: 'key-1', package_policy_id: 'missing-1' });
    const secondKey = createKeyMetadata({ id: 'key-2', package_policy_id: 'missing-2' });
    keyClientMock.findAllKeys.mockImplementation(async function* () {
      yield [firstKey];
      // Simulates Task Manager aborting the signal while the run is between batches.
      abortController.abort();
      yield [secondKey];
    });
    packagePolicyServiceMock.getByIDs.mockResolvedValue([]);

    await run(abortController.signal);

    expect(keyClientMock.deleteKeys).toHaveBeenCalledTimes(1);
    expect(keyClientMock.deleteKeys).toHaveBeenCalledWith([firstKey]);
  });
});
