/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { UsageCollectorDeps } from './trial_companion_nba_detectors';
import {
  casesM6,
  installedPackagesM1,
  savedDiscoverySessionsM2,
  detectionRulesInstalledM3,
  aiFeaturesM5,
} from './trial_companion_nba_detectors';
import type {
  Collector,
  CollectorFetchContext,
  ICollectorSet,
} from '@kbn/usage-collection-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Milestone } from '../../../../common/trial_companion/types';
import type { PackageClient, PackageService } from '@kbn/fleet-plugin/server';
import { lazyObject } from '@kbn/lazy-object';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type { CountResponse } from '@elastic/elasticsearch/lib/api/types';
import { CASE_SAVED_OBJECT } from '@kbn/cases-plugin/common/constants';

describe('Trial companion NBA detectors', () => {
  const logger = loggingSystemMock.createLogger();
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;
  let collectorContext: CollectorFetchContext;
  const collector: jest.Mocked<Collector<unknown, object>> = {
    fetch: jest.fn(),
  } as unknown as jest.Mocked<Collector<unknown, object>>;
  let usageCollection: jest.Mocked<ICollectorSet>;
  let deps: UsageCollectorDeps;
  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchClientMock.createInternalClient();
    usageCollection = {
      getCollectorByType: jest.fn(),
    } as unknown as jest.Mocked<ICollectorSet>;
    usageCollection.getCollectorByType.mockReturnValue(collector);
    collectorContext = {
      soClient,
      esClient,
    };
    deps = {
      logger,
      collectorContext,
      usageCollection,
    };
    jest.clearAllMocks();
  });

  const buildCountResponse = (count: number): CountResponse => ({
    count,
    _shards: {
      failed: 0,
      successful: 0,
      total: 0,
    },
  });

  it.each([
    [10, undefined],
    [1, undefined],
    [0, Milestone.M2],
  ])('savedDiscoverySessionsM2 with total: %s', async (total, expected) => {
    soClient.find.mockResolvedValueOnce({ saved_objects: [], total, per_page: 0, page: 0 });
    await expect(savedDiscoverySessionsM2(deps)()).resolves.toEqual(expected);
  });

  describe('installedPackagesM1', () => {
    const packageClient: jest.Mocked<PackageClient> = {
      getPackages: jest.fn(),
    } as unknown as jest.Mocked<PackageClient>;
    const packageService: PackageService = lazyObject({
      asInternalUser: packageClient,
      asScoped: jest.fn(),
    });
    beforeEach(() => {
      jest.clearAllMocks();
    });
    const createPackageListItem = (name: string, status: string): PackageListItem =>
      ({
        id: '',
        name,
        title: '',
        version: '',
        status,
      } as PackageListItem);
    it.each([
      [
        'installed one default package',
        [createPackageListItem('endpoint', 'installed')],
        buildCountResponse(1),
        Milestone.M1,
      ],
      [
        'installed non-default',
        [
          createPackageListItem('trial-companion', 'installed'),
          createPackageListItem('trial-test', 'installed'),
        ],
        buildCountResponse(1),
        undefined,
      ],
      [
        'not installed',
        [createPackageListItem('endpoint', ''), createPackageListItem('trial-companion', '')],
        buildCountResponse(1),
        Milestone.M1,
      ],
      [
        'only default packages',
        [
          createPackageListItem('endpoint', 'installed'),
          createPackageListItem('security_ai_prompts', 'installed'),
          createPackageListItem('security_detection_engine', 'installed'),
          createPackageListItem('elastic_agent', 'installed'),
          createPackageListItem('fleet_server', 'installed'),
        ],
        buildCountResponse(1),
        Milestone.M1,
      ],
      [
        'all installed',
        [
          createPackageListItem('trial-test', 'installed'),
          createPackageListItem('fleet_server', 'installed'),
        ],
        buildCountResponse(1),
        undefined,
      ],
      [
        'all installed no agent',
        [
          createPackageListItem('trial-test', 'installed'),
          createPackageListItem('fleet_server', 'installed'),
        ],
        buildCountResponse(0),
        Milestone.M1,
      ],
    ])(
      'returns milestone based on packages in %s',
      async (_tcName, packageList, esResponse, expected) => {
        packageClient.getPackages.mockResolvedValueOnce(packageList);
        esClient.count.mockResolvedValueOnce(esResponse);
        await expect(installedPackagesM1(deps.logger, packageService, esClient)()).resolves.toEqual(
          expected
        );
      }
    );
    it('propagates error from package service', async () => {
      packageClient.getPackages.mockRejectedValueOnce(new Error('test error'));
      await expect(
        installedPackagesM1(deps.logger, packageService, esClient)()
      ).rejects.toThrowError();
    });
  });

  describe('casesM6', () => {
    it.each([
      ['0 cases', 0, Milestone.M6],
      ['with cases', 3, undefined],
    ])('compares total count of cases saved objects - %s', async (_tcName, total, expected) => {
      (collector.fetch as jest.Mock).mockResolvedValue({
        by_type: [{ type: CASE_SAVED_OBJECT, count: total }],
      });
      await expect(casesM6(deps)()).resolves.toEqual(expected);
    });

    describe('detectionRulesInstalledM3', () => {
      it.each([
        [
          '0 rules',
          {
            detectionMetrics: {
              detection_rules: {
                detection_rule_usage: {
                  custom_total: { enabled: 0 },
                  elastic_total: { enabled: 0 },
                },
              },
            },
          },
          Milestone.M3,
        ],
        [
          'some rules',
          {
            detectionMetrics: {
              detection_rules: {
                detection_rule_usage: {
                  custom_total: { enabled: 42 },
                  elastic_total: { enabled: 31 },
                },
              },
            },
          },
          undefined,
        ],
        ['empty telemetry', {}, Milestone.M3],
      ])('compares total count of rules - %s', async (_tcName, telemetry, expected) => {
        (collector.fetch as jest.Mock).mockResolvedValue(telemetry);
        await expect(detectionRulesInstalledM3(deps)()).resolves.toEqual(expected);
      });
    });

    describe('aiFeaturesM5', () => {
      it.each([
        ['0 alerts, 0 conversations, 0 charts', 0, 0, 0, Milestone.M5],
        ['0 alerts, 3 conversations, 0 charts', 0, 3, 0, undefined],
        ['2 alerts, 0 conversations, 0 charts', 2, 0, 0, undefined],
        ['5 alerts, 12 conversations, 0 charts', 5, 12, 0, undefined],
        ['5 alerts, 12 conversations, 1 charts', 5, 12, 1, undefined],
        ['0 alerts, 0 conversations, 1 charts', 0, 0, 7, undefined],
      ])(
        'compares count of attack discovery alerts and assistant conversations - %s',
        async (_tcName, alerts, assistant, chart, expected) => {
          (esClient.count as jest.Mock).mockResolvedValueOnce(buildCountResponse(alerts));
          (esClient.count as jest.Mock).mockResolvedValueOnce(buildCountResponse(assistant));
          (esClient.count as jest.Mock).mockResolvedValueOnce(buildCountResponse(chart));
          await expect(aiFeaturesM5(esClient)()).resolves.toEqual(expected);
        }
      );
    });
  });
});
