/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import moment from 'moment';
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
function makeProbeResponse(ts: string, totalLogs: number): ESQLSearchResponse {
  return {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'total_logs', type: 'long' },
    ],
    values: [[ts, totalLogs]],
  };
}

const emptyProbeResponse: ESQLSearchResponse = { columns: [], values: [] };

// Fixed clock so moment()-based timestamps are deterministic across tests
const FIXED_NOW = new Date('2026-01-01T12:00:00.000Z');
// '3h' lookbackPeriod → fresh fromDateISO = FIXED_NOW - 10 800 000 ms
const EXPECTED_FROM_DATE_ISO = '2026-01-01T09:00:00.000Z';
// '1m' delay → effectiveWindowEnd = FIXED_NOW - 60 000 ms. This is the `toDateISO` the outer
// loop sweeps `sliceEnd` to whenever a slice resolves as the last page (see
// `runLogsPaginationOuterLoop` in remote_logs_extraction_client.ts) — sampling means the last
// page's real boundary is no longer trustworthy, so the sweep always goes to the window top
// instead of the probe's own (possibly undershooting) MAX(@timestamp).
const EXPECTED_WINDOW_END = '2026-01-01T11:59:00.000Z';

// pickSampleProbability(10000) = min(1, max(0.1, 2500/10000)) = 0.25 (escalated above the 0.1
// target since 10000 < LOG_EXTRACTION_SAMPLE_MIN_RETAINED's implied threshold of 25000).
// scaledProbeLimit(DEFAULT_MAX_LOGS_PER_PAGE, 0.25) = round(10000 * 0.25) = 2500
const DEFAULT_MAX_LOGS_PER_PAGE = 10000;

describe('CcsLogsExtractionClient', () => {
  const mockLogger = loggerMock.create();
  const mockEsClient = {
    indices: {
      resolveIndex: jest.fn().mockResolvedValue({ indices: [], aliases: [], data_streams: [] }),
    },
  } as unknown as jest.Mocked<ElasticsearchClient>;
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
    frequency: '1m',
    entityDefinition: getEntityDefinition('host', 'default'),
    // Use a very large cap so existing tests remain a single sub-window. The sub-window cap
    // behavior is exercised by the dedicated tests at the end of this describe block.
    maxTimeWindowSize: '999d',
    maxLogsPerWindow: 0,
    maxLogsPerWindowCapBehavior: 'drop' as const,
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
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T23:59:59.000Z', 2))
      .mockResolvedValueOnce(entityPageResponse);

    const result = await client.extractToUpdates(defaultExtractParams);

    expect(result).toEqual({ count: 2, pages: 1 });
    // probe + entity page; total_logs=2 < scaledProbeLimit(10000)=2500 → isLastLogsPage=true,
    // sweep extraction runs once (over the swept window) and no second probe is needed
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
      .mockResolvedValueOnce(makeProbeResponse('2026-01-01T11:58:59.000Z', 1))
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
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T11:00:00.000Z', 3))
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const result = await client.extractToUpdates({ ...defaultExtractParams, docsLimit });

    expect(result).toEqual({ count: 3, pages: 2 });
    // probe + 2 entity pages; total_logs=3 < scaledProbeLimit(10000)=2500 → isLastLogsPage=true,
    // no second probe
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
    // Outer loop advance after slice completes: last-page slices are swept all the way to the
    // window top (EXPECTED_WINDOW_END), not the probe's own (sampled) MAX(@timestamp).
    expect(mockCcsStateClient.update).toHaveBeenCalledWith('host', {
      checkpointTimestamp: EXPECTED_WINDOW_END,
      paginationRecoveryId: null,
    });
    // count > 0 → no clearRecoveryId
    expect(mockCcsStateClient.clearRecoveryId).not.toHaveBeenCalled();
  });

  it('should paginate across outer (log-slice) loop when probe signals more slices', async () => {
    const docsLimit = 5;
    // pickSampleProbability(20) = min(1, max(0.1, 2500/20)) = 1: below LOG_EXTRACTION_SAMPLE_MIN_RETAINED
    // (2500), maxLogsPerPage=20 is too small for sampling to be accurate, so it escalates to an
    // exact, unsampled probe (p=1). scaledProbeLimit(20, 1) = 20, same as the original
    // pre-sampling LIMIT — total_logs below is compared directly against 20.
    const maxLogsPerPage = 20;

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

    // Probe 1: total_logs=20 = scaledProbeLimit(20)=20 → saturated, isLastLogsPage=false → not last
    // Probe 2: total_logs=5 < scaledProbeLimit(20)=20 → not saturated, isLastLogsPage=true → last
    //   slice; sliceEnd is swept to EXPECTED_WINDOW_END rather than the probe's own timestamp.
    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T10:00:00.000Z', 20))
      .mockResolvedValueOnce(slice1EntityPage)
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T11:00:00.000Z', 5))
      .mockResolvedValueOnce(slice2EntityPage);

    const result = await client.extractToUpdates({
      ...defaultExtractParams,
      docsLimit,
      maxLogsPerPage,
    });

    expect(result).toEqual({ count: 4, pages: 2 });
    // 2 probes + 2 entity pages; the last slice resolves from a present (non-empty) probe row,
    // so no extra sweep probe/call is needed beyond the extraction that already ran for it.
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(4);
    expect(mockIngestEntities).toHaveBeenCalledTimes(2);

    // Slice boundary state persisted after each slice completes
    expect(mockCcsStateClient.update).toHaveBeenCalledWith('host', {
      checkpointTimestamp: '2024-06-15T10:00:00.000Z',
      paginationRecoveryId: null,
    });
    // Last slice: swept to the window top, not the probe's own MAX(@timestamp).
    expect(mockCcsStateClient.update).toHaveBeenCalledWith('host', {
      checkpointTimestamp: EXPECTED_WINDOW_END,
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
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T10:00:00.000Z', 4))
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
    // An empty (zero-row) probe no longer short-circuits the loop: it is treated like a
    // non-saturated last page and triggers a follow-up sweep extraction over the full
    // remaining window, so a second (empty) response is needed here.
    mockExecuteEsqlQuery
      .mockResolvedValueOnce(emptyProbeResponse)
      .mockResolvedValueOnce({ columns: [], values: [] });

    const result = await client.extractToUpdates(defaultExtractParams);

    expect(result).toEqual({ count: 0, pages: 0 });
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
    expect(mockIngestEntities).not.toHaveBeenCalled();
    // clearRecoveryId called to clean up any stale recovery id (totalCount stayed 0)
    expect(mockCcsStateClient.clearRecoveryId).toHaveBeenCalledWith('host');
    // The sweep still persists the swept slice end (window top), even though nothing was found
    expect(mockCcsStateClient.update).toHaveBeenCalledWith('host', {
      checkpointTimestamp: EXPECTED_WINDOW_END,
      paginationRecoveryId: null,
    });
  });

  it('does not drop real docs when the sampled probe finds nothing (follow-up sweep extraction still ingests them)', async () => {
    // Core correctness guarantee of the SAMPLE-based probe: a probe reporting zero sampled rows
    // does NOT prove the real window is empty (e.g. 1-2 real docs left, ~90% chance none get
    // sampled at p=0.1). `hasLogsToProcess: false` must still trigger a follow-up sweep
    // extraction over the full [fromDateISO, toDateISO] window so those real docs are ingested
    // instead of being silently skipped.
    mockCcsStateClient.findOrInit.mockResolvedValue({
      checkpointTimestamp: '2024-06-15T10:00:00.000Z',
      paginationRecoveryId: null,
    });

    const sweepExtractionResponse: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD, type: 'date' },
        { name: 'entity.id', type: 'keyword' },
      ],
      values: [['2024-06-15T10:30:00.000Z', '2024-06-15T10:30:00.000Z', 'host:h-tail']],
    };

    mockExecuteEsqlQuery
      .mockResolvedValueOnce(emptyProbeResponse) // probe samples 0 rows despite real docs existing
      .mockResolvedValueOnce(sweepExtractionResponse); // sweep extraction still finds the real doc

    const result = await client.extractToUpdates(defaultExtractParams);

    expect(result).toEqual({ count: 1, pages: 1 });
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
    expect(mockIngestEntities).toHaveBeenCalledTimes(1);
    expect(mockIngestEntities).toHaveBeenCalledWith(
      expect.objectContaining({ esqlResponse: sweepExtractionResponse })
    );

    // The sweep extraction covers the whole remaining window — swept to the window top rather
    // than being bounded by the (undershooting/empty) sampled probe boundary.
    const sweepQuery = mockExecuteEsqlQuery.mock.calls[1][0].query as string;
    expect(sweepQuery).toContain(EXPECTED_WINDOW_END);

    // count > 0 → no clearRecoveryId, and the swept slice-end is persisted as usual.
    expect(mockCcsStateClient.clearRecoveryId).not.toHaveBeenCalled();
    expect(mockCcsStateClient.update).toHaveBeenCalledWith('host', {
      checkpointTimestamp: EXPECTED_WINDOW_END,
      paginationRecoveryId: null,
    });
  });

  it('should resume from mid entity-page recovery state (paginationRecoveryId set)', async () => {
    // Use a recent checkpoint (within 4.5h of FIXED_NOW) so the lag cutoff does not fire.
    const recoveryTimestamp = '2026-01-01T08:00:00.000Z';
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
      values: [['2026-01-01T09:00:00.000Z', '2026-01-01T08:00:00.000Z', 'host:h3']],
    };

    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2026-01-01T09:00:00.000Z', 1))
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
    // Use a recent checkpoint (within 4.5h of FIXED_NOW) so the lag cutoff does not fire.
    const sliceBoundaryTimestamp = '2026-01-01T08:00:00.000Z';
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
      values: [['2026-01-01T09:00:00.000Z', '2026-01-01T08:30:00.000Z', 'host:h4']],
    };

    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2026-01-01T09:00:00.000Z', 1))
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
    // Empty probe now runs a follow-up sweep extraction instead of short-circuiting the loop.
    mockExecuteEsqlQuery
      .mockResolvedValueOnce(emptyProbeResponse)
      .mockResolvedValueOnce({ columns: [], values: [] });

    await client.extractToUpdates(defaultExtractParams);

    const probeQuery = mockExecuteEsqlQuery.mock.calls[0][0].query as string;
    // Probe should use now - lookbackPeriod as the from boundary
    expect(probeQuery).toContain(EXPECTED_FROM_DATE_ISO);
  });

  it('should use checkpointTimestamp as fromDateISO on normal continuation', async () => {
    // Use a recent checkpoint (within 4.5h of FIXED_NOW) so the lag cutoff does not fire.
    const checkpoint = '2026-01-01T08:00:00.000Z';
    mockCcsStateClient.findOrInit.mockResolvedValue({
      checkpointTimestamp: checkpoint,
      paginationRecoveryId: null,
    });
    // Empty probe now runs a follow-up sweep extraction instead of short-circuiting the loop.
    mockExecuteEsqlQuery
      .mockResolvedValueOnce(emptyProbeResponse)
      .mockResolvedValueOnce({ columns: [], values: [] });

    await client.extractToUpdates(defaultExtractParams);

    const probeQuery = mockExecuteEsqlQuery.mock.calls[0][0].query as string;
    expect(probeQuery).toContain(checkpoint);
    expect(probeQuery).not.toContain(EXPECTED_FROM_DATE_ISO);
  });

  it('should use provided window override and skip state updates', async () => {
    const overrideFrom = '2024-01-01T00:00:00.000Z';
    const overrideTo = '2024-06-15T23:59:59.999Z';

    mockExecuteEsqlQuery
      .mockResolvedValueOnce(makeProbeResponse('2024-06-15T12:00:00.000Z', 1))
      .mockResolvedValueOnce({
        columns: [{ name: 'entity.id', type: 'keyword' }],
        values: [['host:h1']],
      });

    const result = await client.extractToUpdates({
      ...defaultExtractParams,
      windowOverride: { fromDateISO: overrideFrom, toDateISO: overrideTo },
    });

    expect(result).toMatchObject({ count: 1, pages: 1 });

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

  describe('sub-window cap', () => {
    it('walks the time window in capped sub-windows when checkpointTimestamp is far behind effectiveWindowEnd', async () => {
      // FIXED_NOW = 2026-01-01T12:00 ; delay = 1m → effectiveWindowEnd = 2026-01-01T11:59
      // checkpoint = 2026-01-01T11:29 → window ~30m, cap=5m, grace=30s → 6 sub-windows.
      const checkpoint = '2026-01-01T11:29:00.000Z';
      mockCcsStateClient.findOrInit.mockResolvedValue({
        checkpointTimestamp: checkpoint,
        paginationRecoveryId: null,
      });
      // Each sub-window probe returns empty (no logs). Under the new sweep semantics this no
      // longer breaks the inner outer-loop immediately — each sub-window still runs one
      // follow-up sweep extraction (also empty here) over its full span, and persists that
      // swept slice-end as the sub-window's checkpoint.
      mockExecuteEsqlQuery.mockResolvedValue(emptyProbeResponse);

      const result = await client.extractToUpdates({
        ...defaultExtractParams,
        maxTimeWindowSize: '5m',
      });

      expect(result).toEqual({ count: 0, pages: 0 });
      // 6 sub-windows × (1 probe + 1 follow-up sweep extraction).
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(12);
      // Each sub-window's empty probe still sweeps to (and persists) its own window end.
      expect(mockCcsStateClient.update).toHaveBeenCalledTimes(6);
      expect(mockCcsStateClient.update).toHaveBeenLastCalledWith('host', {
        checkpointTimestamp: EXPECTED_WINDOW_END,
        paginationRecoveryId: null,
      });
      // count=0 across all sub-windows → clearRecoveryId
      expect(mockCcsStateClient.clearRecoveryId).toHaveBeenCalledWith('host');
    });

    it('does not cap when the gap is within maxTimeWindowSize + grace', async () => {
      // Window ~ 5m + 10s, cap = 5m, grace = 30s → no cap, single sub-window.
      const checkpoint = '2026-01-01T11:53:50.000Z';
      mockCcsStateClient.findOrInit.mockResolvedValue({
        checkpointTimestamp: checkpoint,
        paginationRecoveryId: null,
      });
      // Empty probe now triggers one follow-up sweep extraction (also empty) instead of ending
      // the loop immediately.
      mockExecuteEsqlQuery
        .mockResolvedValueOnce(emptyProbeResponse)
        .mockResolvedValueOnce({ columns: [], values: [] });

      await client.extractToUpdates({
        ...defaultExtractParams,
        maxTimeWindowSize: '5m',
      });

      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
      // The sweep still persists the swept (empty) slice-end as the checkpoint.
      expect(mockCcsStateClient.update).toHaveBeenCalledWith('host', {
        checkpointTimestamp: EXPECTED_WINDOW_END,
        paginationRecoveryId: null,
      });
    });

    it('bypasses the sub-window cap when windowOverride is provided', async () => {
      const overrideFrom = '2024-01-01T00:00:00.000Z';
      const overrideTo = '2024-12-31T23:59:00.000Z'; // ~1y, exceeds the 5m cap

      // Empty probe now triggers one follow-up sweep extraction (also empty). Override runs
      // skip state updates regardless.
      mockExecuteEsqlQuery
        .mockResolvedValueOnce(emptyProbeResponse)
        .mockResolvedValueOnce({ columns: [], values: [] });

      await client.extractToUpdates({
        ...defaultExtractParams,
        maxTimeWindowSize: '5m',
        windowOverride: { fromDateISO: overrideFrom, toDateISO: overrideTo },
      });

      // Single probe + sweep extraction over the full user-supplied window — no sub-window
      // splitting.
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
      const probeQuery = mockExecuteEsqlQuery.mock.calls[0][0].query as string;
      expect(probeQuery).toContain(overrideFrom);
      expect(probeQuery).toContain(overrideTo);
      // Override runs do not touch CCS state.
      expect(mockCcsStateClient.findOrInit).not.toHaveBeenCalled();
      expect(mockCcsStateClient.update).not.toHaveBeenCalled();
    });

    it('passes monotonically advancing fromDateISO/toDateISO to each sub-window probe', async () => {
      const checkpoint = '2026-01-01T11:44:00.000Z'; // 15m before effectiveWindowEnd
      mockCcsStateClient.findOrInit.mockResolvedValue({
        checkpointTimestamp: checkpoint,
        paginationRecoveryId: null,
      });
      mockExecuteEsqlQuery.mockResolvedValue(emptyProbeResponse);

      await client.extractToUpdates({
        ...defaultExtractParams,
        maxTimeWindowSize: '5m',
      });

      // 3 sub-windows × (1 probe + 1 follow-up sweep extraction, since every probe is empty).
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(6);

      // Calls interleave probe/sweep per sub-window: [probe1, sweep1, probe2, sweep2, probe3, sweep3].
      const subWindow1 = mockExecuteEsqlQuery.mock.calls[0][0].query as string;
      expect(subWindow1).toContain('2026-01-01T11:44:00.000Z');
      expect(subWindow1).toContain('2026-01-01T11:49:00.000Z');

      const subWindow2 = mockExecuteEsqlQuery.mock.calls[2][0].query as string;
      expect(subWindow2).toContain('2026-01-01T11:49:00.000Z');
      expect(subWindow2).toContain('2026-01-01T11:54:00.000Z');

      const subWindow3 = mockExecuteEsqlQuery.mock.calls[4][0].query as string;
      expect(subWindow3).toContain('2026-01-01T11:54:00.000Z');
      expect(subWindow3).toContain('2026-01-01T11:59:00.000Z');
    });
  });

  describe('stall detection', () => {
    // `sliceStart` starts undefined; it is only set after the first slice completes (line ~332).
    // Stall detection (`!!sliceStart && ...`) therefore requires at least two slice iterations.
    // After the stall, a terminal empty probe resolves as the last page and runs one follow-up
    // sweep extraction over the remaining window before the loop ends (it no longer breaks
    // immediately) — every "terminal empty probe" sequence below mocks one extra response for it.

    it('logs warn and bumps checkpointTimestamp by 1ms when timestamp unchanged and page is full', async () => {
      const stalledTs = '2024-06-15T10:00:00.000Z';
      const bumpedTs = moment(stalledTs).add(1, 'ms').toISOString();

      mockCcsStateClient.findOrInit.mockResolvedValue({
        checkpointTimestamp: null,
        paginationRecoveryId: null,
      });

      // Slice 1: ends at stalledTs (saturated → not last, loop continues).
      // Slice 2: same stalledTs + saturated page → stall fires, extraction skipped, cursor bumped.
      // Probe 3 (with bumpedTs): empty → resolves as last page, runs one follow-up sweep
      // extraction over the remaining window, then the loop ends.
      mockExecuteEsqlQuery
        .mockResolvedValueOnce(makeProbeResponse(stalledTs, DEFAULT_MAX_LOGS_PER_PAGE)) // slice 1, not last
        .mockResolvedValueOnce({ columns: [], values: [] }) // entity extraction 1
        .mockResolvedValueOnce(makeProbeResponse(stalledTs, DEFAULT_MAX_LOGS_PER_PAGE)) // slice 2: stall fires, extraction skipped
        .mockResolvedValueOnce(emptyProbeResponse) // probe 3 with bumpedTs → last page
        .mockResolvedValueOnce({ columns: [], values: [] }); // follow-up sweep extraction → loop ends

      const result = await client.extractToUpdates(defaultExtractParams);

      expect(result.error).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      // The stall message no longer includes a doc count — it now describes a "saturated page"
      // rather than "a full page (${n} docs)", since a saturated sampled page no longer maps to
      // an exact doc count.
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `CCS log-slice probe stalled at ${stalledTs} with a saturated page; advancing cursor by 1ms. Docs sharing this timestamp beyond the configured per-page limit (${DEFAULT_MAX_LOGS_PER_PAGE}) will be dropped.`
        )
      );
      // The outer loop persists the bumped value as checkpointTimestamp after the stalled slice.
      expect(mockCcsStateClient.update).toHaveBeenCalledWith('host', {
        checkpointTimestamp: bumpedTs,
        paginationRecoveryId: null,
      });
    });

    it('does not warn when timestamp advances between slices', async () => {
      const ts1 = '2024-06-15T10:00:00.000Z';
      const ts2 = '2024-06-15T10:00:01.000Z'; // different timestamp → no stall

      mockCcsStateClient.findOrInit.mockResolvedValue({
        checkpointTimestamp: null,
        paginationRecoveryId: null,
      });

      // Slice 1: sliceStart becomes ts1. Slice 2: advances to ts2 (different) → no stall.
      // Saturated page (total >= scaledProbeLimit) → isLastLogsPage=false → loop continues;
      // a terminal empty probe then resolves last and runs one follow-up sweep extraction.
      mockExecuteEsqlQuery
        .mockResolvedValueOnce(makeProbeResponse(ts1, DEFAULT_MAX_LOGS_PER_PAGE)) // slice 1, not last
        .mockResolvedValueOnce({ columns: [], values: [] }) // entity extraction 1
        .mockResolvedValueOnce(makeProbeResponse(ts2, DEFAULT_MAX_LOGS_PER_PAGE)) // saturated, different ts → not last
        .mockResolvedValueOnce({ columns: [], values: [] }) // entity extraction 2
        .mockResolvedValueOnce(emptyProbeResponse) // terminal probe → last page
        .mockResolvedValueOnce({ columns: [], values: [] }); // follow-up sweep extraction → loop ends

      const result = await client.extractToUpdates(defaultExtractParams);

      expect(result.error).toBeUndefined();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('does not warn when page is partial even if timestamp unchanged', async () => {
      const ts1 = '2024-06-15T10:00:00.000Z';

      mockCcsStateClient.findOrInit.mockResolvedValue({
        checkpointTimestamp: null,
        paginationRecoveryId: null,
      });

      // Slice 1: sliceStart becomes ts1 (saturated, not last). Slice 2: same ts but only 5
      // sampled docs (well below scaledProbeLimit=2500) → isLastLogsPage=true, so sliceEnd is
      // swept to EXPECTED_WINDOW_END (not ts1) before reaching the stall check — no stall
      // regardless, since the swept sliceEnd never equals sliceStart's ts1.
      mockExecuteEsqlQuery
        .mockResolvedValueOnce(makeProbeResponse(ts1, DEFAULT_MAX_LOGS_PER_PAGE)) // slice 1, not last
        .mockResolvedValueOnce({ columns: [], values: [] }) // entity extraction 1
        .mockResolvedValueOnce(makeProbeResponse(ts1, 5)) // same ts, partial page → no stall, isLastLogsPage=true
        .mockResolvedValueOnce({ columns: [], values: [] }); // entity extraction 2 (sliceEnd = EXPECTED_WINDOW_END)

      const result = await client.extractToUpdates(defaultExtractParams);

      expect(result.error).toBeUndefined();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('does not warn on first iteration (sliceStart is always undefined initially)', async () => {
      // The first probe always runs with sliceStart=undefined → stall guard is skipped.
      mockCcsStateClient.findOrInit.mockResolvedValue({
        checkpointTimestamp: null,
        paginationRecoveryId: null,
      });

      const someTs = '2024-06-15T10:00:00.000Z';
      // Saturated page (isLastLogsPage=false): loop continues; a terminal empty probe then
      // resolves last and runs one follow-up sweep extraction before the loop ends.
      mockExecuteEsqlQuery
        .mockResolvedValueOnce(makeProbeResponse(someTs, DEFAULT_MAX_LOGS_PER_PAGE)) // slice 1, not last
        .mockResolvedValueOnce({ columns: [], values: [] }) // entity extraction
        .mockResolvedValueOnce(emptyProbeResponse) // terminal probe → last page
        .mockResolvedValueOnce({ columns: [], values: [] }); // follow-up sweep extraction → loop ends

      const result = await client.extractToUpdates(defaultExtractParams);

      expect(result.error).toBeUndefined();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('adaptive sampleProbability', () => {
    it('escalates above the 0.1 target and emits a SAMPLE stage when maxLogsPerPage=10000', async () => {
      mockExecuteEsqlQuery
        .mockResolvedValueOnce(makeProbeResponse('2024-06-15T23:59:59.000Z', 2))
        .mockResolvedValueOnce({ columns: [], values: [] });

      await client.extractToUpdates({ ...defaultExtractParams, maxLogsPerPage: 10000 });

      const probeQuery = mockExecuteEsqlQuery.mock.calls[0][0].query as string;
      // pickSampleProbability(10000) = min(1, max(0.1, 2500/10000)) = 0.25
      expect(probeQuery).toContain('| SAMPLE 0.25');
    });

    it('falls back to an exact, unsampled probe (no SAMPLE stage) when maxLogsPerPage is too small to sample accurately', async () => {
      mockExecuteEsqlQuery
        .mockResolvedValueOnce(makeProbeResponse('2024-06-15T23:59:59.000Z', 2))
        .mockResolvedValueOnce({ columns: [], values: [] });

      await client.extractToUpdates({ ...defaultExtractParams, maxLogsPerPage: 20 });

      const probeQuery = mockExecuteEsqlQuery.mock.calls[0][0].query as string;
      // pickSampleProbability(20) = 1 (20 <= LOG_EXTRACTION_SAMPLE_MIN_RETAINED / 1 threshold)
      expect(probeQuery).not.toContain('SAMPLE');
      expect(probeQuery).toContain('| LIMIT 20');
    });

    it('does not run a sweep extraction when an exact (unsampled) probe finds nothing', async () => {
      // maxLogsPerPage=20 → pickSampleProbability(20)=1: too small for sampling to help, so
      // the probe is exact. An empty result from an exact probe is definitive (no real docs can
      // be missed the way a sampled probe can miss them), so the loop should stop immediately
      // instead of running a redundant sweep extraction.
      mockExecuteEsqlQuery.mockResolvedValueOnce(emptyProbeResponse);

      const result = await client.extractToUpdates({ ...defaultExtractParams, maxLogsPerPage: 20 });

      expect(result).toEqual({ count: 0, pages: 0 });
      // Only the single (empty) probe call — no follow-up sweep extraction.
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).not.toHaveBeenCalled();
      expect(mockCcsStateClient.clearRecoveryId).toHaveBeenCalledWith('host');
      // No slice-end was ever swept/persisted, unlike the sampled-probe case.
      expect(mockCcsStateClient.update).not.toHaveBeenCalled();
    });
  });
});
