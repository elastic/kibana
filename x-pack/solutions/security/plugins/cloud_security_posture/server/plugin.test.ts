/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { createFleetStartContractMock } from '@kbn/fleet-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { createPackagePolicyMock, deletePackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { CspPlugin } from './plugin';
import type { CspServerPluginStartDeps } from './types';
import type {
  Installation,
  ListResult,
  PackagePolicy,
  UpdatePackagePolicy,
} from '@kbn/fleet-plugin/common';
import type {
  PostPackagePolicyPostDeleteCallback,
  PostPackagePolicyPostCreateCallback,
} from '@kbn/fleet-plugin/server';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../common/constants';
import Chance from 'chance';
import type { AwaitedProperties } from '@kbn/utility-types';
import { createIndexPatternsStartMock } from '@kbn/data-views-plugin/server/mocks';
import type {
  ElasticsearchClient,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

const chance = new Chance();

const mockRouteContext = {
  core: coreMock.createRequestHandlerContext(),
} as unknown as AwaitedProperties<RequestHandlerContext>;

describe('Cloud Security Posture Plugin', () => {
  describe('start()', () => {
    let fleetMock: ReturnType<typeof createFleetStartContractMock>;
    let mockPlugins: CspServerPluginStartDeps;
    let contextMock: ReturnType<typeof coreMock.createCustomRequestHandlerContext>;
    let findMock: jest.Mock;
    let plugin: CspPlugin;

    beforeEach(() => {
      jest.clearAllMocks();

      fleetMock = createFleetStartContractMock();
      mockPlugins = {
        fleet: fleetMock,
        data: dataPluginMock.createStartContract(),
        taskManager: taskManagerMock.createStart(),
        security: securityMock.createStart(),
        licensing: licensingMock.createStart(),
        dataViews: createIndexPatternsStartMock(),
      };

      contextMock = coreMock.createCustomRequestHandlerContext(mockRouteContext);
      findMock = mockRouteContext.core.savedObjects.client.find as jest.Mock;
      findMock.mockReturnValue(
        Promise.resolve({
          saved_objects: [
            {
              type: 'csp_rule',
              attributes: {
                metadata: {
                  rego_rule_id: 'cis_1_1_1',
                  benchmark: { id: 'cis_k8s' },
                },
              },
            },
          ],
          total: 1,
          per_page: 10,
          page: 1,
        })
      );
    });

    it('should initialize when package installed', async () => {
      fleetMock.packageService.asInternalUser.getInstallation.mockResolvedValue({
        install_version: '1.0.0',
      } as jest.Mocked<Installation>);

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CspPlugin(context);
      const spy = jest.spyOn(plugin, 'initialize').mockResolvedValue(undefined);

      await plugin.start(coreMock.createStart(), mockPlugins);
      await mockPlugins.fleet.fleetSetupCompleted();

      // Wait for any microtasks that might have been scheduled
      await new Promise((resolve) => setImmediate(resolve));

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), '1.0.0');
    });

    it('should not initialize when package is not installed', async () => {
      fleetMock.packageService.asInternalUser.getInstallation.mockResolvedValue(undefined);

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CspPlugin(context);
      const spy = jest.spyOn(plugin, 'initialize').mockResolvedValue(undefined);

      await plugin.start(coreMock.createStart(), mockPlugins);
      await mockPlugins.fleet.fleetSetupCompleted();

      // Wait for any microtasks that might have been scheduled
      await new Promise((resolve) => setImmediate(resolve));

      expect(fleetMock.packageService.asInternalUser.getInstallation).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should retry getInstallation on failures', async () => {
      jest.useFakeTimers();

      let callCount = 0;
      fleetMock.packageService.asInternalUser.getInstallation.mockImplementation(
        async (): Promise<Installation | undefined> => {
          callCount++;
          if (callCount < 3) {
            throw new Error(`ES connection failed ${callCount}`);
          }
          return { install_version: '1.0.0' } as jest.Mocked<Installation>;
        }
      );

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CspPlugin(context);
      const spy = jest.spyOn(plugin, 'initialize').mockResolvedValue(undefined);
      const loggerWarnSpy = jest.spyOn(context.logger.get(), 'warn');

      await plugin.start(coreMock.createStart(), mockPlugins);

      // Fast-forward through all pending timers multiple times to ensure
      // all retry attempts have a chance to execute
      for (let i = 0; i < 5; i++) {
        jest.runAllTimers();
        // Allow any pending promises to resolve
        await Promise.resolve();
      }

      await mockPlugins.fleet.fleetSetupCompleted();

      jest.useRealTimers();

      expect(loggerWarnSpy).toHaveBeenCalled();
      expect(loggerWarnSpy.mock.calls[0][0]).toMatch(/failed and will be retried/);

      expect(callCount).toBeGreaterThan(1);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), '1.0.0');
    });

    it('should handle getInstallation complete failure after retries', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });

      const testError = new Error('ES connection failed persistently');
      fleetMock.packageService.asInternalUser.getInstallation.mockRejectedValue(testError);

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CspPlugin(context);
      const spy = jest.spyOn(plugin, 'initialize').mockResolvedValue(undefined);
      const loggerErrorSpy = jest.spyOn(context.logger.get(), 'error');

      await plugin.start(coreMock.createStart(), mockPlugins);

      // Fast-forward through all pending timers to trigger all retry attempts
      for (let i = 0; i < 10; i++) {
        jest.runOnlyPendingTimers();
        await Promise.resolve();
      }

      await mockPlugins.fleet.fleetSetupCompleted();

      jest.useRealTimers();

      expect(fleetMock.packageService.asInternalUser.getInstallation).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledTimes(0);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'CSP plugin getInstallation operation failed after all retries',
        testError
      );
    });

    it('should not initialize when other package is created', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      fleetMock.packageService.asInternalUser.getInstallation.mockImplementationOnce(
        async (): Promise<Installation | undefined> => {
          return;
        }
      );

      const packageMock = createPackagePolicyMock();
      packageMock.package!.name = chance.word();

      // Reset any previous mock implementations first to avoid interference
      fleetMock.registerExternalCallback.mockReset();

      const packagePolicyPostCreateCallbacks: PostPackagePolicyPostCreateCallback[] = [];
      fleetMock.registerExternalCallback.mockImplementation((...args) => {
        if (args[0] === 'packagePolicyPostCreate') {
          packagePolicyPostCreateCallbacks.push(args[1]);
          return;
        }
      });

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CspPlugin(context);
      const spy = jest.spyOn(plugin, 'initialize').mockImplementation();

      // Act
      await plugin.start(coreMock.createStart(), mockPlugins);

      await mockPlugins.fleet.fleetSetupCompleted();

      // Allow any microtasks from promise chain to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fleetMock.registerExternalCallback).toHaveBeenCalled();
      expect(packagePolicyPostCreateCallbacks.length).toBeGreaterThan(0);

      // Assert
      expect(fleetMock.packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledTimes(0);

      expect(packagePolicyPostCreateCallbacks.length).toBeGreaterThan(0);

      for (const cb of packagePolicyPostCreateCallbacks) {
        await cb(
          packageMock,
          soClient,
          esClient,
          contextMock,
          httpServerMock.createKibanaRequest()
        );
      }

      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('packagePolicyPostCreate should return the same received policy', async () => {
      fleetMock.packageService.asInternalUser.getInstallation.mockImplementationOnce(
        async (): Promise<Installation | undefined> => {
          return;
        }
      );

      fleetMock.packagePolicyService.update.mockImplementation(
        (
          soClient: SavedObjectsClientContract,
          esClient: ElasticsearchClient,
          id: string,
          packagePolicyUpdate: UpdatePackagePolicy
        ): Promise<PackagePolicy> => {
          // @ts-expect-error 2322
          return packagePolicyUpdate;
        }
      );

      const packageMock = createPackagePolicyMock();
      packageMock.package!.name = CLOUD_SECURITY_POSTURE_PACKAGE_NAME;
      packageMock.vars = { runtimeCfg: { type: 'foo' } };

      // Reset any previous mock implementations first to avoid interference
      fleetMock.registerExternalCallback.mockReset();

      const packagePolicyPostCreateCallbacks: PostPackagePolicyPostCreateCallback[] = [];
      fleetMock.registerExternalCallback.mockImplementation((...args) => {
        if (args[0] === 'packagePolicyPostCreate') {
          packagePolicyPostCreateCallbacks.push(args[1]);
          return;
        }
      });

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CspPlugin(context);
      const spy = jest.spyOn(plugin, 'initialize').mockImplementation();

      // Act
      await plugin.start(coreMock.createStart(), mockPlugins);

      await mockPlugins.fleet.fleetSetupCompleted();

      // Allow any microtasks from promise chain to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fleetMock.registerExternalCallback).toHaveBeenCalled();
      expect(packagePolicyPostCreateCallbacks.length).toBeGreaterThan(0);

      // Assert
      expect(fleetMock.packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledTimes(0);

      expect(packagePolicyPostCreateCallbacks.length).toBeGreaterThan(0);

      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      for (const cb of packagePolicyPostCreateCallbacks) {
        const updatedPackagePolicy = await cb(
          packageMock,
          soClient,
          esClient,
          contextMock,
          httpServerMock.createKibanaRequest()
        );
        expect(updatedPackagePolicy).toEqual(packageMock);
      }

      expect(fleetMock.packagePolicyService.update).toHaveBeenCalledTimes(0);
    });

    it.each([
      [1, [createPackagePolicyMock()], 0],
      [0, [], 1],
    ])(
      'should uninstall resources when package is removed',
      async (total, items, expectedNumberOfCallsToUninstallResources) => {
        const soClient = savedObjectsClientMock.create();
        const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        fleetMock.packagePolicyService.list.mockImplementationOnce(
          async (): Promise<ListResult<PackagePolicy>> => {
            return {
              items,
              total,
              page: 1,
              perPage: 1,
            };
          }
        );

        const deletedPackagePolicyMock = deletePackagePolicyMock();
        deletedPackagePolicyMock[0].package!.name = CLOUD_SECURITY_POSTURE_PACKAGE_NAME;

        // Reset any previous mock implementations first to avoid interference
        fleetMock.registerExternalCallback.mockReset();

        const packagePolicyPostDeleteCallbacks: PostPackagePolicyPostDeleteCallback[] = [];
        fleetMock.registerExternalCallback.mockImplementation((...args) => {
          if (args[0] === 'packagePolicyPostDelete') {
            packagePolicyPostDeleteCallbacks.push(args[1]);
            return;
          }
        });

        const coreStart = coreMock.createStart();
        const context = coreMock.createPluginInitializerContext<unknown>();
        plugin = new CspPlugin(context);
        const spy = jest.spyOn(plugin, 'uninstallResources').mockImplementation();

        // Act
        await plugin.start(coreStart, mockPlugins);

        await mockPlugins.fleet.fleetSetupCompleted();

        // Allow any microtasks from promise chain to complete
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(fleetMock.registerExternalCallback).toHaveBeenCalled();
        expect(packagePolicyPostDeleteCallbacks.length).toBeGreaterThan(0);

        // Assert
        expect(fleetMock.packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);

        expect(packagePolicyPostDeleteCallbacks.length).toBeGreaterThan(0);

        for (const cb of packagePolicyPostDeleteCallbacks) {
          await cb(deletedPackagePolicyMock, soClient, esClient);
        }
        expect(fleetMock.packagePolicyService.list).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledTimes(expectedNumberOfCallsToUninstallResources);
      }
    );
  });
});
