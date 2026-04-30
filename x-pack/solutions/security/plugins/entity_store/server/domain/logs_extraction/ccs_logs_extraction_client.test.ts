/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { CcsLogsExtractionClient } from '.';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { getUpdatesEntitiesDataStreamName } from '../asset_manager/updates_data_stream';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import { ingestEntities } from '../../infra/elasticsearch/ingest';
import { ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD } from './query_builder_commons';
import type { CcsLogExtractionStateClient } from '../saved_objects/ccs_log_extraction_state';
import { get } from 'lodash';

jest.mock('../../infra/elasticsearch/esql', () => {
  const actual = jest.requireActual<typeof import('../../infra/elasticsearch/esql')>(
    '../../infra/elasticsearch/esql'
  );
  return {
    ...actual,
    executeEsqlQuery: jest.fn(),
  };
});

jest.mock('../../infra/elasticsearch/ingest', () => ({
  ingestEntities: jest.fn().mockResolvedValue(undefined),
}));

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;
const mockIngestEntities = ingestEntities as jest.MockedFunction<typeof ingestEntities>;

/** Returns a probe response with one row: the slice end boundary. */
function makeProbeResponse(ts: string, id: string, totalLogs: number): ESQLSearchResponse {
  return {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: '_id', type: 'keyword' },
      { name: 'total_logs', type: 'long' },
    ],
    values: [[ts, id, totalLogs]],
  };
}

const emptyProbeResponse: ESQLSearchResponse = { columns: [], values: [] };

// Fixed clock so moment()-based timestamps are deterministic across tests
const FIXED_NOW = new Date('2026-01-01T12:00:00.000Z');
// '3h' lookbackPeriod → fresh fromDateISO = FIXED_NOW - 10 800 000 ms
const EXPECTED_FROM_DATE_ISO = '2026-01-01T09:00:00.000Z';

const DEFAULT_MAX_LOGS_PER_PAGE = 10000;

describe('CcsLogsExtractionClient', () => {
  const mockLogger = loggerMock.create();
  const mockEsClient = {} as unknown as jest.Mocked<ElasticsearchClient>;
  const namespace = 'default';

  const mockCcsStateClient = {
    findOrInit: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    clearRecoveryId: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CcsLogExtractionStateClient>;

  let client: CcsLogsExtractionClient;

  const defaultExtractParams = {
    type: 'host' as const,
    remoteIndexPatterns: ['remote_cluster:logs-*'],
    docsLimit: 10000,
    maxLogsPerPage: DEFAULT_MAX_LOGS_PER_PAGE,
    lookbackPeriod: '3h',
    delay: '1m',
    entityDefinition: getEntityDefinition('host', 'default'),
  };

  beforeEach(() => {
    jest.useFakeTimers({ now: FIXED_NOW });
    jest.clearAllMocks();
    // Reset once-queue so leftover mocks from previous tests don't leak
    mockExecuteEsqlQuery.mockReset();
    mockCcsStateClient.findOrInit.mockResolvedValue({
      checkpointTimestamp: null,
      paginationRecoveryId: null,
    });
    mockCcsStateClient.update.mockResolvedValue(undefined);
    mockCcsStateClient.clearRecoveryId.mockResolvedValue(undefined);
    client = new CcsLogsExtractionClient(mockLogger, mockEsClient, namespace, mockCcsStateClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should extract to updates via bulk and return count and pages', async () => {
    const entityPageResponse: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'entity.id', type: 'keyword' },
        { name: 'event.kind', type: 'keyword' },
      ],
      values: [
        ['2024-06-15T12:00:00.000Z', 'host:host-1', 'asset'],
        ['2024-06-15T12:00:00.000Z', 'host:host-2', 'asset'],
      ],
    };

    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T23:59:59.000Z', 'doc-last', 2))
      .mockResolvedValueOnce(entityPageResponse);

    const result = await client.extractToUpdates(defaultExtractParams);

    expect(result).toEqual({ count: 2, pages: 1 });
    // probe + entity page; total_logs=2 <= maxLogsPerPage → isLastLogsPage=true, no second probe
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
    expect(mockIngestEntities).toHaveBeenCalledTimes(1);
    expect(mockIngestEntities).toHaveBeenCalledWith({
      esClient: mockEsClient,
      esqlResponse: entityPageResponse,
      targetIndex: getUpdatesEntitiesDataStreamName(namespace),
      logger: mockLogger,
      fieldsToIgnore: [ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD],
      transformDocument: expect.any(Function),
    });
    const transformDocument = mockIngestEntities.mock.calls[0][0].transformDocument!;
    const doc1 = transformDocument({
      '@timestamp': '2024-06-15T12:00:00.000Z',
      'entity.id': 'host:host-1',
      'event.kind': 'asset',
    }) as Record<string, unknown>;
    expect(doc1['@timestamp']).toBeDefined();
    expect((doc1 as { event?: { kind?: string } }).event?.kind).toBe('asset');
    expect(get(doc1, ['host', 'entity', 'id'])).toBe('host:host-1');
  });

  it('should call bulk with flat entity doc and event.kind asset', async () => {
    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2026-01-01T11:58:59.000Z', 'doc-last', 1))
      .mockResolvedValueOnce({
        columns: [
          { name: 'entity.id', type: 'keyword' },
          { name: 'entity.name', type: 'keyword' },
          { name: 'event.kind', type: 'keyword' },
        ],
        values: [['user:u1', 'alice', 'asset']],
      });

    await client.extractToUpdates({
      ...defaultExtractParams,
      type: 'user',
      entityDefinition: getEntityDefinition('user', 'default'),
    });

    expect(mockIngestEntities).toHaveBeenCalledTimes(1);
    expect(mockIngestEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        targetIndex: getUpdatesEntitiesDataStreamName(namespace),
        fieldsToIgnore: [ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD],
      })
    );
    const transformDocument = mockIngestEntities.mock.calls[0][0].transformDocument!;
    const doc = transformDocument({
      'entity.id': 'user:u1',
      'entity.name': 'alice',
      'event.kind': 'asset',
    }) as Record<string, unknown>;
    expect((doc as { user?: { entity?: { id?: string } } }).user?.entity?.id).toBe('user:u1');
    expect(doc.user).toBeDefined();
    expect((doc as { event?: { kind?: string } }).event?.kind).toBe('asset');
    expect(doc['@timestamp']).toBeDefined();
    // @timestamp is rewritten to now + increment (1ms per doc) so it is always in the future
    const nowMs = FIXED_NOW.getTime();
    const ts = new Date(doc['@timestamp'] as string).getTime();
    expect(ts).toBeGreaterThanOrEqual(nowMs);
    expect(ts).toBeLessThanOrEqual(nowMs + 10001);
  });

  it('should paginate (inner loop) when entity page is full', async () => {
    const docsLimit = 2;
    const firstPage: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD, type: 'date' },
        { name: 'entity.id', type: 'keyword' },
        { name: 'event.kind', type: 'keyword' },
      ],
      values: [
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'host:h1', 'asset'],
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'host:h2', 'asset'],
      ],
    };
    const secondPage: ESQLSearchResponse = {
      columns: firstPage.columns,
      values: [['2024-06-15T11:00:00.000Z', '2024-06-15T11:00:00.000Z', 'host:h3', 'asset']],
    };

    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T11:00:00.000Z', 'doc-last', 3))
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const result = await client.extractToUpdates({ ...defaultExtractParams, docsLimit });

    expect(result).toEqual({ count: 3, pages: 2 });
    // probe + 2 entity pages; total_logs=3 <= maxLogsPerPage → isLastLogsPage=true, no second probe
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(3);
    expect(mockIngestEntities).toHaveBeenCalledTimes(2);
    expect(mockIngestEntities).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ esqlResponse: firstPage })
    );
    expect(mockIngestEntities).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ esqlResponse: secondPage })
    );
    // State persisted after the first full entity page — checkpoint = last entity's _firstSeenLog
    expect(mockCcsStateClient.update).toHaveBeenCalledWith('host', {
      checkpointTimestamp: '2024-06-15T10:00:00.000Z',
      paginationRecoveryId: 'host:h2',
    });
    // Outer loop advance after slice completes
    expect(mockCcsStateClient.update).toHaveBeenCalledWith('host', {
      checkpointTimestamp: '2024-06-15T11:00:00.000Z',
      paginationRecoveryId: null,
    });
    // count > 0 → no clearRecoveryId
    expect(mockCcsStateClient.clearRecoveryId).not.toHaveBeenCalled();
  });

  it('should paginate across outer (log-slice) loop when probe signals more slices', async () => {
    const docsLimit = 5;
    const maxLogsPerPage = 2;

    const slice1EntityPage: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD, type: 'date' },
        { name: 'entity.id', type: 'keyword' },
      ],
      values: [
        ['2024-06-15T10:00:00.000Z', '2024-06-15T09:00:00.000Z', 'host:h1'],
        ['2024-06-15T10:00:00.000Z', '2024-06-15T09:00:00.000Z', 'host:h2'],
      ],
    };
    const slice2EntityPage: ESQLSearchResponse = {
      columns: slice1EntityPage.columns,
      values: [
        ['2024-06-15T11:00:00.000Z', '2024-06-15T10:30:00.000Z', 'host:h3'],
        ['2024-06-15T11:00:00.000Z', '2024-06-15T10:30:00.000Z', 'host:h4'],
      ],
    };

    // Probe 1: total_logs=4 > maxLogsPerPage=2 → not the last slice
    // Probe 2: total_logs=2 = maxLogsPerPage=2 → last slice
    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T10:00:00.000Z', 'doc-2', 4))
      .mockResolvedValueOnce(slice1EntityPage)
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T11:00:00.000Z', 'doc-4', 2))
      .mockResolvedValueOnce(slice2EntityPage);

    const result = await client.extractToUpdates({
      ...defaultExtractParams,
      docsLimit,
      maxLogsPerPage,
    });

    expect(result).toEqual({ count: 4, pages: 2 });
    // 2 probes + 2 entity pages
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(4);
    expect(mockIngestEntities).toHaveBeenCalledTimes(2);

    // Slice boundary state persisted after each slice completes
    expect(mockCcsStateClient.update).toHaveBeenCalledWith('host', {
      checkpointTimestamp: '2024-06-15T10:00:00.000Z',
      paginationRecoveryId: null,
    });
    expect(mockCcsStateClient.update).toHaveBeenCalledWith('host', {
      checkpointTimestamp: '2024-06-15T11:00:00.000Z',
      paginationRecoveryId: null,
    });
    // count > 0 → no clearRecoveryId
    expect(mockCcsStateClient.clearRecoveryId).not.toHaveBeenCalled();
  });

  it('should return error when ESQL call is aborted during entity pagination', async () => {
    const docsLimit = 2;
    const firstPage: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD, type: 'date' },
        { name: 'entity.id', type: 'keyword' },
      ],
      values: [
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'host:h1'],
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'host:h2'],
      ],
    };

    const abortError = new DOMException('aborted', 'AbortError');
    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T10:00:00.000Z', 'doc-last', 4))
      .mockResolvedValueOnce(firstPage)
      .mockRejectedValueOnce(abortError);

    const result = await client.extractToUpdates({
      ...defaultExtractParams,
      docsLimit,
      abortController: new AbortController(),
    });

    expect(result.error).toBeDefined();
    // probe + first entity page + second entity page (aborts)
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(3);
    expect(mockIngestEntities).toHaveBeenCalledTimes(1);
  });

  it('should return zero count and pages when probe finds no logs', async () => {
    mockCcsStateClient.findOrInit.mockResolvedValue({
      checkpointTimestamp: '2024-06-15T10:00:00.000Z',
      paginationRecoveryId: null,
    });
    mockExecuteEsqlQuery.mockResolvedValueOnce(emptyProbeResponse);

    const result = await client.extractToUpdates(defaultExtractParams);

    expect(result).toEqual({ count: 0, pages: 0 });
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockIngestEntities).not.toHaveBeenCalled();
    // clearRecoveryId called to clean up any stale recovery id; checkpoint unchanged
    expect(mockCcsStateClient.clearRecoveryId).toHaveBeenCalledWith('host');
    expect(mockCcsStateClient.update).not.toHaveBeenCalledWith(
      'host',
      expect.objectContaining({ checkpointTimestamp: null })
    );
  });

  it('should resume from mid entity-page recovery state (paginationRecoveryId set)', async () => {
    const recoveryTimestamp = '2024-06-15T10:00:00.000Z';
    const recoveryId = 'host:h2';
    mockCcsStateClient.findOrInit.mockResolvedValue({
      checkpointTimestamp: recoveryTimestamp,
      paginationRecoveryId: recoveryId,
    });

    const entityPageResponse: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD, type: 'date' },
        { name: 'entity.id', type: 'keyword' },
      ],
      values: [['2024-06-15T11:00:00.000Z', '2024-06-15T10:00:00.000Z', 'host:h3']],
    };

    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T11:00:00.000Z', 'doc-last', 1))
      .mockResolvedValueOnce(entityPageResponse);

    const result = await client.extractToUpdates(defaultExtractParams);

    expect(result).toEqual({ count: 1, pages: 1 });

    // The probe query must use checkpointTimestamp as the window start
    const probeQuery = mockExecuteEsqlQuery.mock.calls[0][0].query as string;
    expect(probeQuery).toContain(recoveryTimestamp);
    // The entity page query must include the recoveryId for the WHERE clause
    const entityQuery = mockExecuteEsqlQuery.mock.calls[1][0].query as string;
    expect(entityQuery).toContain(recoveryId);
  });

  it('should resume from slice-boundary recovery state (checkpointTimestamp set, paginationRecoveryId null)', async () => {
    const sliceBoundaryTimestamp = '2024-06-15T10:00:00.000Z';
    mockCcsStateClient.findOrInit.mockResolvedValue({
      checkpointTimestamp: sliceBoundaryTimestamp,
      paginationRecoveryId: null,
    });

    const entityPageResponse: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD, type: 'date' },
        { name: 'entity.id', type: 'keyword' },
      ],
      values: [['2024-06-15T11:00:00.000Z', '2024-06-15T10:30:00.000Z', 'host:h4']],
    };

    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T11:00:00.000Z', 'doc-last', 1))
      .mockResolvedValueOnce(entityPageResponse);

    const result = await client.extractToUpdates(defaultExtractParams);

    expect(result).toEqual({ count: 1, pages: 1 });

    const probeQuery = mockExecuteEsqlQuery.mock.calls[0][0].query as string;
    expect(probeQuery).toContain(sliceBoundaryTimestamp);
  });

  it('should use lookback window on fresh start (no checkpoint)', async () => {
    mockCcsStateClient.findOrInit.mockResolvedValue({
      checkpointTimestamp: null,
      paginationRecoveryId: null,
    });
    mockExecuteEsqlQuery.mockResolvedValueOnce(emptyProbeResponse);

    await client.extractToUpdates(defaultExtractParams);

    const probeQuery = mockExecuteEsqlQuery.mock.calls[0][0].query as string;
    // Probe should use now - lookbackPeriod as the from boundary
    expect(probeQuery).toContain(EXPECTED_FROM_DATE_ISO);
  });

  it('should use checkpointTimestamp as fromDateISO on normal continuation', async () => {
    const checkpoint = '2025-12-01T06:00:00.000Z';
    mockCcsStateClient.findOrInit.mockResolvedValue({
      checkpointTimestamp: checkpoint,
      paginationRecoveryId: null,
    });
    mockExecuteEsqlQuery.mockResolvedValueOnce(emptyProbeResponse);

    await client.extractToUpdates(defaultExtractParams);

    const probeQuery = mockExecuteEsqlQuery.mock.calls[0][0].query as string;
    expect(probeQuery).toContain(checkpoint);
    expect(probeQuery).not.toContain(EXPECTED_FROM_DATE_ISO);
  });

  it('should use provided window override and skip state updates', async () => {
    const overrideFrom = '2024-01-01T00:00:00.000Z';
    const overrideTo = '2024-06-15T23:59:59.999Z';

    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T12:00:00.000Z', 'doc-last', 1))
      .mockResolvedValueOnce({
        columns: [{ name: 'entity.id', type: 'keyword' }],
        values: [['host:h1']],
      });

    const result = await client.extractToUpdates({
      ...defaultExtractParams,
      windowOverride: { fromDateISO: overrideFrom, toDateISO: overrideTo },
    });

    expect(result).toEqual({ count: 1, pages: 1 });

    // findOrInit must NOT be called for override runs
    expect(mockCcsStateClient.findOrInit).not.toHaveBeenCalled();
    // State must NOT be modified for override runs
    expect(mockCcsStateClient.update).not.toHaveBeenCalled();
    expect(mockCcsStateClient.clearRecoveryId).not.toHaveBeenCalled();

    // Probe must use the override window
    const probeQuery = mockExecuteEsqlQuery.mock.calls[0][0].query as string;
    expect(probeQuery).toContain(overrideFrom);
    expect(probeQuery).toContain(overrideTo);
  });

  it('should return empty result immediately when window is empty (from >= to)', async () => {
    const futureCheckpoint = '2027-01-01T00:00:00.000Z'; // later than FIXED_NOW - 1min
    mockCcsStateClient.findOrInit.mockResolvedValue({
      checkpointTimestamp: futureCheckpoint,
      paginationRecoveryId: null,
    });

    const result = await client.extractToUpdates(defaultExtractParams);

    expect(result).toEqual({ count: 0, pages: 0 });
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(mockCcsStateClient.clearRecoveryId).not.toHaveBeenCalled();
  });
});
