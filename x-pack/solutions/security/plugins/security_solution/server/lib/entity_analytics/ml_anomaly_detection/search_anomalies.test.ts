/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { buildScoreRangeFilter, searchEntityAnomalies } from './search_anomalies';
import { makeHit, makeResponse } from './test_helpers';

jest.mock('./get_security_ml_job_ids', () => ({
  getSecurityMlJobIds: jest.fn().mockResolvedValue(['security-job-1', 'security-job-2']),
}));

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: {
    dsl: {
      getEuidFilterBasedOnEntityRecord: jest
        .fn()
        .mockReturnValue({ term: { 'user.name': 'alice' } }),
    },
  },
  getBuiltInEntityDefinition: jest.requireActual('@kbn/entity-store/common/euid_helpers')
    .getBuiltInEntityDefinition,
}));

const mockEntityFilter = { term: { 'user.name': 'alice' } };
const namedEntityFilter = { bool: { filter: [mockEntityFilter], _name: 'user:alice' } };

let mockMlAnomalySearch: jest.Mock;
let mockMl: MlPluginSetup;
let logger: ReturnType<typeof loggingSystemMock.createLogger>;
const soClient = savedObjectsClientMock.create();
const request = httpServerMock.createKibanaRequest();

const mockEntityRecord = { entity: { id: 'user:alice' }, user: { name: 'alice' } };

const defaultOpts = {
  entityType: 'user' as const,
  entityIds: ['user:alice'],
  entityRecords: [mockEntityRecord],
  request,
};

beforeEach(() => {
  jest.clearAllMocks();
  logger = loggingSystemMock.createLogger();
  mockMlAnomalySearch = jest.fn().mockResolvedValue(makeResponse([]));
  mockMl = {
    mlSystemProvider: jest.fn().mockReturnValue({ mlAnomalySearch: mockMlAnomalySearch }),
    modulesProvider: jest.fn().mockReturnValue({ listModules: jest.fn().mockResolvedValue([]) }),
  } as unknown as MlPluginSetup;
});

describe('searchEntityAnomalies', () => {
  it('returns empty result without querying ML when no security job IDs are known', async () => {
    const { getSecurityMlJobIds } = jest.requireMock('./get_security_ml_job_ids');
    getSecurityMlJobIds.mockResolvedValueOnce([]);

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    expect(result.hits).toEqual([]);
    expect(result.total).toBe(0);
    expect(mockMlAnomalySearch).not.toHaveBeenCalled();
  });

  it('returns empty result when filterJobIds has no overlap with security job IDs', async () => {
    const result = await searchEntityAnomalies({
      ...defaultOpts,
      jobIds: ['non-security-job'],
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result.hits).toEqual([]);
    expect(result.total).toBe(0);
    expect(mockMlAnomalySearch).not.toHaveBeenCalled();
  });

  it('sends the correct base query to mlAnomalySearch', async () => {
    const { euid, getBuiltInEntityDefinition } = jest.requireMock(
      '@kbn/entity-store/common/euid_helpers'
    );

    await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    expect(euid.dsl.getEuidFilterBasedOnEntityRecord).toHaveBeenCalledWith(
      getBuiltInEntityDefinition('user'),
      mockEntityRecord
    );
    expect(mockMlAnomalySearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: expect.arrayContaining([
              { term: { result_type: 'record' } },
              { term: { is_interim: false } },
              { range: { record_score: { gte: 1 } } },
              { range: { timestamp: { gte: 'now-30d' } } },
              mockEntityFilter,
              { terms: { job_id: ['security-job-1', 'security-job-2'] } },
            ]),
          },
        },
      }),
      []
    );
    expect(mockMlAnomalySearch.mock.calls[0][0].query.bool.should).toBeUndefined();
    expect(mockMlAnomalySearch).not.toHaveBeenCalledWith(
      expect.objectContaining({ runtime_mappings: expect.anything() }),
      expect.anything()
    );
  });

  it('attributes hits to the single entity when the query is unnamed', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(
      makeResponse([makeHit({ id: 'hit-1', matchedQueries: undefined })])
    );

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    expect(result.hits.map(({ entityId }) => entityId)).toEqual(['user:alice']);
  });

  it('ORs the named identity filters of every entity record in a resolution group', async () => {
    const { euid } = jest.requireMock('@kbn/entity-store/common/euid_helpers');
    const aliasFilter = { term: { 'user.name': 'alice.alias' } };
    const aliasRecord = { entity: { id: 'user:alice-alias' }, user: { name: 'alice.alias' } };
    euid.dsl.getEuidFilterBasedOnEntityRecord
      .mockReturnValueOnce(mockEntityFilter)
      .mockReturnValueOnce(aliasFilter);

    const result = await searchEntityAnomalies({
      ...defaultOpts,
      entityIds: ['user:alice', 'user:alice-alias'],
      entityRecords: [mockEntityRecord, aliasRecord],
      logger,
      ml: mockMl,
      soClient,
    });

    expect(mockMlAnomalySearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: expect.arrayContaining([
              {
                bool: {
                  should: [
                    namedEntityFilter,
                    { bool: { filter: [aliasFilter], _name: 'user:alice-alias' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ]),
          },
        },
      }),
      []
    );
    expect(result.hits).toEqual([]);
  });

  it('attributes each hit to the entity record whose named filter it matched', async () => {
    const { euid } = jest.requireMock('@kbn/entity-store/common/euid_helpers');
    const aliasRecord = { entity: { id: 'user:alice-alias' }, user: { name: 'alice.alias' } };
    euid.dsl.getEuidFilterBasedOnEntityRecord
      .mockReturnValueOnce(mockEntityFilter)
      .mockReturnValueOnce({ term: { 'user.name': 'alice.alias' } });
    mockMlAnomalySearch.mockResolvedValueOnce(
      makeResponse([
        makeHit({ id: 'target-hit', matchedQueries: ['user:alice'] }),
        makeHit({ id: 'alias-hit', matchedQueries: ['user:alice-alias'] }),
        makeHit({ id: 'both-hit', matchedQueries: ['user:alice-alias', 'user:alice'] }),
        makeHit({ id: 'unmatched-hit', matchedQueries: [] }),
      ])
    );

    const result = await searchEntityAnomalies({
      ...defaultOpts,
      entityIds: ['user:alice', 'user:alice-alias'],
      entityRecords: [mockEntityRecord, aliasRecord],
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result.hits.map(({ _id: id, entityId }) => [id, entityId])).toEqual([
      ['target-hit', 'user:alice'],
      ['alias-hit', 'user:alice-alias'],
      ['both-hit', 'user:alice'],
      ['unmatched-hit', 'user:alice'],
    ]);
  });

  it('uses now-DEFAULT_ML_AD_LOOKBACK as the timestamp lower bound when fromMs is not provided', async () => {
    await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    const [body] = mockMlAnomalySearch.mock.calls[0];
    const tsFilter = body.query.bool.filter.find(
      (f: unknown) =>
        typeof f === 'object' &&
        f !== null &&
        'range' in (f as object) &&
        'timestamp' in (f as { range: object }).range
    );
    expect(tsFilter).toEqual({ range: { timestamp: { gte: 'now-30d' } } });
  });

  it('uses fromMs as the timestamp lower bound when provided', async () => {
    await searchEntityAnomalies({
      ...defaultOpts,
      fromMs: 1_700_000_000_000,
      logger,
      ml: mockMl,
      soClient,
    });

    const [body] = mockMlAnomalySearch.mock.calls[0];
    const tsFilter = body.query.bool.filter.find(
      (f: unknown) =>
        typeof f === 'object' &&
        f !== null &&
        'range' in (f as object) &&
        'timestamp' in (f as { range: object }).range
    );
    expect(tsFilter).toEqual({ range: { timestamp: { gte: 1_700_000_000_000 } } });
  });

  it('omits the lte bound from the timestamp filter when toMs is not provided', async () => {
    await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    const [body] = mockMlAnomalySearch.mock.calls[0];
    const tsFilter = body.query.bool.filter.find(
      (f: unknown) =>
        typeof f === 'object' &&
        f !== null &&
        'range' in (f as object) &&
        'timestamp' in (f as { range: object }).range
    );
    expect(tsFilter.range.timestamp).not.toHaveProperty('lte');
  });

  it('uses toMs as the timestamp upper bound when provided', async () => {
    await searchEntityAnomalies({
      ...defaultOpts,
      fromMs: 1_700_000_000_000,
      toMs: 1_700_100_000_000,
      logger,
      ml: mockMl,
      soClient,
    });

    const [body] = mockMlAnomalySearch.mock.calls[0];
    const tsFilter = body.query.bool.filter.find(
      (f: unknown) =>
        typeof f === 'object' &&
        f !== null &&
        'range' in (f as object) &&
        'timestamp' in (f as { range: object }).range
    );
    expect(tsFilter).toEqual({
      range: { timestamp: { gte: 1_700_000_000_000, lte: 1_700_100_000_000 } },
    });
  });

  it('intersects filterJobIds with security job IDs', async () => {
    await searchEntityAnomalies({
      ...defaultOpts,
      jobIds: ['security-job-1', 'unrelated-job'],
      logger,
      ml: mockMl,
      soClient,
    });

    const [body] = mockMlAnomalySearch.mock.calls[0];
    const jobFilter = body.query.bool.filter.find(
      (f: unknown) => typeof f === 'object' && f !== null && 'terms' in (f as object)
    );
    // 'unrelated-job' is not in the security job IDs list, so only 'security-job-1' survives.
    expect(jobFilter).toEqual({ terms: { job_id: ['security-job-1'] } });
  });

  it('uses all security job IDs in the filter when filterJobIds is omitted', async () => {
    await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    const [body] = mockMlAnomalySearch.mock.calls[0];
    const jobFilter = body.query.bool.filter.find(
      (f: unknown) => typeof f === 'object' && f !== null && 'terms' in (f as object)
    );
    expect(jobFilter).toEqual({ terms: { job_id: ['security-job-1', 'security-job-2'] } });
  });

  it('uses default sort (timestamp desc) when sort is not provided', async () => {
    await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    const [body] = mockMlAnomalySearch.mock.calls[0];
    expect(body.sort).toEqual([{ timestamp: { order: 'desc' } }]);
  });

  it('maps sort field names to the corresponding ML record field names', async () => {
    await searchEntityAnomalies({
      ...defaultOpts,
      sort: [
        { field: 'timestamp', order: 'asc' },
        { field: 'record_score', order: 'desc' },
        { field: 'job_id', order: 'asc' },
      ],
      logger,
      ml: mockMl,
      soClient,
    });

    const [body] = mockMlAnomalySearch.mock.calls[0];
    expect(body.sort).toEqual([
      { timestamp: { order: 'asc' } },
      { record_score: { order: 'desc' } },
      { job_id: { order: 'asc' } },
    ]);
  });

  it('passes from and size to mlAnomalySearch', async () => {
    await searchEntityAnomalies({
      ...defaultOpts,
      from: 20,
      size: 10,
      logger,
      ml: mockMl,
      soClient,
    });

    const [body] = mockMlAnomalySearch.mock.calls[0];
    expect(body.from).toBe(20);
    expect(body.size).toBe(10);
  });

  it('uses from=0 and size=100 as defaults', async () => {
    await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    const [body] = mockMlAnomalySearch.mock.calls[0];
    expect(body.from).toBe(0);
    expect(body.size).toBe(100);
  });

  it('maps a full hit to an AnomalyHit correctly', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(
      makeResponse([
        makeHit({
          id: 'hit-abc',
          entityId: 'user:alice',
          jobId: 'security-job-1',
          detectorIndex: 2,
          detectorFunction: 'rare',
          timestamp: 1_700_000_000_000,
          recordScore: 88,
          actual: [10],
          typical: [2],
          byFieldName: 'source.ip',
          byFieldValue: 'evil-ip',
        }),
      ])
    );

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    expect(result.hits).toEqual([
      {
        _id: 'hit-abc',
        entityId: 'user:alice',
        jobId: 'security-job-1',
        detectorIndex: 2,
        detectorFunction: 'rare',
        timestamp: 1_700_000_000_000,
        recordScore: 88,
        actual: 10,
        typical: 2,
        fieldName: undefined,
        byFieldName: 'source.ip',
        byFieldValue: 'evil-ip',
        overFieldName: undefined,
        overFieldValue: undefined,
        partitionFieldName: 'host.name',
        partitionFieldValue: 'web-01',
      },
    ]);
  });

  it('returns multiple hits in the order returned by ES', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(
      makeResponse([
        makeHit({ id: 'h1', entityId: 'user:alice', jobId: 'security-job-1', recordScore: 90 }),
        makeHit({ id: 'h2', entityId: 'user:alice', jobId: 'security-job-2', recordScore: 50 }),
      ])
    );

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    expect(result.hits).toHaveLength(2);
    expect(result.hits[0]._id).toBe('h1');
    expect(result.hits[1]._id).toBe('h2');
  });

  it('keeps hits where actual or typical is missing so the page matches the total', async () => {
    const hit = makeHit({ id: 'no-values', entityId: 'user:alice' });
    delete (hit._source as Record<string, unknown>).actual;
    delete (hit._source as Record<string, unknown>).typical;
    mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([hit], 1));

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    expect(result.total).toBe(1);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]._id).toBe('no-values');
    expect(result.hits[0]).not.toHaveProperty('actual');
    expect(result.hits[0]).not.toHaveProperty('typical');
  });

  it("completes population-analysis records from the entity's cause (values and dimensions)", async () => {
    // by+over analysis: the parent carries by_field_name but no by_field_value / actual / typical;
    // each cause does. The cause for the requested entity (user.name = alice) is not the first.
    const hit = makeHit({
      id: 'population',
      entityId: 'user:alice',
      byFieldName: 'user.name',
      noByFieldValue: true,
      causes: [
        { by_field_value: 'mallory', actual: [99], typical: [1] },
        { by_field_value: 'alice', actual: [42], typical: [3] },
      ],
    });
    delete (hit._source as Record<string, unknown>).actual;
    delete (hit._source as Record<string, unknown>).typical;
    mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([hit]));

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    expect(result.hits[0]).toMatchObject({
      _id: 'population',
      actual: 42,
      typical: 3,
      byFieldName: 'user.name',
      byFieldValue: 'alice',
    });
  });

  it("does not pick another user's cause because it shares the entity's host partition", async () => {
    const winPartition = { partition_field_name: 'host.name', partition_field_value: 'WIN-1' };
    // mockEntityRecord: user.name=alice. Both causes are partitioned on WIN-1 (makeHit default
    // partition_field_value = 'web-01' is overridden per cause); only the second is Alice's.
    const hit = makeHit({
      entityId: 'user:alice',
      byFieldName: 'user.name',
      noByFieldValue: true,
      causes: [
        { by_field_value: 'mallory', actual: [99], typical: [1], ...winPartition },
        { by_field_value: 'alice', actual: [42], typical: [3], ...winPartition },
      ],
    });
    delete (hit._source as Record<string, unknown>).actual;
    delete (hit._source as Record<string, unknown>).typical;
    mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([hit]));

    const result = await searchEntityAnomalies({
      ...defaultOpts,
      entityRecords: [{ ...mockEntityRecord, host: { name: 'WIN-1' } }],
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result.hits[0]).toMatchObject({ actual: 42, typical: 3, byFieldValue: 'alice' });
  });

  it('falls back to the first cause when none matches the entity', async () => {
    const hit = makeHit({
      entityId: 'user:alice',
      byFieldName: 'user.name',
      noByFieldValue: true,
      causes: [
        { by_field_value: 'mallory', actual: [99], typical: [1] },
        { by_field_value: 'trent', actual: [7], typical: [2] },
      ],
    });
    delete (hit._source as Record<string, unknown>).actual;
    delete (hit._source as Record<string, unknown>).typical;
    mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([hit]));

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    expect(result.hits[0]).toMatchObject({ actual: 99, typical: 1, byFieldValue: 'mallory' });
  });

  it('prefers top-level actual/typical over causes when both are present', async () => {
    const hit = makeHit({
      entityId: 'user:alice',
      actual: [10],
      typical: [2],
      causes: [{ actual: [99], typical: [98] }],
    });
    mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([hit]));

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    expect(result.hits[0]).toMatchObject({ actual: 10, typical: 2 });
  });

  it('excludes records without detector_index in the query rather than post-filtering', async () => {
    await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    const [body] = mockMlAnomalySearch.mock.calls[0];
    expect(body.query.bool.filter).toEqual(
      expect.arrayContaining([{ exists: { field: 'detector_index' } }])
    );
  });

  it('returns empty result and logs a warning when entity filter cannot be built', async () => {
    const { euid } = jest.requireMock('@kbn/entity-store/common/euid_helpers');
    euid.dsl.getEuidFilterBasedOnEntityRecord.mockReturnValueOnce(undefined);

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    expect(result.hits).toEqual([]);
    expect(result.total).toBe(0);
    expect(mockMlAnomalySearch).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Cannot build entity filter'));
  });

  it('skips hits where _source is missing', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([makeHit({ noSource: true })]));

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });
    expect(result.hits).toEqual([]);
  });

  it('returns empty result and logs a warning when mlAnomalySearch throws', async () => {
    mockMlAnomalySearch.mockRejectedValueOnce(new Error('ES cluster unavailable'));

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });

    expect(result.hits).toEqual([]);
    expect(result.total).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ES cluster unavailable'));
  });

  it('returns empty result when there are no matching hits', async () => {
    mockMlAnomalySearch.mockResolvedValueOnce(makeResponse([]));

    const result = await searchEntityAnomalies({ ...defaultOpts, logger, ml: mockMl, soClient });
    expect(result.hits).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('buildScoreRangeFilter', () => {
  it('defaults to gte 1 when no ranges are given', () => {
    expect(buildScoreRangeFilter(undefined)).toEqual({ range: { record_score: { gte: 1 } } });
    expect(buildScoreRangeFilter([])).toEqual({ range: { record_score: { gte: 1 } } });
  });

  it('builds a should clause with one range per selected bucket', () => {
    expect(buildScoreRangeFilter([{ min_score: 25, max_score: 50 }, { min_score: 100 }])).toEqual({
      bool: {
        should: [
          { range: { record_score: { gte: 25, lt: 50 } } },
          { range: { record_score: { gte: 100 } } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  // Record scores below 1 are noise, so even a bucket like Low [0,3) must not lower the
  // gte below the standard threshold of 1.
  it('clamps a range min_score below 1 up to 1', () => {
    expect(buildScoreRangeFilter([{ min_score: 0, max_score: 3 }])).toEqual({
      bool: {
        should: [{ range: { record_score: { gte: 1, lt: 3 } } }],
        minimum_should_match: 1,
      },
    });
  });
});
