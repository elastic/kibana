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
import { COMPOSITE_SLO_MAX_MEMBERS, storedCompositeSloDefinitionSchema } from '@kbn/slo-schema';
import { v4 as uuidv4 } from 'uuid';
import type { CompositeSLODefinition, StoredCompositeSLODefinition } from '../../../domain/models';
import { SO_SLO_COMPOSITE_TYPE } from '../../../saved_objects';
import type { SLODefinitionRepository } from '../../../services';
import { DefaultSLODefinitionRepository } from '../../../services';
import { createCompositeSlo } from '../../../services/fixtures/composite_slo';
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
    warn: jest.fn(),
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
  let compositeSoClient: SavedObjectsClientContract;
  let getCompositeSoClient: jest.Mock<Promise<SavedObjectsClientContract>>;
  let kibanaServer: TestKibanaUtils;
  let sloRepository: SLODefinitionRepository;
  let loggerMock: jest.Mocked<Logger>;

  beforeAll(async () => {
    await createServers();
  });

  beforeEach(() => {
    loggerMock.warn.mockClear();
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
      const results = await fetcher({ soClient, esClient }, loggerMock, getCompositeSoClient);

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

  describe('with composite SLOs', () => {
    const emptyCompositeUsage = {
      definitions: { total: 0 },
      by_status: { enabled: 0, disabled: 0 },
      by_budgeting_method: { occurrences: 0 },
      by_composite_method: { weightedAverage: 0 },
      members: { min: 0, avg: 0, max: 0, at_max_count: 0 },
    };

    const createMembers = (count: number): CompositeSLODefinition['members'] =>
      Array.from({ length: count }, () => ({ sloId: uuidv4(), weight: 1 }));

    const createStoredComposite = async (
      overrides: Partial<CompositeSLODefinition>,
      namespace?: string
    ) => {
      const toStore: StoredCompositeSLODefinition = storedCompositeSloDefinitionSchema.encode(
        createCompositeSlo(overrides)
      );
      await compositeSoClient.create<StoredCompositeSLODefinition>(SO_SLO_COMPOSITE_TYPE, toStore, {
        namespace,
      });
    };

    afterEach(async () => {
      const response = await compositeSoClient.find({
        type: SO_SLO_COMPOSITE_TYPE,
        namespaces: ['*'],
        perPage: 100,
      });
      await Promise.all(
        response.saved_objects.map(({ id, namespaces }) =>
          compositeSoClient.delete(SO_SLO_COMPOSITE_TYPE, id, { namespace: namespaces?.[0] })
        )
      );
    });

    it('returns zeros when there are no composites', async () => {
      const results = await fetcher({ soClient, esClient }, loggerMock, getCompositeSoClient);

      expect(results.composite).toEqual(emptyCompositeUsage);
      expect(loggerMock.warn).not.toHaveBeenCalled();
    });

    it('aggregates several composites with different member counts and statuses', async () => {
      await createStoredComposite({ members: createMembers(2) });
      await createStoredComposite({ members: createMembers(5), enabled: false });
      await createStoredComposite({ members: createMembers(COMPOSITE_SLO_MAX_MEMBERS) });
      await createStoredComposite({
        members: createMembers(COMPOSITE_SLO_MAX_MEMBERS),
        enabled: false,
      });

      const results = await fetcher({ soClient, esClient }, loggerMock, getCompositeSoClient);

      expect(results.composite).toEqual({
        definitions: { total: 4 },
        by_status: { enabled: 2, disabled: 2 },
        by_budgeting_method: { occurrences: 4 },
        by_composite_method: { weightedAverage: 4 },
        members: { min: 2, avg: 14.25, max: COMPOSITE_SLO_MAX_MEMBERS, at_max_count: 2 },
      });
    });

    it('counts composites in all spaces', async () => {
      await createStoredComposite({ members: createMembers(2) });
      await createStoredComposite({ members: createMembers(4) }, 'custom-space');

      const results = await fetcher({ soClient, esClient }, loggerMock, getCompositeSoClient);

      expect(results.composite.definitions.total).toBe(2);
      expect(results.composite.members).toEqual({ min: 2, avg: 3, max: 4, at_max_count: 0 });
    });

    it('returns zeros, logs a warning and keeps the slo block when reading composites fails', async () => {
      await createStoredComposite({ members: createMembers(3) });
      const expected = await fetcher({ soClient, esClient }, loggerMock, getCompositeSoClient);

      const results = await fetcher({ soClient, esClient }, loggerMock, () =>
        Promise.reject(new Error('boom'))
      );

      expect(results.slo).toEqual(expected.slo);
      expect(results.composite).toEqual(emptyCompositeUsage);
      expect(loggerMock.warn).toHaveBeenCalledWith('Failed to collect composite SLO usage: boom');
    });

    it('keeps the collected usage and logs a warning when closing the finder fails', async () => {
      await createStoredComposite({ members: createMembers(3) });
      const finder = compositeSoClient.createPointInTimeFinder<StoredCompositeSLODefinition>({
        type: SO_SLO_COMPOSITE_TYPE,
        perPage: 100,
        namespaces: ['*'],
      });
      const realClose = finder.close.bind(finder);
      // The finder closes itself when the iteration ends (first call); the fetcher's `finally` is the second
      finder.close = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(new Error('close boom'));
      const createFinderSpy = jest
        .spyOn(compositeSoClient, 'createPointInTimeFinder')
        .mockReturnValue(finder);

      const results = await fetcher({ soClient, esClient }, loggerMock, getCompositeSoClient);

      expect(results.composite.definitions.total).toBe(1);
      expect(results.composite.members).toEqual({ min: 3, avg: 3, max: 3, at_max_count: 0 });
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Failed to close composite SLO finder: close boom'
      );

      createFinderSpy.mockRestore();
      await realClose();
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
    compositeSoClient = new SavedObjectsClient(
      kibanaServer.coreStart.savedObjects.createInternalRepository([SO_SLO_COMPOSITE_TYPE])
    );
    getCompositeSoClient = jest.fn().mockResolvedValue(compositeSoClient);
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
