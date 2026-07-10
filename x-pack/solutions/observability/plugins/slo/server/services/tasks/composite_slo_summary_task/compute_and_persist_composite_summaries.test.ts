/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { addTransactionLabels, withSpan } from '@kbn/apm-utils';
import apm from 'elastic-apm-node';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../../common/constants';
import type { StoredCompositeSLODefinition, StoredSLODefinition } from '../../../domain/models';
import { SO_SLO_COMPOSITE_TYPE } from '../../../saved_objects/slo_composite';
import { SO_SLO_TYPE } from '../../../saved_objects/slo';
import { DefaultBurnRatesClient } from '../../burn_rates_client';
import { DefaultSummaryClient } from '../../summary_client';
import { computeCompositeSummary } from '../../composites/compute_composite_summary';
import { computeAndPersistCompositeSummaries } from './compute_and_persist_composite_summaries';
import { COMPOSITE_SLO_SUMMARY_TASK_SPAN_NAMES } from './constants';

jest.mock('@kbn/apm-utils', () => ({
  addTransactionLabels: jest.fn(),
  withSpan: jest.fn((_opts: unknown, cb: () => unknown) => cb()),
}));

jest.mock('elastic-apm-node', () => ({
  default: { setCustomContext: jest.fn() },
  __esModule: true,
}));

jest.mock('../../summary_client');
jest.mock('../../burn_rates_client');
jest.mock('../../composites/compute_composite_summary');

const MockDefaultSummaryClient = DefaultSummaryClient as jest.MockedClass<
  typeof DefaultSummaryClient
>;
const mockComputeCompositeSummary = computeCompositeSummary as jest.MockedFunction<
  typeof computeCompositeSummary
>;

const addTransactionLabelsMock = addTransactionLabels as jest.MockedFunction<
  typeof addTransactionLabels
>;
const setCustomContextMock = apm.setCustomContext as jest.MockedFunction<
  typeof apm.setCustomContext
>;
const withSpanMock = withSpan as jest.MockedFunction<typeof withSpan>;

const COMPOSITE_ID = 'composite-slo-id-12345678';
const MEMBER_ID = 'member-slo-id-123456789';
const MEMBER_ID_2 = 'member-slo-id-987654321';
const TEST_DATE = new Date('2024-01-01T00:00:00.000Z');

function buildStoredCompositeSLO(
  overrides: Partial<StoredCompositeSLODefinition> = {}
): SavedObjectsFindResult<StoredCompositeSLODefinition> {
  return {
    id: `so-${COMPOSITE_ID}`,
    type: SO_SLO_COMPOSITE_TYPE,
    references: [],
    score: 1,
    namespaces: ['default'],
    attributes: {
      id: COMPOSITE_ID,
      name: 'Test Composite SLO',
      description: 'test description',
      compositeMethod: 'weightedAverage',
      timeWindow: { duration: '30d', type: 'rolling' },
      budgetingMethod: 'occurrences',
      objective: { target: 0.99 },
      tags: ['test'],
      enabled: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      createdBy: 'user',
      updatedBy: 'user',
      version: 1,
      members: [
        { sloId: MEMBER_ID, weight: 1 },
        { sloId: MEMBER_ID_2, weight: 1 },
      ],
      ...overrides,
    } as StoredCompositeSLODefinition,
  };
}

function buildStoredMemberSLO(
  id: string = MEMBER_ID,
  spaceId: string = 'default'
): SavedObjectsFindResult<StoredSLODefinition> {
  return {
    id: `so-${id}`,
    type: SO_SLO_TYPE,
    references: [],
    score: 1,
    namespaces: [spaceId],
    attributes: {
      id,
      name: 'Member SLO',
      description: '',
      indicator: {
        type: 'sli.kql.custom',
        params: {
          index: 'test-*',
          good: 'status:200',
          total: '',
          timestampField: '@timestamp',
        },
      },
      timeWindow: { duration: '7d', type: 'rolling' },
      budgetingMethod: 'occurrences',
      objective: { target: 0.99 },
      revision: 1,
      enabled: true,
      tags: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    } as unknown as StoredSLODefinition,
  };
}

function buildSummaryResult() {
  return {
    groupings: {},
    meta: {},
    summary: {
      sliValue: 0.995,
      errorBudget: { initial: 0.01, consumed: 0.5, remaining: 0.5, isEstimated: false },
      status: 'HEALTHY' as const,
      fiveMinuteBurnRate: 0.5,
      oneHourBurnRate: 0.4,
      oneDayBurnRate: 0.3,
    },
    burnRateWindows: [
      { name: '5m', burnRate: 0.5, sli: 0.995 },
      { name: '1h', burnRate: 0.4, sli: 0.996 },
      { name: '1d', burnRate: 0.3, sli: 0.997 },
    ],
  };
}

function buildCompositeSummary() {
  return {
    compositeSummary: {
      sliValue: 0.995,
      errorBudget: { initial: 0.01, consumed: 0.5, remaining: 0.5, isEstimated: false },
      status: 'HEALTHY' as const,
      fiveMinuteBurnRate: 0.5,
      oneHourBurnRate: 0.4,
      oneDayBurnRate: 0.3,
    },
    members: [],
  };
}

describe('computeAndPersistCompositeSummaries', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asInternalUser'];
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let abortController: AbortController;
  let mockComputeSummaries: jest.Mock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClient = savedObjectsClientMock.create();
    logger = loggerMock.create();
    abortController = new AbortController();
    jest.useFakeTimers().setSystemTime(TEST_DATE);
    jest.clearAllMocks();
    addTransactionLabelsMock.mockClear();
    setCustomContextMock.mockClear();
    withSpanMock.mockClear();

    mockComputeSummaries = jest
      .fn()
      .mockResolvedValue([buildSummaryResult(), buildSummaryResult()]);
    MockDefaultSummaryClient.mockImplementation(
      () =>
        ({
          computeSummary: jest.fn(),
          computeSummaries: mockComputeSummaries,
        } as any)
    );
    (DefaultBurnRatesClient as jest.MockedClass<typeof DefaultBurnRatesClient>).mockImplementation(
      () => ({ calculate: jest.fn(), calculateBatch: jest.fn() } as any)
    );
    mockComputeCompositeSummary.mockReturnValue(buildCompositeSummary());

    soClient.find.mockResolvedValue({
      saved_objects: [buildStoredMemberSLO(), buildStoredMemberSLO(MEMBER_ID_2)],
      total: 2,
      per_page: 10,
      page: 1,
    });

    (esClient.bulk as unknown as jest.Mock).mockResolvedValue({ errors: false, items: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function mockPointInTimeFinder(
    pages: Array<Array<SavedObjectsFindResult<StoredCompositeSLODefinition>>>
  ) {
    const closeMock = jest.fn();
    soClient.createPointInTimeFinder.mockReturnValue({
      close: closeMock,
      async *find() {
        for (const page of pages) {
          yield { saved_objects: page };
        }
      },
    } as any);
    return { closeMock };
  }

  describe('empty finder', () => {
    it('does not call bulk when no composite SLOs exist', async () => {
      const { closeMock } = mockPointInTimeFinder([[]]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(closeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('single page processing', () => {
    it('processes a composite SLO and upserts a summary doc', async () => {
      const { closeMock } = mockPointInTimeFinder([[buildStoredCompositeSLO()]]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(mockComputeSummaries).toHaveBeenCalledTimes(1);
      expect(mockComputeCompositeSummary).toHaveBeenCalledTimes(1);
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(closeMock).toHaveBeenCalledTimes(1);
    });

    it('uses the correct doc ID and index', async () => {
      mockPointInTimeFinder([[buildStoredCompositeSLO()]]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(esClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: expect.arrayContaining([
            { index: { _index: COMPOSITE_SUMMARY_INDEX_NAME, _id: `default:${COMPOSITE_ID}` } },
          ]),
        }),
        expect.any(Object)
      );
    });

    it('builds the summary document with correct structure', async () => {
      mockPointInTimeFinder([[buildStoredCompositeSLO()]]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      const bulkCall = (esClient.bulk as unknown as jest.Mock).mock.calls[0][0];
      const doc = bulkCall.operations[1];

      expect(doc).toMatchObject({
        spaceId: 'default',
        summaryUpdatedAt: TEST_DATE.toISOString(),
        compositeSlo: {
          id: COMPOSITE_ID,
          name: 'Test Composite SLO',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        summary: {
          sliValue: 0.995,
          status: 'HEALTHY',
          errorBudget: {
            initial: 0.01,
            consumed: 0.5,
            remaining: 0.5,
            isEstimated: false,
          },
          fiveMinuteBurnRate: 0.5,
          oneHourBurnRate: 0.4,
          oneDayBurnRate: 0.3,
        },
        unresolvedMemberIds: [],
      });
    });

    it('uses the composite spaceId from SO namespaces', async () => {
      mockPointInTimeFinder([
        [
          {
            ...buildStoredCompositeSLO(),
            namespaces: ['my-space'],
          },
        ],
      ]);
      soClient.find.mockResolvedValue({
        saved_objects: [buildStoredMemberSLO(MEMBER_ID, 'my-space')],
        total: 1,
        per_page: 10,
        page: 1,
      });

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(esClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: expect.arrayContaining([
            { index: { _index: COMPOSITE_SUMMARY_INDEX_NAME, _id: `my-space:${COMPOSITE_ID}` } },
          ]),
        }),
        expect.any(Object)
      );
    });

    it('defaults to spaceId "default" when SO namespaces is undefined', async () => {
      const so = buildStoredCompositeSLO();
      delete (so as any).namespaces;
      mockPointInTimeFinder([[so]]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      const bulkCall = (esClient.bulk as unknown as jest.Mock).mock.calls[0][0];
      expect(bulkCall.operations[0].index._id).toBe(`default:${COMPOSITE_ID}`);
    });
  });

  describe('member SLO lookup', () => {
    it('queries member SLOs in the correct space', async () => {
      mockPointInTimeFinder([
        [
          {
            ...buildStoredCompositeSLO(),
            namespaces: ['custom-space'],
          },
        ],
      ]);
      soClient.find.mockResolvedValue({
        saved_objects: [buildStoredMemberSLO(MEMBER_ID, 'custom-space')],
        total: 1,
        per_page: 10,
        page: 1,
      });

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SO_SLO_TYPE,
          namespaces: ['custom-space'],
        })
      );
    });

    it('computes summary with empty active members when all member SLOs are missing', async () => {
      mockPointInTimeFinder([[buildStoredCompositeSLO()]]);
      soClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 10,
        page: 1,
      });

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      // no member SLOs resolved — computeSummaries is not called
      expect(mockComputeSummaries).not.toHaveBeenCalled();
      // computeCompositeSummary is still called with empty member summaries
      expect(mockComputeCompositeSummary).toHaveBeenCalledWith(expect.anything(), []);
    });

    it('sets unresolvedMemberIds and logs a warning when member SLOs are missing', async () => {
      mockPointInTimeFinder([[buildStoredCompositeSLO()]]);
      soClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 10,
        page: 1,
      });

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      const bulkCall = (esClient.bulk as unknown as jest.Mock).mock.calls[0][0];
      const doc = bulkCall.operations[1];
      expect(doc.unresolvedMemberIds).toEqual([MEMBER_ID, MEMBER_ID_2]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(MEMBER_ID));
    });

    it('passes timeWindowOverride from composite to summary client', async () => {
      mockPointInTimeFinder([[buildStoredCompositeSLO()]]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(mockComputeSummaries).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            timeWindowOverride: expect.objectContaining({ type: 'rolling' }),
          }),
        ])
      );
    });
  });

  describe('pagination', () => {
    it('iterates through multiple pages and calls bulk once per page', async () => {
      const page1 = [buildStoredCompositeSLO({ id: 'composite-slo-id-11111111' })];
      const page2 = [buildStoredCompositeSLO({ id: 'composite-slo-id-22222222' })];

      mockPointInTimeFinder([page1, page2]);
      mockComputeSummaries.mockResolvedValue([buildSummaryResult()]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(esClient.bulk).toHaveBeenCalledTimes(2);
    });

    it('creates the point-in-time finder with correct parameters', async () => {
      mockPointInTimeFinder([[]]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: SO_SLO_COMPOSITE_TYPE,
        namespaces: ['*'],
        perPage: 100,
      });
    });
  });

  describe('invalid composite SLO', () => {
    it('skips composite SLOs that fail to decode', async () => {
      const invalidSo = buildStoredCompositeSLO({
        budgetingMethod: 'invalid-method' as any,
      });
      mockPointInTimeFinder([[invalidSo]]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(mockComputeSummaries).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('logs error and continues processing remaining SLOs when one fails', async () => {
      const composite1 = buildStoredCompositeSLO({ id: 'composite-slo-id-11111111' });
      const composite2 = buildStoredCompositeSLO({ id: 'composite-slo-id-22222222' });
      mockPointInTimeFinder([[composite1, composite2]]);

      mockComputeSummaries.mockResolvedValue([buildSummaryResult(), buildSummaryResult()]);
      mockComputeCompositeSummary
        .mockImplementationOnce(() => {
          throw new Error('compute failed');
        })
        .mockReturnValueOnce(buildCompositeSummary());

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      // Second SLO still processed despite first throwing
      expect(mockComputeCompositeSummary).toHaveBeenCalledTimes(2);
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
    });

    it('logs bulk errors without throwing', async () => {
      mockPointInTimeFinder([[buildStoredCompositeSLO()]]);
      (esClient.bulk as unknown as jest.Mock).mockResolvedValue({
        errors: true,
        items: [{ index: { error: { reason: 'document too large' } } }],
      });

      await expect(
        computeAndPersistCompositeSummaries({
          esClient,
          soClient: soClient as any,
          logger,
          abortController,
        })
      ).resolves.not.toThrow();
    });

    it('returns gracefully on RequestAbortedError', async () => {
      mockPointInTimeFinder([[buildStoredCompositeSLO()]]);
      (esClient.bulk as unknown as jest.Mock).mockRejectedValue(
        new errors.RequestAbortedError('aborted')
      );

      await expect(
        computeAndPersistCompositeSummaries({
          esClient,
          soClient: soClient as any,
          logger,
          abortController,
        })
      ).resolves.toBeUndefined();
    });

    it('rethrows non-abort errors', async () => {
      mockPointInTimeFinder([[buildStoredCompositeSLO()]]);
      (esClient.bulk as unknown as jest.Mock).mockRejectedValue(
        new Error('ES cluster unavailable')
      );

      await expect(
        computeAndPersistCompositeSummaries({
          esClient,
          soClient: soClient as any,
          logger,
          abortController,
        })
      ).rejects.toThrow('ES cluster unavailable');
    });

    it('always closes the finder, even on error', async () => {
      const { closeMock } = mockPointInTimeFinder([[buildStoredCompositeSLO()]]);
      (esClient.bulk as unknown as jest.Mock).mockRejectedValue(new Error('fatal'));

      await expect(
        computeAndPersistCompositeSummaries({
          esClient,
          soClient: soClient as any,
          logger,
          abortController,
        })
      ).rejects.toThrow();

      expect(closeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('abort signal', () => {
    it('stops processing when abort signal fires before a page', async () => {
      const page1 = [buildStoredCompositeSLO({ id: 'composite-slo-id-11111111' })];
      const page2 = [buildStoredCompositeSLO({ id: 'composite-slo-id-22222222' })];
      mockPointInTimeFinder([page1, page2]);

      // Abort after first page is yielded
      const closeMock = jest.fn();
      soClient.createPointInTimeFinder.mockReturnValue({
        close: closeMock,
        async *find() {
          yield { saved_objects: page1 };
          abortController.abort();
          yield { saved_objects: page2 };
        },
      } as any);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(closeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('APM instrumentation', () => {
    const spanOpts = { type: 'task' as const, labels: { plugin: 'slo' } };

    it('sets transaction labels and emits pipeline spans on a successful single-page run', async () => {
      mockPointInTimeFinder([[buildStoredCompositeSLO()]]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(addTransactionLabelsMock).toHaveBeenCalledWith({
        plugin: 'slo',
        composite_slo_summary_run_outcome: 'success',
        composite_slo_summary_hit_max_limit: false,
      });
      expect(setCustomContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          composite_slo_summary_processed_composites: 1,
          composite_slo_summary_pages_fetched: 1,
          composite_slo_summary_decode_errors: 0,
          composite_slo_summary_space_errors: 0,
          composite_slo_summary_compute_errors: 0,
          composite_slo_summary_bulk_errors: 0,
          composite_slo_summary_duration_ms: expect.any(Number),
        })
      );

      expect(withSpanMock).toHaveBeenCalledWith(
        {
          name: COMPOSITE_SLO_SUMMARY_TASK_SPAN_NAMES.DECODE_AND_GROUP_COMPOSITES,
          ...spanOpts,
        },
        expect.any(Function)
      );
      expect(withSpanMock).toHaveBeenCalledWith(
        {
          name: COMPOSITE_SLO_SUMMARY_TASK_SPAN_NAMES.FETCH_MEMBER_DEFINITIONS,
          ...spanOpts,
        },
        expect.any(Function)
      );
      expect(withSpanMock).toHaveBeenCalledWith(
        {
          name: COMPOSITE_SLO_SUMMARY_TASK_SPAN_NAMES.COMPUTE_MEMBER_SUMMARIES,
          ...spanOpts,
        },
        expect.any(Function)
      );
      expect(withSpanMock).toHaveBeenCalledWith(
        { name: COMPOSITE_SLO_SUMMARY_TASK_SPAN_NAMES.BULK_WRITE, ...spanOpts },
        expect.any(Function)
      );
    });

    it('records labels when the finder yields only an empty page', async () => {
      mockPointInTimeFinder([[]]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(withSpanMock).not.toHaveBeenCalled();
      expect(addTransactionLabelsMock).toHaveBeenCalledWith({
        plugin: 'slo',
        composite_slo_summary_run_outcome: 'success',
        composite_slo_summary_hit_max_limit: false,
      });
      expect(setCustomContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          composite_slo_summary_processed_composites: 0,
          composite_slo_summary_pages_fetched: 1,
        })
      );
    });

    it('sets aborted outcome when bulk rejects RequestAbortedError', async () => {
      mockPointInTimeFinder([[buildStoredCompositeSLO()]]);
      (esClient.bulk as unknown as jest.Mock).mockRejectedValue(
        new errors.RequestAbortedError('aborted')
      );

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(addTransactionLabelsMock).toHaveBeenCalledWith({
        plugin: 'slo',
        composite_slo_summary_run_outcome: 'aborted',
        composite_slo_summary_hit_max_limit: false,
      });
    });

    it('sets error outcome when bulk rejects a non-abort error', async () => {
      mockPointInTimeFinder([[buildStoredCompositeSLO()]]);
      (esClient.bulk as unknown as jest.Mock).mockRejectedValue(new Error('ES unavailable'));

      await expect(
        computeAndPersistCompositeSummaries({
          esClient,
          soClient: soClient as any,
          logger,
          abortController,
        })
      ).rejects.toThrow('ES unavailable');

      expect(addTransactionLabelsMock).toHaveBeenCalledWith({
        plugin: 'slo',
        composite_slo_summary_run_outcome: 'error',
        composite_slo_summary_hit_max_limit: false,
      });
    });

    it('emits four spans per processed page across multiple pages', async () => {
      mockPointInTimeFinder([
        [buildStoredCompositeSLO({ id: 'composite-slo-id-aaaaaaaa' })],
        [buildStoredCompositeSLO({ id: 'composite-slo-id-bbbbbbbb' })],
      ]);

      await computeAndPersistCompositeSummaries({
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(withSpanMock).toHaveBeenCalledTimes(8);
      expect(addTransactionLabelsMock).toHaveBeenCalledWith({
        plugin: 'slo',
        composite_slo_summary_run_outcome: 'success',
        composite_slo_summary_hit_max_limit: false,
      });
      expect(setCustomContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          composite_slo_summary_processed_composites: 2,
          composite_slo_summary_pages_fetched: 2,
        })
      );
    });
  });
});
