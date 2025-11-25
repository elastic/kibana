/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import {
  SavedObjectsClient,
  type ElasticsearchClient,
  type Logger,
  type SavedObjectsClientContract,
} from '@kbn/core/server';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common/rules_settings';
import { publicAlertsClientMock } from '@kbn/alerting-plugin/server/alerts_client/alerts_client.mock';
import type { IBasePath } from '@kbn/core/server';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import {
  NO_SLI_DATA_ACTIONS_ID,
  SLI_DESTINATION_INDEX_PATTERN,
  getSLOTransformId,
  getSLOSummaryTransformId,
} from '../../../../common/constants';
import {
  SLO_ID_FIELD,
  SLO_REVISION_FIELD,
  SLO_INSTANCE_ID_FIELD,
} from '../../../../common/field_names/slo';
import type { SLORepository } from '../../../services';
import {
  KibanaSavedObjectsSLORepository,
  CreateSLO,
  DefaultTransformManager,
  DefaultSummaryTransformManager,
} from '../../../services';
import { createTransformGenerators } from '../../../services/transform_generators';
import { DefaultSummaryTransformGenerator } from '../../../services/summary_transform_generator/summary_transform_generator';
import { createKQLCustomIndicator } from '../../../services/fixtures/slo';
import { sevenDaysRolling } from '../../../services/fixtures/time_window';
import { getRuleExecutor } from '../../rules/slo_burn_rate/executor';
import type { BurnRateRuleParams } from '../../rules/slo_burn_rate/types';
import { AlertStates } from '../../rules/slo_burn_rate/types';
import { ALL_VALUE } from '@kbn/slo-schema';

const createLoggerMock = (): jest.Mocked<Logger> => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    get: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  logger.get.mockReturnValue(logger);

  return logger;
};

describe('SLO Transform Alert Integration Test', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let soClient: SavedObjectsClientContract;
  let kibanaServer: TestKibanaUtils;
  let sloRepository: SLORepository;
  let loggerMock: jest.Mocked<Logger>;
  const basePathMock = { publicBaseUrl: 'https://kibana.dev' } as IBasePath;

  const SOURCE_INDEX = 'test-source-index';
  const SLO_ID = 'test-slo-id';

  beforeAll(async () => {
    await createServers();
  });

  afterAll(async () => {
    await stopServers();
  });

  it('should trigger "no SLI data" alert when transforms are stopped', async () => {
    // 1. Create source index and index documents over the past hour
    // (to satisfy the 30+ minute requirement for the alert)
    await esClient.indices.create({
      index: SOURCE_INDEX,
      body: {
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'metric.value': { type: 'float' },
          },
        },
      },
    });

    // Index documents over the past hour (to satisfy the 30+ minute requirement)
    // We need to ensure documents are at least 40 minutes old, so we'll index documents
    // starting from 1.5 hours ago to ensure they're old enough
    const testStartTime = Date.now();
    const oneAndHalfHoursAgo = testStartTime - 90 * 60 * 1000; // 1.5 hours ago
    const oneHourAgo = testStartTime - 60 * 60 * 1000; // 1 hour ago
    const documents = [];
    // Create documents every minute for the past 1.5 hours (90 documents)
    // This ensures we have documents that are definitely older than 40 minutes
    for (let i = 0; i < 90; i++) {
      const timestamp = new Date(oneAndHalfHoursAgo + i * 60 * 1000);
      documents.push({
        '@timestamp': timestamp.toISOString(),
        'metric.value': 0.5, // Good value (< 1)
      });
    }

    await esClient.bulk({
      body: documents.flatMap((doc) => [{ index: { _index: SOURCE_INDEX } }, doc]),
      refresh: 'wait_for',
    });

    // 2. Create SLO using CreateSLO service (this will create transforms)
    const sloParams = {
      id: SLO_ID,
      name: 'Test SLO for Transform Alert',
      description: 'Test SLO to verify transform alert',
      indicator: createKQLCustomIndicator({
        index: SOURCE_INDEX,
        good: 'metric.value < 1',
        total: 'metric.value: *',
        timestampField: '@timestamp',
        filter: '', // Empty filter to match all documents (default in fixture is 'labels.groupId: group-3' which won't match)
      }),
      timeWindow: sevenDaysRolling(),
      budgetingMethod: 'occurrences' as const,
      objective: {
        target: 0.99,
      },
    };

    const scopedClusterClient = {
      asCurrentUser: esClient,
      asInternalUser: esClient,
      asSecondaryAuthUser: esClient,
    };

    // Create a mock dataViewsService since the plugin may not be available in Jest integration tests
    // For KQL custom indicators without a dataViewId, getIndicatorDataView returns undefined
    const mockDataViewsService: DataViewsService = {
      get: jest.fn().mockResolvedValue(undefined),
      getDataViewLazy: jest.fn(),
      create: jest.fn(),
      createAndSave: jest.fn(),
      createAndSaveDataViewLazy: jest.fn(),
      clearCache: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      getDefaultId: jest.fn(),
      getIdsWithTitle: jest.fn(),
      hasUserDataView: jest.fn(),
      refreshFields: jest.fn(),
      updateSavedObject: jest.fn(),
      ensureDefaultIndexPattern: jest.fn(),
      ensureDefaultDataView: jest.fn(),
    } as unknown as DataViewsService;

    const transformGenerators = createTransformGenerators(
      'default', // spaceId
      mockDataViewsService,
      false // isServerless
    );

    const transformManager = new DefaultTransformManager(
      transformGenerators,
      scopedClusterClient,
      loggerMock
    );
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      scopedClusterClient,
      loggerMock
    );

    const createSLO = new CreateSLO(
      scopedClusterClient,
      sloRepository,
      soClient,
      transformManager,
      summaryTransformManager,
      loggerMock,
      'default', // spaceId
      basePathMock,
      'test-user' // username
    );

    const createdSLO = await createSLO.execute(sloParams);

    // Fetch the SLO to get the revision (CreateSLOResponse only returns id)
    const slo = await sloRepository.findById(createdSLO.id);
    const sloRevision = slo.revision;

    // 3. Wait for transforms to be created and started
    const rollupTransformId = getSLOTransformId(createdSLO.id, sloRevision);
    const summaryTransformId = getSLOSummaryTransformId(createdSLO.id, sloRevision);

    await waitForTransform(esClient, rollupTransformId);
    await waitForTransform(esClient, summaryTransformId);

    // Verify transforms are started
    await waitForTransformStarted(esClient, rollupTransformId);
    await waitForTransformStarted(esClient, summaryTransformId);

    // Note: In Jest integration tests, transforms may not automatically process data
    // as they would in a real Kibana instance. For this test, we'll:
    // 1. Stop the transforms immediately (simulating them being stopped)
    // 2. Ensure source data exists (which we already have)
    // 3. Verify the alert logic detects no SLI data but source data exists
    //
    // The test scenario: Source data is flowing, but transforms are stopped,
    // so no SLI data is being generated. The executor should detect this
    // and trigger a "no SLI data" alert.

    // 4. Stop the transforms
    await esClient.transform.stopTransform({
      transform_id: rollupTransformId,
      wait_for_completion: true,
      force: true,
    });

    await esClient.transform.stopTransform({
      transform_id: summaryTransformId,
      wait_for_completion: true,
      force: true,
    });

    // 5. Delete ALL SLI data for this SLO to ensure the executor doesn't find any
    // This simulates the scenario where transforms are stopped and no SLI data exists
    // Note: Transform-generated SLI documents may not have slo.revision field,
    // so we delete by slo.id only (as done in DeleteSLO service)
    const deleteResponse = await esClient.deleteByQuery({
      index: SLI_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': slo.id } }],
        },
      },
      refresh: true,
      wait_for_completion: true,
      conflicts: 'proceed',
      slices: 'auto',
    });

    // Verify deletion worked - wait a bit longer and check multiple times
    let verifyDelete;
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      verifyDelete = await esClient.count({
        index: SLI_DESTINATION_INDEX_PATTERN,
        query: {
          bool: {
            filter: [{ term: { 'slo.id': slo.id } }],
          },
        },
      });
      if (verifyDelete.count === 0) {
        break;
      }
    }

    if (verifyDelete.count > 0) {
      throw new Error(
        `Failed to delete all SLI documents. ${verifyDelete.count} documents remaining for SLO ${slo.id}.`
      );
    }

    // 6. Wait a bit to ensure no new SLI data is generated
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 7. Continue indexing source data RIGHT BEFORE running the executor
    // This ensures the recent window (last 20 minutes) has fresh data
    // The executor checks for at least 3 documents in the last 20 minutes
    const justBeforeExecutor = Date.now();
    const additionalDocuments = [];
    // Add 10 documents spread over the last 20 minutes to ensure we have at least 3
    // We use the current time to ensure they're definitely in the recent window
    for (let i = 0; i < 10; i++) {
      additionalDocuments.push({
        '@timestamp': new Date(justBeforeExecutor - i * 2 * 60 * 1000).toISOString(), // Last 20 minutes, every 2 minutes
        'metric.value': 0.5,
      });
    }

    await esClient.bulk({
      body: additionalDocuments.flatMap((doc) => [{ index: { _index: SOURCE_INDEX } }, doc]),
      refresh: 'wait_for',
    });

    // Verify source data exists and is in the right time range
    const currentTimeForCheck = Date.now();
    const sourceDataCheck = await esClient.count({
      index: SOURCE_INDEX,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: new Date(currentTimeForCheck - 20 * 60 * 1000).toISOString(),
                  lte: new Date(currentTimeForCheck).toISOString(),
                },
              },
            },
          ],
        },
      },
    });
    loggerMock.info(`Source data in last 20 minutes: ${sourceDataCheck.count} documents`);

    // Also check source data in the full 1-hour window
    const oneHourAgoCheck = new Date(currentTimeForCheck - 60 * 60 * 1000);
    const fullWindowCheck = await esClient.search({
      index: SOURCE_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: oneHourAgoCheck.toISOString(),
                  lte: new Date(currentTimeForCheck).toISOString(),
                },
              },
            },
          ],
        },
      },
      aggs: {
        earliest_timestamp: {
          min: {
            field: '@timestamp',
          },
        },
      },
    });
    const earliestTimestamp = fullWindowCheck.aggregations?.earliest_timestamp?.value;
    if (earliestTimestamp) {
      const dataAgeMinutes = (currentTimeForCheck - earliestTimestamp) / (1000 * 60);
      loggerMock.info(
        `Source data age: ${dataAgeMinutes.toFixed(2)} minutes (earliest: ${new Date(
          earliestTimestamp
        ).toISOString()})`
      );
    }

    // 8. Execute the burn rate rule executor directly with a mock alertsClient
    const alertsClient = publicAlertsClientMock.create();
    // Mock report() to return a uuid (as the real implementation does)
    alertsClient.report.mockImplementation(() => ({
      uuid: 'test-alert-uuid',
      start: new Date().toISOString(),
      alertDoc: undefined,
    }));
    const executor = getRuleExecutor(basePathMock);

    // Create dataViewsContract for executor
    const dataViewsContract = await dataViewPluginMocks.createStartContract();

    const ruleParams: BurnRateRuleParams = {
      sloId: createdSLO.id,
      windows: [
        {
          id: 0,
          burnRateThreshold: 1,
          maxBurnRateThreshold: null,
          longWindow: { value: 1, unit: 'h' },
          shortWindow: { value: 5, unit: 'm' },
          actionGroup: 'slo.burnRate.alert',
        },
      ],
    };

    try {
      await executor({
        params: ruleParams,
        startedAt: new Date(),
        startedAtOverridden: false,
        services: {
          savedObjectsClient: soClient,
          scopedClusterClient: {
            asCurrentUser: esClient,
            asInternalUser: esClient,
            asSecondaryAuthUser: esClient,
          },
          alertsClient,
          alertFactory: {
            create: jest.fn(),
            done: jest.fn(),
            alertLimit: { getValue: jest.fn(), setLimitReached: jest.fn() },
          },
          getSearchSourceClient: jest.fn(),
          uiSettingsClient: {} as any,
          shouldWriteAlerts: jest.fn().mockReturnValue(true),
          shouldStopExecution: jest.fn().mockReturnValue(false),
          share: {} as any,
          getDataViews: jest.fn().mockResolvedValue(dataViewPluginMocks.createStartContract()),
          getMaintenanceWindowIds: jest.fn().mockResolvedValue([]),
          getAsyncSearchClient: jest.fn().mockReturnValue({ search: jest.fn() }),
        },
        executionId: 'test-execution-id',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {
          id: 'test-rule-id',
          name: 'Test Rule',
          tags: [],
          consumer: 'slo',
          enabled: true,
          schedule: { interval: '1m' },
          createdBy: 'test',
          updatedBy: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
          revision: 1,
          alertTypeId: 'slo.rules.burnRate',
          apiKey: null,
          apiKeyOwner: null,
          muteAll: false,
          mutedInstanceIds: [],
          notifyWhen: null,
          throttle: null,
          executionStatus: {
            status: 'ok',
            lastExecutionDate: new Date(),
          },
        } as any,
        spaceId: 'default',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange: (duration: string) => {
          const timeNow = new Date();
          // For '1h' duration, return the past hour
          if (duration === '1h') {
            const oneHourAgoTime = new Date(timeNow.getTime() - 60 * 60 * 1000);
            return {
              dateStart: oneHourAgoTime.toISOString(),
              dateEnd: timeNow.toISOString(),
            };
          }
          // For '1m' duration, return the past minute (used for burn rate evaluation)
          const oneMinuteAgoTime = new Date(timeNow.getTime() - 60 * 1000);
          return {
            dateStart: oneMinuteAgoTime.toISOString(),
            dateEnd: timeNow.toISOString(),
          };
        },
        isServerless: false,
      });
    } catch (error) {
      loggerMock.error(`Executor error: ${error}`);
      throw error;
    }

    // 9. Verify the "no SLI data" alert was triggered
    expect(alertsClient.report).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `${createdSLO.id}-no-sli-data`,
        actionGroup: NO_SLI_DATA_ACTIONS_ID,
        state: {
          alertState: AlertStates.NO_DATA, // AlertStates.NO_DATA is the enum value 2
        },
        payload: expect.objectContaining({
          [SLO_ID_FIELD]: createdSLO.id,
          [SLO_REVISION_FIELD]: sloRevision,
          [SLO_INSTANCE_ID_FIELD]: ALL_VALUE, // Use ALL_VALUE constant instead of '*'
        }),
      })
    );

    expect(alertsClient.setAlertData).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `${createdSLO.id}-no-sli-data`,
        context: expect.objectContaining({
          sloId: slo.id,
          sloName: slo.name, // Use the SLO object we fetched from repository
          reason: expect.stringContaining('No SLI data generated'),
        }),
      })
    );
  });

  async function createServers() {
    const { startES, startKibana } = createTestServers({
      adjustTimeout: jest.setTimeout,
      settings: {
        es: {
          license: 'trial',
        },
        kbn: {
          cliArgs: {
            oss: false,
          },
        },
      },
    });

    esServer = await startES();
    kibanaServer = await startKibana();

    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
    soClient = new SavedObjectsClient(
      kibanaServer.coreStart.savedObjects.createInternalRepository()
    );
    loggerMock = createLoggerMock();

    sloRepository = new KibanaSavedObjectsSLORepository(soClient, loggerMock);
  }

  async function stopServers() {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }

    jest.clearAllMocks();
  }

  async function waitForTransform(client: ElasticsearchClient, transformId: string) {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await client.transform.getTransform({
          transform_id: transformId,
        });
        if (response.transforms && response.transforms.length > 0) {
          return;
        }
      } catch (error: any) {
        if (error.statusCode !== 404) {
          throw error;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`Transform ${transformId} not found after ${maxAttempts} attempts`);
  }

  async function waitForTransformStarted(client: ElasticsearchClient, transformId: string) {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const stats = await client.transform.getTransformStats({
          transform_id: transformId,
        });
        if (stats.transforms && stats.transforms.length > 0) {
          const transform = stats.transforms[0];
          // Transform should be started or indexing
          if (transform.state === 'started' || transform.state === 'indexing') {
            loggerMock.info(
              `Transform ${transformId} is ${transform.state}, processed: ${
                transform.stats?.documents_processed || 0
              } docs`
            );
            return;
          }
        }
      } catch (error: any) {
        if (error.statusCode !== 404) {
          throw error;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`Transform ${transformId} not started after ${maxAttempts} attempts`);
  }

  async function waitForSLIData(client: ElasticsearchClient, sloId: string, revision: number) {
    const maxAttempts = 120; // Wait up to 120 seconds for SLI data (transforms can be slow)
    const rollupTransformId = getSLOTransformId(sloId, revision);

    for (let i = 0; i < maxAttempts; i++) {
      // Check transform stats to see if it's processing
      try {
        const transformStats = await client.transform.getTransformStats({
          transform_id: rollupTransformId,
        });
        if (transformStats.transforms && transformStats.transforms.length > 0) {
          const stats = transformStats.transforms[0].stats;
          loggerMock.info(
            `Transform ${rollupTransformId}: state=${transformStats.transforms[0].state}, ` +
              `docs_processed=${stats?.documents_processed || 0}, ` +
              `docs_indexed=${stats?.documents_indexed || 0}`
          );
        }
      } catch (error) {
        // Ignore errors when checking stats
      }

      const response = await client.count({
        index: '.slo-observability.sli-v3*',
        query: {
          bool: {
            filter: [{ term: { 'slo.id': sloId } }, { term: { 'slo.revision': revision } }],
          },
        },
      });

      if (response.count > 0) {
        loggerMock.info(`Found ${response.count} SLI documents for SLO ${sloId}`);
        return;
      }

      // Log progress every 10 seconds
      if (i % 10 === 0 && i > 0) {
        loggerMock.info(
          `Waiting for SLI data... attempt ${i}/${maxAttempts}, count=${response.count}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Before throwing, check if there are any SLI documents at all
    const finalCheck = await client.count({
      index: '.slo-observability.sli-v3*',
    });
    loggerMock.error(
      `No SLI data found for SLO ${sloId} after ${maxAttempts} attempts. Total SLI docs in index: ${finalCheck.count}`
    );

    throw new Error(`No SLI data found for SLO ${sloId} after ${maxAttempts} attempts`);
  }
});
