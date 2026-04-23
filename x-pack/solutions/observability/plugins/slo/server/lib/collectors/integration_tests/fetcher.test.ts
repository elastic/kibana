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
import type { SLODefinitionRepository } from '../../../services';
import { DefaultSLODefinitionRepository } from '../../../services';
import {
  createAPMTransactionDurationIndicator,
  createAPMTransactionErrorRateIndicator,
  createKQLCustomIndicator,
  createMetricCustomIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
  createSyntheticsAvailabilityIndicator,
  createTimesliceMetricIndicator,
} from '../../../services/fixtures/slo';
import { fetcher } from '../fetcher';

const createLoggerMock = (): jest.Mocked<Logger> => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    get: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  logger.get.mockReturnValue(logger);

  return logger;
};

describe('SLO usage collector fetcher', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let soClient: SavedObjectsClientContract;
  let kibanaServer: TestKibanaUtils;
  let sloRepository: SLODefinitionRepository;
  let loggerMock: jest.Mocked<Logger>;

  beforeAll(async () => {
    await createServers();
  });

  afterAll(async () => {
    await stopServers();
  });

  describe('with some SLOs', () => {
    beforeEach(async () => {
      await Promise.all([
        sloRepository.create(createSLO({ indicator: createAPMTransactionErrorRateIndicator() })),
        sloRepository.create(createSLO({ indicator: createAPMTransactionDurationIndicator() })),
        sloRepository.create(createSLO({ indicator: createSyntheticsAvailabilityIndicator() })),
        sloRepository.create(createSLO({ indicator: createKQLCustomIndicator() })),
        sloRepository.create(
          createSLOWithTimeslicesBudgetingMethod({ indicator: createMetricCustomIndicator() })
        ),
        sloRepository.create(
          createSLOWithTimeslicesBudgetingMethod({ indicator: createTimesliceMetricIndicator() })
        ),
        sloRepository.create(
          createSLO({ groupBy: ['host.name'], indicator: createKQLCustomIndicator() })
        ),
        sloRepository.create(
          createSLO({ groupBy: 'host.name', indicator: createKQLCustomIndicator() })
        ),
      ]);
    });

    it('returns the correct metrics', async () => {
      const results = await fetcher({ soClient, esClient });

      expect(results.slo).toMatchInlineSnapshot(`
        Object {
          "by_budgeting_method": Object {
            "occurrences": 6,
            "timeslices": 2,
          },
          "by_calendar_aligned_duration": Object {},
          "by_rolling_duration": Object {
            "7d": 8,
          },
          "by_sli_type": Object {
            "sli.apm.transactionDuration": 1,
            "sli.apm.transactionErrorRate": 1,
            "sli.kql.custom": 3,
            "sli.metric.custom": 1,
            "sli.metric.timeslice": 1,
            "sli.synthetics.availability": 1,
          },
          "by_status": Object {
            "disabled": 0,
            "enabled": 8,
          },
          "definitions": Object {
            "total": 8,
            "total_with_ccs": 0,
            "total_with_groups": 2,
          },
          "instances": Object {
            "total": 0,
          },
          "total": 8,
        }
      `);
    });
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

    sloRepository = new DefaultSLODefinitionRepository(soClient, loggerMock);
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
});
