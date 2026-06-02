/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { fetchAnomaliesForEntityBatch, streamAnomaliesForEntityBatch } from './fetch_anomalies';
import { makeHit, makeResponse } from './test_helpers';
import type { AnomalyHit } from './types';

const collectPages = async (gen: AsyncGenerator<AnomalyHit[]>): Promise<AnomalyHit[]> => {
  const results: AnomalyHit[] = [];
  for await (const page of gen) {
    results.push(...page);
  }
  return results;
};

// Use small constants so pagination / loop-guard tests don't require thousands of hits.
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  ANOMALY_SEARCH_PAGE_SIZE: 2,
  MAX_ALLOWED_ITERS: 3,
  DEFAULT_ANOMALY_THRESHOLD: 50,
  ML_AD_LOOKBACK: '1h',
}));

jest.mock('./get_security_ml_job_ids', () => ({
  getSecurityMlJobIds: jest.fn().mockResolvedValue(['security-job-1', 'security-job-2']),
}));

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: {
    painless: {
      getEuidRuntimeMapping: jest.fn().mockReturnValue({
        lang: 'painless',
        source: 'mock-euid-script',
      }),
    },
  },
}));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let mockMlAnomalySearch: jest.Mock;
let mockMl: MlPluginSetup;
let logger: ReturnType<typeof loggingSystemMock.createLogger>;
const soClient = savedObjectsClientMock.create();

beforeEach(() => {
  jest.clearAllMocks();
  logger = loggingSystemMock.createLogger();
  mockMlAnomalySearch = jest.fn().mockResolvedValue(makeResponse([]));
  mockMl = {
    mlSystemProvider: jest.fn().mockReturnValue({ mlAnomalySearch: mockMlAnomalySearch }),
  } as unknown as MlPluginSetup;
});

describe('streamAnomaliesForEntityBatch', () => {
  it('returns empty array without querying ML when entityIds is empty', async () => {
    const result = await collectPages(
      streamAnomaliesForEntityBatch({
        entityType: 'user',
        entityIds: [],
        logger,
        ml: mockMl,
        soClient,
      })
    );

    expect(result).toEqual([]);
    expect(mockMlAnomalySearch).not.toHaveBeenCalled();
  });

  it('sends the correct query filters to mlAnomalySearch', async () => {
    const { euid } = jest.requireMock('@kbn/entity-store/common/euid_helpers');

    await collectPages(
      streamAnomaliesForEntityBatch({
        entityType: 'user',
        entityIds: ['user:alice', 'user:bob'],
        logger,
        ml: mockMl,
        soClient,
      })
    );

    expect(euid.painless.getEuidRuntimeMapping).toHaveBeenCalledWith('user');
    expect(mockMlAnomalySearch).toHaveBeenCalledWith(
      {
        fields: ['entity_id'],
        query: {
          bool: {
            filter: [
              { term: { result_type: 'record' } },
              { terms: { entity_id: ['user:alice', 'user:bob'] } },
              { term: { is_interim: false } },
              { range: { record_score: { gte: 1 } } },
              { range: { timestamp: { gte: 'now-1h' } } },
            ],
          },
        },
        runtime_mappings: {
          entity_id: { lang: 'painless', source: 'mock-euid-script' },
        },
        size: 2,
        sort: [{ timestamp: 'asc' }, { job_id: 'asc' }, { detector_index: 'asc' }],
      },
      []
    );
  });

  it('maps a full hit to an AnomalyHit correctly', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(
      makeResponse([
        makeHit({
          entityId: 'user:alice',
          jobId: 'security-job-1',
          detectorIndex: 2,
          detectorFunction: 'rare',
          timestamp: 1778241600000,
          recordScore: 88,
          actual: [10],
          typical: [2],
        }),
      ])
    );

    const result = await collectPages(
      streamAnomaliesForEntityBatch({
        entityType: 'user',
        entityIds: ['user:alice'],
        logger,
        ml: mockMl,
        soClient,
      })
    );

    expect(result).toEqual([
      {
        _id: 'hit-1',
        entityId: 'user:alice',
        jobId: 'security-job-1',
        detectorIndex: 2,
        detectorFunction: 'rare',
        timestamp: 1778241600000,
        recordScore: 88,
        actual: 10,
        typical: 2,
        fieldName: undefined,
        byFieldName: 'client.geo.name',
        byFieldValue: 'Iran',
        overFieldName: undefined,
        overFieldValue: undefined,
        partitionFieldName: 'host.name',
        partitionFieldValue: 'web-01',
      },
    ]);
  });

  it('skips hits where actual, typical or detector_index is missing', async () => {
    for (const field of ['actual', 'typical', 'detector_index'] as const) {
      jest.clearAllMocks();
      mockMlAnomalySearch = jest.fn().mockResolvedValue(makeResponse([]));
      mockMl = {
        mlSystemProvider: jest.fn().mockReturnValue({ mlAnomalySearch: mockMlAnomalySearch }),
      } as unknown as MlPluginSetup;

      const hit = makeHit({ entityId: 'host:web-01' });
      delete (hit._source as Record<string, unknown>)[field];
      mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([hit]));

      const result = await collectPages(
        streamAnomaliesForEntityBatch({
          entityType: 'host',
          entityIds: ['host:web-01'],
          logger,
          ml: mockMl,
          soClient,
        })
      );

      expect(result).toEqual([]);
    }
  });

  it('skips hits where entity_id field is missing', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([makeHit({ noEntityId: true })]));

    const result = await collectPages(
      streamAnomaliesForEntityBatch({
        entityType: 'user',
        entityIds: ['user:alice'],
        logger,
        ml: mockMl,
        soClient,
      })
    );

    expect(result).toEqual([]);
  });

  it('skips hits where _source is missing', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([makeHit({ noSource: true })]));

    const result = await collectPages(
      streamAnomaliesForEntityBatch({
        entityType: 'user',
        entityIds: ['user:alice'],
        logger,
        ml: mockMl,
        soClient,
      })
    );

    expect(result).toEqual([]);
  });

  it('skips hits whose job_id is not in the security job ids list', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(
      makeResponse([makeHit({ jobId: 'non-security-job' })])
    );

    const result = await collectPages(
      streamAnomaliesForEntityBatch({
        entityType: 'user',
        entityIds: ['user:alice'],
        logger,
        ml: mockMl,
        soClient,
      })
    );

    expect(result).toEqual([]);
  });

  it('returns empty array when there are no matching hits', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([]));

    const result = await collectPages(
      streamAnomaliesForEntityBatch({
        entityType: 'user',
        entityIds: ['user:alice'],
        logger,
        ml: mockMl,
        soClient,
      })
    );

    expect(result).toEqual([]);
  });

  it('accumulates hits from multiple pages', async () => {
    const page1 = [
      makeHit({ entityId: 'user:alice', timestamp: 1000, sort: [1000, 'security-job-1', 0] }),
      makeHit({ entityId: 'user:bob', timestamp: 2000, sort: [2000, 'security-job-1', 0] }),
    ];
    const page2 = [
      makeHit({ entityId: 'user:carol', timestamp: 3000, sort: [3000, 'security-job-1', 0] }),
    ];

    mockMlAnomalySearch
      .mockResolvedValueOnce(makeResponse(page1))
      .mockResolvedValueOnce(makeResponse(page2));

    const result = await collectPages(
      streamAnomaliesForEntityBatch({
        entityType: 'user',
        entityIds: ['user:alice', 'user:bob', 'user:carol'],
        logger,
        ml: mockMl,
        soClient,
      })
    );

    expect(mockMlAnomalySearch).toHaveBeenCalledTimes(2);

    const [firstBody] = mockMlAnomalySearch.mock.calls[0];
    expect(firstBody).not.toHaveProperty('search_after');
    const [secondBody] = mockMlAnomalySearch.mock.calls[1];
    expect(secondBody.search_after).toEqual([2000, 'security-job-1', 0]);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.entityId)).toEqual(['user:alice', 'user:bob', 'user:carol']);
  });

  it('stops paginating after MAX_ALLOWED_ITERS pages regardless of page size', async () => {
    // MAX_ALLOWED_ITERS is mocked to 3; the guard is `iters++ > MAX_ALLOWED_ITERS`,
    // so iterations 0–3 each query ES (4 total) before iteration 4 triggers the break.
    const fullPage = [
      makeHit({ entityId: 'user:alice', sort: [1000, 'job', 0] }),
      makeHit({ entityId: 'user:bob', sort: [2000, 'job', 0] }),
    ];
    mockMlAnomalySearch.mockResolvedValue(makeResponse(fullPage));

    const result = await collectPages(
      streamAnomaliesForEntityBatch({
        entityType: 'user',
        entityIds: ['user:alice', 'user:bob'],
        logger,
        ml: mockMl,
        soClient,
      })
    );

    // (MAX_ALLOWED_ITERS + 1) iterations × PAGE_SIZE hits = 4 × 2 = 8 hits collected before breaking
    expect(mockMlAnomalySearch).toHaveBeenCalledTimes(4);
    expect(result).toHaveLength(8);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('max iterations reached'));
  });

  it('logs a warning and stops iterating when mlAnomalySearch throws', async () => {
    mockMlAnomalySearch.mockRejectedValueOnce(new Error('ES cluster unavailable'));

    const result = await collectPages(
      streamAnomaliesForEntityBatch({
        entityType: 'host',
        entityIds: ['host:web-01'],
        logger,
        ml: mockMl,
        soClient,
      })
    );

    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      `Error encountered searching for anomalies for entity type "host": ES cluster unavailable`
    );
  });
});

describe('fetchAnomaliesForEntityBatch', () => {
  it('returns an empty map when entityIds is empty', async () => {
    const result = await fetchAnomaliesForEntityBatch({
      entityType: 'user',
      entityIds: [],
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result.size).toBe(0);
    expect(mockMlAnomalySearch).not.toHaveBeenCalled();
  });

  it('returns an empty map when there are no matching anomalies', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([]));

    const result = await fetchAnomaliesForEntityBatch({
      entityType: 'user',
      entityIds: ['user:alice'],
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result.size).toBe(0);
  });

  it('groups anomalies by entityId and jobId', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(
      makeResponse([
        makeHit({ id: '1', entityId: 'user:alice', jobId: 'security-job-1', recordScore: 80 }),
        makeHit({ id: '2', entityId: 'user:alice', jobId: 'security-job-2', recordScore: 70 }),
      ])
    );

    const result = await fetchAnomaliesForEntityBatch({
      entityType: 'user',
      entityIds: ['user:alice'],
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result.size).toBe(1);
    const aliceAnomalies = result.get('user:alice');
    expect(Object.keys(aliceAnomalies ?? {})).toEqual(['security-job-1', 'security-job-2']);
    expect(aliceAnomalies?.['security-job-1']).toHaveLength(1);
    expect(aliceAnomalies?.['security-job-1'][0]).toEqual({
      _id: '1',
      entityId: 'user:alice',
      jobId: 'security-job-1',
      detectorIndex: 0,
      detectorFunction: 'rare',
      timestamp: 1778241600000,
      recordScore: 80,
      actual: 5,
      typical: 1,
      fieldName: undefined,
      byFieldName: 'client.geo.name',
      byFieldValue: 'Iran',
      overFieldName: undefined,
      overFieldValue: undefined,
      partitionFieldName: 'host.name',
      partitionFieldValue: 'web-01',
    });
    expect(aliceAnomalies?.['security-job-2']).toHaveLength(1);
    expect(aliceAnomalies?.['security-job-2'][0]).toEqual({
      _id: '2',
      entityId: 'user:alice',
      jobId: 'security-job-2',
      detectorIndex: 0,
      detectorFunction: 'rare',
      timestamp: 1778241600000,
      recordScore: 70,
      actual: 5,
      typical: 1,
      fieldName: undefined,
      byFieldName: 'client.geo.name',
      byFieldValue: 'Iran',
      overFieldName: undefined,
      overFieldValue: undefined,
      partitionFieldName: 'host.name',
      partitionFieldValue: 'web-01',
    });
  });

  it('collects multiple anomaly records under the same entityId and jobId', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(
      makeResponse([
        makeHit({
          id: '1',
          entityId: 'user:alice',
          jobId: 'security-job-1',
          timestamp: 1000,
          recordScore: 60,
        }),
        makeHit({
          id: '2',
          entityId: 'user:alice',
          jobId: 'security-job-1',
          timestamp: 2000,
          recordScore: 90,
        }),
      ])
    );

    const result = await fetchAnomaliesForEntityBatch({
      entityType: 'user',
      entityIds: ['user:alice'],
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result.get('user:alice')?.['security-job-1']).toHaveLength(2);
    expect(result.get('user:alice')?.['security-job-1']).toEqual([
      {
        _id: '1',
        entityId: 'user:alice',
        jobId: 'security-job-1',
        detectorIndex: 0,
        detectorFunction: 'rare',
        timestamp: 1000,
        recordScore: 60,
        actual: 5,
        typical: 1,
        fieldName: undefined,
        byFieldName: 'client.geo.name',
        byFieldValue: 'Iran',
        overFieldName: undefined,
        overFieldValue: undefined,
        partitionFieldName: 'host.name',
        partitionFieldValue: 'web-01',
      },
      {
        _id: '2',
        entityId: 'user:alice',
        jobId: 'security-job-1',
        detectorIndex: 0,
        detectorFunction: 'rare',
        timestamp: 2000,
        recordScore: 90,
        actual: 5,
        typical: 1,
        fieldName: undefined,
        byFieldName: 'client.geo.name',
        byFieldValue: 'Iran',
        overFieldName: undefined,
        overFieldValue: undefined,
        partitionFieldName: 'host.name',
        partitionFieldValue: 'web-01',
      },
    ]);
  });

  it('accumulates anomalies for multiple entities across pages', async () => {
    const page1 = [
      makeHit({
        entityId: 'user:alice',
        jobId: 'security-job-1',
        sort: [1000, 'security-job-1', 0],
      }),
      makeHit({ entityId: 'user:bob', jobId: 'security-job-1', sort: [2000, 'security-job-1', 0] }),
    ];
    const page2 = [makeHit({ entityId: 'user:alice', jobId: 'security-job-2' })];

    mockMlAnomalySearch
      .mockResolvedValueOnce(makeResponse(page1))
      .mockResolvedValueOnce(makeResponse(page2));

    const result = await fetchAnomaliesForEntityBatch({
      entityType: 'user',
      entityIds: ['user:alice', 'user:bob'],
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result.size).toBe(2);
    expect(Object.keys(result.get('user:alice') ?? {})).toEqual(
      expect.arrayContaining(['security-job-1', 'security-job-2'])
    );
    expect(result.get('user:bob')?.['security-job-1']).toHaveLength(1);
  });

  it('merges anomalies for the same entity and job across pages', async () => {
    const page1 = [
      makeHit({
        entityId: 'user:alice',
        jobId: 'security-job-1',
        timestamp: 1000,
        recordScore: 60,
        sort: [1000, 'security-job-1', 0],
      }),
      makeHit({
        entityId: 'user:alice',
        jobId: 'security-job-1',
        timestamp: 2000,
        recordScore: 70,
        sort: [2000, 'security-job-1', 0],
      }),
    ];
    const page2 = [
      makeHit({
        entityId: 'user:alice',
        jobId: 'security-job-1',
        timestamp: 3000,
        recordScore: 80,
      }),
    ];

    mockMlAnomalySearch
      .mockResolvedValueOnce(makeResponse(page1))
      .mockResolvedValueOnce(makeResponse(page2));

    const result = await fetchAnomaliesForEntityBatch({
      entityType: 'user',
      entityIds: ['user:alice'],
      logger,
      ml: mockMl,
      soClient,
    });

    const anomalies = result.get('user:alice')?.['security-job-1'];
    expect(anomalies).toHaveLength(3);
    expect(anomalies?.map((a) => a.recordScore)).toEqual([60, 70, 80]);
  });
});
