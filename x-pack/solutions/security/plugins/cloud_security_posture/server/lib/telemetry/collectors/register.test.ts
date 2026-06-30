/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import type { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { registerCspmUsageCollector } from './register';

// Mock all individual collector modules so we don't need real ES data
jest.mock('./indices_stats_collector', () => ({
  getIndicesStats: jest.fn().mockResolvedValue({ doc_count: 0 }),
}));
jest.mock('./accounts_stats_collector', () => ({
  getAccountsStats: jest.fn().mockResolvedValue([]),
}));
jest.mock('./resources_stats_collector', () => ({
  getResourcesStats: jest.fn().mockResolvedValue([]),
}));
jest.mock('./rules_stats_collector', () => ({
  getRulesStats: jest.fn().mockResolvedValue([]),
}));
jest.mock('./installation_stats_collector', () => ({
  getInstallationStats: jest.fn().mockResolvedValue([]),
}));
jest.mock('./alert_stats_collector', () => ({
  getAlertsStats: jest.fn().mockResolvedValue([]),
}));
jest.mock('./cloud_accounts_stats_collector', () => ({
  getAllCloudAccountsStats: jest.fn().mockResolvedValue([]),
}));
jest.mock('./muted_rules_stats_collector', () => ({
  getMutedRulesStats: jest.fn().mockResolvedValue([]),
}));
jest.mock('./cspm_cloud_connector_usage_stats_collector', () => ({
  getCspmCloudConnectorUsageStats: jest.fn().mockResolvedValue([]),
}));

describe('registerCspmUsageCollector', () => {
  const logger = loggerMock.create();

  const buildCoreServicesMock = () =>
    Promise.resolve([
      {
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue(savedObjectsClientMock.create()),
        },
      },
      {},
      {},
    ] as any);

  const buildFetchContext = (): CollectorFetchContext =>
    ({
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      soClient: savedObjectsClientMock.create(),
    } as unknown as CollectorFetchContext);

  it('does not register when usageCollection is undefined', () => {
    const usageCollection = usageCollectionPluginMock.createSetupContract();
    registerCspmUsageCollector(logger, buildCoreServicesMock(), undefined);
    expect(usageCollection.registerCollector).not.toHaveBeenCalled();
  });

  it('registers a collector with the correct type', () => {
    const usageCollection = usageCollectionPluginMock.createSetupContract();
    registerCspmUsageCollector(logger, buildCoreServicesMock(), usageCollection);
    expect(usageCollection.registerCollector).toHaveBeenCalledTimes(1);
    const [[collector]] = (usageCollection.makeUsageCollector as jest.Mock).mock.calls;
    expect(collector.type).toBe('cloud_security_posture');
  });

  it('fetch returns data from all collectors', async () => {
    const { getIndicesStats } = jest.requireMock('./indices_stats_collector');
    const { getAccountsStats } = jest.requireMock('./accounts_stats_collector');
    const { getResourcesStats } = jest.requireMock('./resources_stats_collector');
    const { getRulesStats } = jest.requireMock('./rules_stats_collector');
    const { getInstallationStats } = jest.requireMock('./installation_stats_collector');
    const { getAlertsStats } = jest.requireMock('./alert_stats_collector');
    const { getAllCloudAccountsStats } = jest.requireMock('./cloud_accounts_stats_collector');
    const { getMutedRulesStats } = jest.requireMock('./muted_rules_stats_collector');
    const { getCspmCloudConnectorUsageStats } = jest.requireMock(
      './cspm_cloud_connector_usage_stats_collector'
    );

    const indicesResult = { doc_count: 42 };
    const accountsResult = [{ account_id: 'a1' }];
    const resourcesResult = [{ resource_type: 'r1' }];
    const rulesResult = [{ rule_id: 'rule1' }];
    const installationResult = [{ package_policy_id: 'pp1' }];
    const alertsResult = [{ posture_type: 'cspm' }];
    const cloudAccountResult = [{ account_id: 'ca1' }];
    const mutedRulesResult = [{ id: 'mr1' }];
    const cloudConnectorResult = [{ id: 'cc1' }];

    getIndicesStats.mockResolvedValue(indicesResult);
    getAccountsStats.mockResolvedValue(accountsResult);
    getResourcesStats.mockResolvedValue(resourcesResult);
    getRulesStats.mockResolvedValue(rulesResult);
    getInstallationStats.mockResolvedValue(installationResult);
    getAlertsStats.mockResolvedValue(alertsResult);
    getAllCloudAccountsStats.mockResolvedValue(cloudAccountResult);
    getMutedRulesStats.mockResolvedValue(mutedRulesResult);
    getCspmCloudConnectorUsageStats.mockResolvedValue(cloudConnectorResult);

    const usageCollection = usageCollectionPluginMock.createSetupContract();
    registerCspmUsageCollector(logger, buildCoreServicesMock(), usageCollection);

    // Retrieve the options passed to makeUsageCollector and invoke fetch directly
    const [[collectorOptions]] = (usageCollection.makeUsageCollector as jest.Mock).mock.calls;
    const result = await collectorOptions.fetch(buildFetchContext());

    expect(result).toEqual({
      indices: indicesResult,
      accounts_stats: accountsResult,
      resources_stats: resourcesResult,
      rules_stats: rulesResult,
      installation_stats: installationResult,
      alerts_stats: alertsResult,
      cloud_account_stats: cloudAccountResult,
      muted_rules_stats: mutedRulesResult,
      cspm_cloud_connector_usage_stats: cloudConnectorResult,
    });
  });

  it('fetch handles individual collector errors gracefully and still returns partial data', async () => {
    const { getIndicesStats } = jest.requireMock('./indices_stats_collector');
    const { getAccountsStats } = jest.requireMock('./accounts_stats_collector');

    const collectorError = new Error('ES unavailable');
    getIndicesStats.mockRejectedValue(collectorError);
    getAccountsStats.mockResolvedValue([{ account_id: 'a1' }]);

    const usageCollection = usageCollectionPluginMock.createSetupContract();
    registerCspmUsageCollector(logger, buildCoreServicesMock(), usageCollection);

    const [[collectorOptions]] = (usageCollection.makeUsageCollector as jest.Mock).mock.calls;
    // Should not throw even if one collector fails
    const result = await collectorOptions.fetch(buildFetchContext());
    // The failed collector returns the error object (as per awaitPromiseSafe behaviour)
    expect(result.indices).toBe(collectorError);
    // Other collectors still return their values
    expect(result.accounts_stats).toEqual([{ account_id: 'a1' }]);
  });

  it('enforces bounded concurrency: at most COLLECTOR_CONCURRENCY_LIMIT collectors run simultaneously', async () => {
    // Track the number of concurrently running collectors
    let concurrentCount = 0;
    let maxConcurrentCount = 0;

    const trackConcurrency = () => {
      concurrentCount += 1;
      maxConcurrentCount = Math.max(maxConcurrentCount, concurrentCount);
      return new Promise<any>((resolve) => {
        // Defer resolution to allow other collectors to start if concurrency limit permits
        setImmediate(() => {
          concurrentCount -= 1;
          resolve([]);
        });
      });
    };

    const { getIndicesStats } = jest.requireMock('./indices_stats_collector');
    const { getAccountsStats } = jest.requireMock('./accounts_stats_collector');
    const { getResourcesStats } = jest.requireMock('./resources_stats_collector');
    const { getRulesStats } = jest.requireMock('./rules_stats_collector');
    const { getInstallationStats } = jest.requireMock('./installation_stats_collector');
    const { getAlertsStats } = jest.requireMock('./alert_stats_collector');
    const { getAllCloudAccountsStats } = jest.requireMock('./cloud_accounts_stats_collector');
    const { getMutedRulesStats } = jest.requireMock('./muted_rules_stats_collector');
    const { getCspmCloudConnectorUsageStats } = jest.requireMock(
      './cspm_cloud_connector_usage_stats_collector'
    );

    getIndicesStats.mockImplementation(trackConcurrency);
    getAccountsStats.mockImplementation(trackConcurrency);
    getResourcesStats.mockImplementation(trackConcurrency);
    getRulesStats.mockImplementation(trackConcurrency);
    getInstallationStats.mockImplementation(trackConcurrency);
    getAlertsStats.mockImplementation(trackConcurrency);
    getAllCloudAccountsStats.mockImplementation(trackConcurrency);
    getMutedRulesStats.mockImplementation(trackConcurrency);
    getCspmCloudConnectorUsageStats.mockImplementation(trackConcurrency);

    const usageCollection = usageCollectionPluginMock.createSetupContract();
    registerCspmUsageCollector(logger, buildCoreServicesMock(), usageCollection);

    const [[collectorOptions]] = (usageCollection.makeUsageCollector as jest.Mock).mock.calls;
    await collectorOptions.fetch(buildFetchContext());

    // COLLECTOR_CONCURRENCY_LIMIT is 2; max concurrent should never exceed it
    expect(maxConcurrentCount).toBeLessThanOrEqual(2);
  });
});
