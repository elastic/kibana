/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { EntityAnomalies } from './fetch_anomalies';
import type { AnomalyHit } from './types';
import { enrichAndPersistAnomalies } from './enrich_and_persist';
import { makeAnomaly, makeBaselineBucket } from './test_helpers';

jest.mock('./fetch_baseline_behavior', () => ({
  fetchBaselineBehavior: jest.fn(),
}));

jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  getMlAdDetailsIndexName: jest.fn((ns: string) => `.ml-ad-details-${ns}`),
}));

import { fetchBaselineBehavior } from './fetch_baseline_behavior';
import { getMlAdDetailsIndexName } from './constants';

const mockFetchBaselineBehavior = fetchBaselineBehavior as jest.MockedFunction<
  typeof fetchBaselineBehavior
>;
const mockGetMlAdDetailsIndexName = getMlAdDetailsIndexName as jest.MockedFunction<
  typeof getMlAdDetailsIndexName
>;

const makeEntityAnomalies = (jobId: string, anomalies: AnomalyHit[]): EntityAnomalies => ({
  [jobId]: { anomalies, baselineBehaviors: [] },
});

let logger: ReturnType<typeof loggingSystemMock.createLogger>;
let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
let ml: MlPluginSetup;
const soClient = savedObjectsClientMock.create();
const abortSignal = new AbortController().signal;

beforeEach(() => {
  jest.clearAllMocks();
  logger = loggingSystemMock.createLogger();
  esClient = elasticsearchServiceMock.createElasticsearchClient();
  ml = {} as MlPluginSetup;
  mockFetchBaselineBehavior.mockResolvedValue([]);
  esClient.bulk.mockResolvedValue({ errors: false, items: [], took: 1 });
});

describe('enrichAndPersistAnomalies', () => {
  it('returns early without calling fetchBaselineBehavior or bulk when anomaliesByEntity is empty', async () => {
    await enrichAndPersistAnomalies({
      anomaliesByEntity: new Map(),
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    expect(mockFetchBaselineBehavior).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('returns early without calling bulk when all jobs have empty anomaly arrays', async () => {
    const anomaliesByEntity: Map<string, EntityAnomalies> = new Map([
      ['user:alice', { 'security-job-1': { anomalies: [], baselineBehaviors: [] } }],
    ]);

    await enrichAndPersistAnomalies({
      anomaliesByEntity,
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('calls fetchBaselineBehavior with the correct arguments for each entity and job', async () => {
    const anomaly1 = makeAnomaly({ entityId: 'user:alice', jobId: 'security-job-1' });
    const anomaly2 = makeAnomaly({ entityId: 'user:bob', jobId: 'security-job-2' });

    const anomaliesByEntity: Map<string, EntityAnomalies> = new Map([
      ['user:alice', makeEntityAnomalies('security-job-1', [anomaly1])],
      ['user:bob', makeEntityAnomalies('security-job-2', [anomaly2])],
    ]);

    await enrichAndPersistAnomalies({
      anomaliesByEntity,
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    expect(mockFetchBaselineBehavior).toHaveBeenCalledTimes(2);
    expect(mockFetchBaselineBehavior).toHaveBeenCalledWith({
      anomalies: [anomaly1],
      entityId: 'user:alice',
      abortSignal,
      entityType: 'user',
      esClient,
      jobId: 'security-job-1',
      logger,
      ml,
      soClient,
    });
    expect(mockFetchBaselineBehavior).toHaveBeenCalledWith({
      anomalies: [anomaly2],
      entityId: 'user:bob',
      abortSignal,
      entityType: 'user',
      esClient,
      jobId: 'security-job-2',
      logger,
      ml,
      soClient,
    });
  });

  it('makes exactly one fetchBaselineBehavior call when an entity has multiple anomalies for the same job', async () => {
    const anomaly1 = makeAnomaly({ entityId: 'user:alice', jobId: 'security-job-1' });
    const anomaly2 = makeAnomaly({ entityId: 'user:alice', jobId: 'security-job-1' });

    await enrichAndPersistAnomalies({
      anomaliesByEntity: new Map([
        ['user:alice', makeEntityAnomalies('security-job-1', [anomaly1, anomaly2])],
      ]),
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    expect(mockFetchBaselineBehavior).toHaveBeenCalledTimes(1);
    expect(mockFetchBaselineBehavior).toHaveBeenCalledWith(
      expect.objectContaining({ anomalies: [anomaly1, anomaly2] })
    );
  });

  it('maps the anomaly and entity fields into the indexed document correctly', async () => {
    const anomaly = makeAnomaly({
      entityId: 'user:alice',
      jobId: 'security-job-1',
      detectorIndex: 2,
      timestamp: 1778241600000,
      recordScore: 88,
      actual: 10,
      typical: 2,
      fieldName: 'process.name',
      byFieldName: 'client.geo.name',
      byFieldValue: 'Iran',
    });

    await enrichAndPersistAnomalies({
      anomaliesByEntity: new Map([
        ['user:alice', makeEntityAnomalies('security-job-1', [anomaly])],
      ]),
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    const bulkCall = esClient.bulk.mock.calls[0][0];
    const indexedDoc = (bulkCall.operations as unknown[])[1] as Record<string, unknown>;
    expect(indexedDoc.entity).toEqual({ id: 'user:alice', type: 'user' });
    expect(indexedDoc.anomaly).toEqual({
      _id: 'anomaly-hit-1',
      job_id: 'security-job-1',
      detector_index: 2,
      timestamp: 1778241600000,
      record_score: 88,
      field_name: 'process.name',
      actual: 10,
      typical: 2,
      by_field_name: 'client.geo.name',
      by_field_value: 'Iran',
      over_field_name: undefined,
      over_field_value: undefined,
      partition_field_name: undefined,
      partition_field_value: undefined,
    });
  });

  it('attaches baseline behaviors from fetchBaselineBehavior to each anomaly', async () => {
    const anomaly = makeAnomaly();
    const baselines = [makeBaselineBucket({ value: 'US' }), makeBaselineBucket({ value: 'UK' })];
    mockFetchBaselineBehavior.mockResolvedValueOnce(baselines);

    await enrichAndPersistAnomalies({
      anomaliesByEntity: new Map([
        ['user:alice', makeEntityAnomalies('security-job-1', [anomaly])],
      ]),
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    const bulkCall = esClient.bulk.mock.calls[0][0];
    const indexedDoc = (bulkCall.operations as unknown[])[1] as Record<string, unknown>;
    expect(indexedDoc.baseline).toEqual([
      { value: 'US', doc_count: 100, top_hits: [] },
      { value: 'UK', doc_count: 100, top_hits: [] },
    ]);
  });

  it('uses an empty array for baseline when fetchBaselineBehavior returns null', async () => {
    const anomaly = makeAnomaly();
    mockFetchBaselineBehavior.mockResolvedValueOnce(null);

    await enrichAndPersistAnomalies({
      anomaliesByEntity: new Map([
        ['user:alice', makeEntityAnomalies('security-job-1', [anomaly])],
      ]),
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    const bulkCall = esClient.bulk.mock.calls[0][0];
    const indexedDoc = (bulkCall.operations as unknown[])[1] as Record<string, unknown>;
    expect(indexedDoc.baseline).toEqual([]);
  });

  it('bulk indexes to the correct index for the given namespace', async () => {
    const anomaly = makeAnomaly();
    mockGetMlAdDetailsIndexName.mockReturnValue('.ml-ad-details-my-namespace');

    await enrichAndPersistAnomalies({
      anomaliesByEntity: new Map([
        ['user:alice', makeEntityAnomalies('security-job-1', [anomaly])],
      ]),
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'my-namespace',
      soClient,
    });

    expect(mockGetMlAdDetailsIndexName).toHaveBeenCalledWith('my-namespace');
    const bulkCall = esClient.bulk.mock.calls[0][0];
    const indexOp = (bulkCall.operations as unknown[])[0] as { create: { _index: string } };
    expect(indexOp.create._index).toBe('.ml-ad-details-my-namespace');
  });

  it('bulk indexes each anomaly with a @timestamp field', async () => {
    const anomaly = makeAnomaly();
    const before = Date.now();

    await enrichAndPersistAnomalies({
      anomaliesByEntity: new Map([
        ['user:alice', makeEntityAnomalies('security-job-1', [anomaly])],
      ]),
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    const after = Date.now();
    const bulkCall = esClient.bulk.mock.calls[0][0];
    const indexedDoc = (bulkCall.operations as unknown[])[1] as Record<string, unknown>;
    const ts = new Date(indexedDoc['@timestamp'] as string).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('bulk indexes one operation pair per anomaly across multiple entities and jobs', async () => {
    const anomaly1 = makeAnomaly({ entityId: 'user:alice', jobId: 'security-job-1' });
    const anomaly2 = makeAnomaly({ entityId: 'user:alice', jobId: 'security-job-2' });
    const anomaly3 = makeAnomaly({ entityId: 'user:bob', jobId: 'security-job-1' });

    const anomaliesByEntity: Map<string, EntityAnomalies> = new Map([
      [
        'user:alice',
        {
          'security-job-1': { anomalies: [anomaly1], baselineBehaviors: [] },
          'security-job-2': { anomalies: [anomaly2], baselineBehaviors: [] },
        },
      ],
      ['user:bob', makeEntityAnomalies('security-job-1', [anomaly3])],
    ]);

    await enrichAndPersistAnomalies({
      anomaliesByEntity,
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    const bulkCall = esClient.bulk.mock.calls[0][0];
    // 3 anomalies × 2 (index op + doc) = 6 operations
    expect((bulkCall.operations as unknown[]).length).toBe(6);
  });

  it('calls bulk with refresh: false', async () => {
    const anomaly = makeAnomaly();

    await enrichAndPersistAnomalies({
      anomaliesByEntity: new Map([
        ['user:alice', makeEntityAnomalies('security-job-1', [anomaly])],
      ]),
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    expect(esClient.bulk).toHaveBeenCalledWith(expect.objectContaining({ refresh: false }));
  });

  it('logs a warning when the bulk response contains errors', async () => {
    const anomaly = makeAnomaly();
    const errorItem = { index: { error: { reason: 'mapper_exception' } } };
    esClient.bulk.mockResolvedValueOnce({
      errors: true,
      items: [errorItem as never],
      took: 1,
    });

    await enrichAndPersistAnomalies({
      anomaliesByEntity: new Map([
        ['user:alice', makeEntityAnomalies('security-job-1', [anomaly])],
      ]),
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Bulk-index of enriched anomaly records returned errors')
    );
  });

  it('still indexes all anomalies with empty baseline when one fetchBaselineBehavior call fails', async () => {
    const anomaly1 = makeAnomaly({ entityId: 'user:alice', jobId: 'security-job-1' });
    const anomaly2 = makeAnomaly({ entityId: 'user:bob', jobId: 'security-job-2' });
    const baselines = [makeBaselineBucket({ value: 'US' })];
    const fetchError = new Error('fetch failed');

    mockFetchBaselineBehavior.mockResolvedValueOnce(baselines).mockRejectedValueOnce(fetchError);

    await enrichAndPersistAnomalies({
      anomaliesByEntity: new Map([
        ['user:alice', makeEntityAnomalies('security-job-1', [anomaly1])],
        ['user:bob', makeEntityAnomalies('security-job-2', [anomaly2])],
      ]),
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('fetch failed'));

    const bulkCall = esClient.bulk.mock.calls[0][0];
    // both anomalies still indexed
    expect((bulkCall.operations as unknown[]).length).toBe(4);

    const aliceDoc = (bulkCall.operations as unknown[])[1] as Record<string, unknown>;
    const bobDoc = (bulkCall.operations as unknown[])[3] as Record<string, unknown>;
    expect(aliceDoc.baseline).toEqual([{ value: 'US', doc_count: 100, top_hits: [] }]);
    expect(bobDoc.baseline).toEqual([]);
  });

  it('does not log a warning when the bulk response has no errors', async () => {
    const anomaly = makeAnomaly();

    await enrichAndPersistAnomalies({
      anomaliesByEntity: new Map([
        ['user:alice', makeEntityAnomalies('security-job-1', [anomaly])],
      ]),
      abortSignal,
      entityType: 'user',
      esClient,
      logger,
      ml,
      namespace: 'default',
      soClient,
    });

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
