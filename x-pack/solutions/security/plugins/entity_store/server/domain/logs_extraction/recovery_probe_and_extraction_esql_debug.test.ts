/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import { ingestEntities } from '../../infra/elasticsearch/ingest';
import type { CcsLogsExtractionClient } from '.';
import { LogsExtractionClient } from './logs_extraction_client';
import { LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD } from './log_pagination_probe_query_builder';
import { TIMESTAMP_FIELD } from './query_builder_commons';
import {
  LogExtractionConfig,
  type EngineDescriptorClient,
  type EntityStoreGlobalState,
  type EntityStoreGlobalStateClient,
} from '../saved_objects';
import { ENGINE_STATUS } from '../constants';
import type { EntityType } from '../../../common/domain/definitions/entity_schema';

jest.mock('../../infra/elasticsearch/esql');
jest.mock('../../infra/elasticsearch/ingest');

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;
const mockIngestEntities = ingestEntities as jest.MockedFunction<typeof ingestEntities>;

const LOG_PAGINATION_CURSOR_PROBE_COLUMNS: ESQLSearchResponse['columns'] = [
  { name: TIMESTAMP_FIELD, type: 'date' },
  { name: '_id', type: 'keyword' },
  { name: LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD, type: 'long' },
];

function createMockEngineDescriptorForRecovery(
  type: EntityType,
  recoveryPaginationId: string
): {
  type: EntityType;
  status: typeof ENGINE_STATUS.STARTED;
  logExtractionState: {
    paginationTimestamp: string | undefined;
    paginationId: string;
    lastExecutionTimestamp: undefined;
    logsPageCursorStartTimestamp: undefined;
    logsPageCursorStartId: undefined;
    logsPageCursorEndTimestamp: undefined;
    logsPageCursorEndId: undefined;
  };
  versionState: { version: number; state: 'running'; isMigratedFromV1: boolean };
} {
  return {
    type,
    status: ENGINE_STATUS.STARTED,
    logExtractionState: {
      paginationTimestamp: undefined,
      paginationId: recoveryPaginationId,
      lastExecutionTimestamp: undefined,
      logsPageCursorStartTimestamp: undefined,
      logsPageCursorStartId: undefined,
      logsPageCursorEndTimestamp: undefined,
      logsPageCursorEndId: undefined,
    },
    versionState: { version: 2, state: 'running', isMigratedFromV1: false },
  };
}

function createMockGlobalStateClient(
  overrides: Partial<{ docsLimit: number; maxLogsPerPage: number }>
): jest.Mocked<Pick<EntityStoreGlobalStateClient, 'find' | 'findOrThrow' | 'update'>> {
  const logsExtraction = LogExtractionConfig.parse({
    docsLimit: overrides.docsLimit ?? 10_000,
    maxLogsPerPage: overrides.maxLogsPerPage ?? 40_000,
    additionalIndexPatterns: [],
    lookbackPeriod: '3h',
    delay: '1m',
  });
  const state = { logsExtraction } as EntityStoreGlobalState;
  return {
    find: jest.fn().mockResolvedValue(state),
    findOrThrow: jest.fn().mockResolvedValue(state),
    update: jest.fn().mockResolvedValue({}),
  };
}

function createMockCcsLogsExtractionClient(): jest.Mocked<
  Pick<CcsLogsExtractionClient, 'extractToUpdates'>
> {
  return {
    extractToUpdates: jest.fn().mockResolvedValue({ count: 0, pages: 0 }),
  };
}

/**
 * Runs the real {@link LogsExtractionClient} with mocked ES/ingest. Inspect stdout for each
 * `executeEsqlQuery` invocation (probe then bounded extraction).
 *
 * Run:
 * `node scripts/jest x-pack/solutions/security/plugins/entity_store/server/domain/logs_extraction/recovery_probe_and_extraction_esql_debug.test.ts --verbose`
 */
describe('LogsExtractionClient recovery flow (debug)', () => {
  it('logs full ESQL from extractLogs with specificWindow and engine paginationId (one-shot recovery)', async () => {
    const fromDateISO = '2026-04-22T09:47:33.911Z';
    const toDateISO = '2026-04-22T12:47:33.911Z';
    const recoveryId = 'debug-recovery-entity-id';
    const maxLogsPerPage = 40_000;
    const docsLimit = 10_000;
    // always return 1 so we don't end up in a infinite loop
    const probeReturn = ['2026-04-22T11:28:48.227Z', 'AZ208_RAyCRUFU4qHG6m', 1];

    jest.clearAllMocks();

    const mockLogger = loggerMock.create();
    const mockEsClient = {} as jest.Mocked<ElasticsearchClient>;
    const mockDataViewsService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<DataViewsService>;

    const mockEngineDescriptorClient: jest.Mocked<
      Pick<EngineDescriptorClient, 'findOrThrow' | 'update' | 'updateWith'>
    > = {
      findOrThrow: jest
        .fn()
        .mockResolvedValue(
          createMockEngineDescriptorForRecovery('user', recoveryId) as Awaited<
            ReturnType<EngineDescriptorClient['findOrThrow']>
          >
        ),
      update: jest.fn().mockResolvedValue({}),
      updateWith: jest.fn().mockResolvedValue({}),
    };

    const mockGlobalStateClient = createMockGlobalStateClient({ docsLimit, maxLogsPerPage });
    const mockCcsLogsExtractionClient = createMockCcsLogsExtractionClient();

    const mockDataView = {
      getIndexPattern: jest
        .fn()
        .mockReturnValue('logs-*,filebeat-*,.alerts-security.alerts-default'),
    };
    mockDataViewsService.get.mockResolvedValue(mockDataView as any);

    let esqlCallIndex = 0;
    mockExecuteEsqlQuery.mockImplementation(async ({ query }) => {
      esqlCallIndex += 1;
      const isProbe =
        query.includes(LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD) && query.includes('INLINE STATS');
      const label = isProbe ? 'log-pagination cursor probe' : 'bounded main extraction';

      process.stdout.write(
        `\n========== ${label} (executeEsqlQuery #${esqlCallIndex}) ==========\n${query}\n`
      );

      if (isProbe) {
        return {
          columns: LOG_PAGINATION_CURSOR_PROBE_COLUMNS,
          values: [probeReturn],
        };
      }

      return { columns: [], values: [] };
    });

    mockIngestEntities.mockResolvedValue(undefined);

    const client = new LogsExtractionClient({
      logger: mockLogger,
      namespace: 'default',
      esClient: mockEsClient,
      dataViewsService: mockDataViewsService,
      engineDescriptorClient: mockEngineDescriptorClient as unknown as EngineDescriptorClient,
      globalStateClient: mockGlobalStateClient as unknown as EntityStoreGlobalStateClient,
      ccsLogsExtractionClient: mockCcsLogsExtractionClient as unknown as CcsLogsExtractionClient,
    });

    const result = await client.extractLogs('user', {
      specificWindow: { fromDateISO, toDateISO },
    });

    expect(result.success).toBe(true);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
    expect(mockIngestEntities).toHaveBeenCalledTimes(1);

    const probeQuery = mockExecuteEsqlQuery.mock.calls[0][0].query;
    expect(probeQuery).toContain(fromDateISO);
    expect(probeQuery).toContain(`LIMIT ${maxLogsPerPage}`);

    const probeResponse = (await mockExecuteEsqlQuery.mock.results[0].value) as ESQLSearchResponse;
    const idColumnIndex = probeResponse.columns.findIndex((c) => c.name === '_id');
    expect(idColumnIndex).toBeGreaterThan(-1);
  });
});
