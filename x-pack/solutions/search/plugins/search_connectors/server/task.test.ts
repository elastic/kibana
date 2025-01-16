/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { infraSyncTaskRunner } from './task';
import { ConcreteTaskInstance, TaskStatus } from '@kbn/task-manager-plugin/server';
import {
  AgentlessConnectorsInfraService,
  ConnectorMetadata,
  PackagePolicyMetadata,
} from './services';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';

const DATE_1970 = '1970-01-01T00:00:00.000Z';

describe('infraSyncTaskRunner', () => {
  const githubConnector: ConnectorMetadata = {
    id: '000001',
    name: 'Github Connector',
    service_type: 'github',
    is_deleted: false,
  };

  const sharepointConnector: ConnectorMetadata = {
    id: '000002',
    name: 'Sharepoint Connector',
    service_type: 'sharepoint_online',
    is_deleted: false,
  };

  const mysqlConnector: ConnectorMetadata = {
    id: '000003',
    name: 'MySQL Connector',
    service_type: 'mysql',
    is_deleted: false,
  };

  const deleted = (connector: ConnectorMetadata): ConnectorMetadata => {
    return {
      id: connector.id,
      name: connector.name,
      service_type: connector.service_type,
      is_deleted: true,
    };
  };

  const githubPackagePolicy: PackagePolicyMetadata = {
    package_policy_id: 'agent-001',
    agent_policy_ids: ['agent-package-001'],
    connector_settings: githubConnector,
  };

  const sharepointPackagePolicy: PackagePolicyMetadata = {
    package_policy_id: 'agent-002',
    agent_policy_ids: ['agent-package-002'],
    connector_settings: sharepointConnector,
  };

  const mysqlPackagePolicy: PackagePolicyMetadata = {
    package_policy_id: 'agent-003',
    agent_policy_ids: ['agent-package-003'],
    connector_settings: mysqlConnector,
  };

  let logger: MockedLogger;
  let serviceMock: jest.Mocked<AgentlessConnectorsInfraService>;
  let licensePluginStartMock: jest.Mocked<LicensingPluginStart>;

  const taskInstanceStub: ConcreteTaskInstance = {
    id: '',
    attempts: 0,
    status: TaskStatus.Running,
    version: '123',
    runAt: new Date(),
    scheduledAt: new Date(),
    startedAt: new Date(DATE_1970),
    retryAt: new Date(Date.now() + 5 * 60 * 1000),
    state: {},
    taskType: 'backfill',
    timeoutOverride: '3m',
    params: {
      adHocRunParamsId: 'abc',
      spaceId: 'default',
    },
    ownerId: null,
  };

  const invalidLicenseMock = licensingMock.createLicenseMock();
  invalidLicenseMock.check.mockReturnValue({ state: 'invalid' });

  const validLicenseMock = licensingMock.createLicenseMock();
  validLicenseMock.check.mockReturnValue({ state: 'valid' });

  beforeAll(async () => {
    logger = loggerMock.create();
    serviceMock = {
      getNativeConnectors: jest.fn(),
      getConnectorPackagePolicies: jest.fn(),
      deployConnector: jest.fn(),
      removeDeployment: jest.fn(),
    } as unknown as jest.Mocked<AgentlessConnectorsInfraService>;

    licensePluginStartMock = {
      getLicense: jest.fn(),
    } as unknown as jest.Mocked<LicensingPluginStart>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Does nothing if no connectors or policies are configured', async () => {
    await infraSyncTaskRunner(
      logger,
      serviceMock,
      licensePluginStartMock
    )({ taskInstance: taskInstanceStub }).run();

    expect(serviceMock.deployConnector).not.toBeCalled();
    expect(serviceMock.removeDeployment).not.toBeCalled();
  });

  test('Does nothing if connectors or policies requires deployment but license is not supported', async () => {
    serviceMock.getNativeConnectors.mockResolvedValue([mysqlConnector, githubConnector]);
    serviceMock.getConnectorPackagePolicies.mockResolvedValue([sharepointPackagePolicy]);
    licensePluginStartMock.getLicense.mockResolvedValue(invalidLicenseMock);

    await infraSyncTaskRunner(
      logger,
      serviceMock,
      licensePluginStartMock
    )({ taskInstance: taskInstanceStub }).run();

    expect(serviceMock.deployConnector).not.toBeCalled();
    expect(serviceMock.removeDeployment).not.toBeCalled();
    expect(logger.warn).toBeCalledWith(expect.stringMatching(/.*not compatible.*/));
    expect(logger.warn).toBeCalledWith(expect.stringMatching(/.*license.*/));
  });

  test('Does nothing if all connectors and package policies are in-sync', async () => {
    serviceMock.getNativeConnectors.mockResolvedValue([
      mysqlConnector,
      githubConnector,
      sharepointConnector,
    ]);
    serviceMock.getConnectorPackagePolicies.mockResolvedValue([
      mysqlPackagePolicy,
      githubPackagePolicy,
      sharepointPackagePolicy,
    ]);
    licensePluginStartMock.getLicense.mockResolvedValue(validLicenseMock);

    await infraSyncTaskRunner(
      logger,
      serviceMock,
      licensePluginStartMock
    )({ taskInstance: taskInstanceStub }).run();

    expect(serviceMock.deployConnector).not.toBeCalled();
    expect(serviceMock.removeDeployment).not.toBeCalled();
    expect(logger.warn).not.toBeCalled();
  });

  test('Deploys connectors if no policies has been created for these connectors', async () => {
    serviceMock.getNativeConnectors.mockResolvedValue([mysqlConnector, githubConnector]);
    serviceMock.getConnectorPackagePolicies.mockResolvedValue([sharepointPackagePolicy]);
    licensePluginStartMock.getLicense.mockResolvedValue(validLicenseMock);

    await infraSyncTaskRunner(
      logger,
      serviceMock,
      licensePluginStartMock
    )({ taskInstance: taskInstanceStub }).run();

    expect(serviceMock.deployConnector).toBeCalledWith(mysqlConnector);
    expect(serviceMock.deployConnector).toBeCalledWith(githubConnector);
  });

  test('Deploys connectors even if another connectors failed to be deployed', async () => {
    serviceMock.getNativeConnectors.mockResolvedValue([
      mysqlConnector,
      githubConnector,
      sharepointConnector,
    ]);
    serviceMock.getConnectorPackagePolicies.mockResolvedValue([]);
    licensePluginStartMock.getLicense.mockResolvedValue(validLicenseMock);
    serviceMock.deployConnector.mockImplementation(async (connector) => {
      if (connector === mysqlConnector || connector === githubConnector) {
        throw new Error('Cannot deploy these connectors');
      }

      return createPackagePolicyMock();
    });

    await infraSyncTaskRunner(
      logger,
      serviceMock,
      licensePluginStartMock
    )({ taskInstance: taskInstanceStub }).run();

    expect(serviceMock.deployConnector).toBeCalledWith(mysqlConnector);
    expect(serviceMock.deployConnector).toBeCalledWith(githubConnector);
    expect(serviceMock.deployConnector).toBeCalledWith(sharepointConnector);
  });

  test('Removes a package policy if connectors has been soft-deleted', async () => {
    serviceMock.getNativeConnectors.mockResolvedValue([
      deleted(sharepointConnector),
      mysqlConnector,
      githubConnector,
    ]);
    serviceMock.getConnectorPackagePolicies.mockResolvedValue([sharepointPackagePolicy]);
    licensePluginStartMock.getLicense.mockResolvedValue(validLicenseMock);

    await infraSyncTaskRunner(
      logger,
      serviceMock,
      licensePluginStartMock
    )({ taskInstance: taskInstanceStub }).run();

    expect(serviceMock.removeDeployment).toBeCalledWith(sharepointPackagePolicy.package_policy_id);
  });

  test('Does not remove a package policy if no connectors match the policy', async () => {
    serviceMock.getNativeConnectors.mockResolvedValue([mysqlConnector, githubConnector]);
    serviceMock.getConnectorPackagePolicies.mockResolvedValue([sharepointPackagePolicy]);
    licensePluginStartMock.getLicense.mockResolvedValue(validLicenseMock);

    await infraSyncTaskRunner(
      logger,
      serviceMock,
      licensePluginStartMock
    )({ taskInstance: taskInstanceStub }).run();

    expect(serviceMock.removeDeployment).not.toBeCalled();
  });

  test('Removes deployments even if another connectors failed to be undeployed', async () => {
    serviceMock.getNativeConnectors.mockResolvedValue([
      deleted(mysqlConnector),
      deleted(sharepointConnector),
      deleted(githubConnector),
    ]);
    serviceMock.getConnectorPackagePolicies.mockResolvedValue([
      sharepointPackagePolicy,
      mysqlPackagePolicy,
      githubPackagePolicy,
    ]);
    licensePluginStartMock.getLicense.mockResolvedValue(validLicenseMock);
    serviceMock.removeDeployment.mockImplementation(async (policyId) => {
      if (
        policyId === sharepointPackagePolicy.package_policy_id ||
        policyId === mysqlPackagePolicy.package_policy_id
      ) {
        throw new Error('Cannot deploy these connectors');
      }
    });

    await infraSyncTaskRunner(
      logger,
      serviceMock,
      licensePluginStartMock
    )({ taskInstance: taskInstanceStub }).run();

    expect(serviceMock.removeDeployment).toBeCalledWith(sharepointPackagePolicy.package_policy_id);
    expect(serviceMock.removeDeployment).toBeCalledWith(mysqlPackagePolicy.package_policy_id);
    expect(serviceMock.removeDeployment).toBeCalledWith(githubPackagePolicy.package_policy_id);
  });
});
