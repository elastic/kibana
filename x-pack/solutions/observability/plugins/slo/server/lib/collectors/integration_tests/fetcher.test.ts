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
import { KibanaSavedObjectsSLORepository, SLORepository } from '../../../services';
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
  let sloRepository: SLORepository;
  let loggerMock: jest.Mocked<Logger>;

  beforeAll(async () => {
    await createServers();
  });

  afterAll(async () => {
    await stopServers();
  });

  describe('soomething', () => {
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

    it('without any SLOs', async () => {
      const results = await fetcher({ soClient, esClient });

      expect(results.slo).toMatchInlineSnapshot();
    });
  });

  async function createServers() {
    const { startES, startKibana } = createTestServers({
      adjustTimeout: jest.setTimeout,
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
    await kibanaServer.stop();
    await esServer.stop();

    jest.clearAllMocks();
  }
});
