/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient, EntityMetadataClient } from '@kbn/entity-store/server';
import { loggerMock } from '@kbn/logging-mocks';
import { runLogsIntegration } from './run_logs_integration';
import type { RelationshipIntegrationConfig } from './types';
import { COMPOSITE_PAGE_SIZE } from './constants';

const makeEsClient = () => {
  const esql = jest.fn();
  const esClient = { esql: { query: esql } } as unknown as ElasticsearchClient;
  return { esClient, esql };
};

const makeClients = () => {
  const bulkUpdate = jest.fn().mockResolvedValue([]);
  const bulkAppend = jest.fn().mockImplementation(async (docs: unknown[]) => ({
    successful: docs.length,
    failed: 0,
  }));
  const crudClient = { bulkUpdateEntity: bulkUpdate } as unknown as EntityUpdateClient;
  const entityMetadataClient = { bulkAppendMetadata: bulkAppend } as unknown as EntityMetadataClient;
  return { crudClient, entityMetadataClient, bulkUpdate, bulkAppend };
};

const baseConfig: RelationshipIntegrationConfig = {
  source: 'logs',
  kind: 'standard',
  id: 'system_auth',
  name: 'System Auth',
  indexPattern: (ns) => `logs-system.auth-${ns}`,
  relationshipKey: 'communicates_with',
  targetEntityType: 'host',
  customActor: { fields: ['user.email', 'user.name'] },
  esqlWhereClause: 'event.action == "ssh_login" AND event.outcome == "success"',
};

const probeColumns = [
  { name: 'sliceBoundary', type: 'date' },
  { name: 'actorCount', type: 'long' },
];

const boundaryColumns = [{ name: 'extendedSliceEnd', type: 'date' }];

const extractColumns = [
  { name: 'communicates_with', type: 'keyword' },
  { name: 'actorUserId', type: 'keyword' },
];

describe('runLogsIntegration', () => {
  it('returns empty outcome when probe returns no actors', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient } = makeClients();
    const logger = loggerMock.create();

    // Probe returns empty → isLastSlice=true, no actors
    esql.mockResolvedValueOnce({ columns: probeColumns, values: [] });

    const result = await runLogsIntegration(
      baseConfig, esClient, logger, 'default',
      crudClient, entityMetadataClient, undefined,
      { scanId: 'scan-1', observedAt: '2026-07-26T00:00:00.000Z' }
    );

    expect(result.outcome).toBe('empty');
    expect(result.slices).toBe(0);
    expect(esql).toHaveBeenCalledTimes(1); // probe only, no boundary/extract
  });

  it('runs probe → extract → write for a single (last) slice', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient, bulkUpdate } = makeClients();
    const logger = loggerMock.create();

    // Probe: 1 actor found (< COMPOSITE_PAGE_SIZE → isLastSlice=true, skip boundary)
    esql.mockResolvedValueOnce({
      columns: probeColumns,
      values: [['2026-06-27T00:00:00.000Z', 1]],
    });
    // Extract: one actor with one target (no boundary call for last slice)
    esql.mockResolvedValueOnce({
      columns: extractColumns,
      values: [['host:server-a', 'user:alice@host-123@local']],
    });

    bulkUpdate.mockResolvedValue([]);

    const result = await runLogsIntegration(
      baseConfig, esClient, logger, 'default',
      crudClient, entityMetadataClient, undefined,
      { scanId: 'scan-1', observedAt: '2026-07-26T00:00:00.000Z' }
    );

    expect(result.outcome).toBe('producing');
    expect(result.slices).toBe(1);
    expect(esql).toHaveBeenCalledTimes(2); // probe + extract (no boundary for last slice)
    expect(bulkUpdate).toHaveBeenCalledTimes(1);
  });

  it('iterates multiple slices when probe is saturated', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient } = makeClients();
    const logger = loggerMock.create();

    // Slice 1 probe: saturated (actorCount == COMPOSITE_PAGE_SIZE) → isLastSlice=false
    esql.mockResolvedValueOnce({
      columns: probeColumns,
      values: [['2026-06-27T00:00:00.000Z', COMPOSITE_PAGE_SIZE]],
    });
    // Slice 1 boundary
    esql.mockResolvedValueOnce({
      columns: boundaryColumns,
      values: [['2026-06-27T12:00:00.000Z']],
    });
    // Slice 1 extract: empty result
    esql.mockResolvedValueOnce({ columns: extractColumns, values: [] });

    // Slice 2 probe: not saturated → isLastSlice=true (no boundary call)
    esql.mockResolvedValueOnce({
      columns: probeColumns,
      values: [['2026-06-28T00:00:00.000Z', 10]],
    });
    // Slice 2 extract: empty (boundary skipped — last slice uses 'now')
    esql.mockResolvedValueOnce({ columns: extractColumns, values: [] });

    const result = await runLogsIntegration(
      baseConfig, esClient, logger, 'default',
      crudClient, entityMetadataClient, undefined,
      { scanId: 'scan-1', observedAt: '2026-07-26T00:00:00.000Z' }
    );

    expect(result.slices).toBe(2);
    expect(esql).toHaveBeenCalledTimes(5); // 3 for slice 1 (probe+boundary+extract) + 2 for slice 2 (probe+extract)
  });

  it('stops early and returns aborted outcome when signal is aborted', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient } = makeClients();
    const logger = loggerMock.create();

    const controller = new AbortController();
    controller.abort();

    const result = await runLogsIntegration(
      baseConfig, esClient, logger, 'default',
      crudClient, entityMetadataClient, controller.signal,
      { scanId: 'scan-1', observedAt: '2026-07-26T00:00:00.000Z' }
    );

    expect(result.outcome).toBe('aborted');
    expect(esql).not.toHaveBeenCalled();
  });

  it('skips boundary query and uses "now" as slice end on last slice', async () => {
    const { esClient, esql } = makeEsClient();
    const { crudClient, entityMetadataClient } = makeClients();
    const logger = loggerMock.create();

    // Probe: 1 actor (< COMPOSITE_PAGE_SIZE → isLastSlice=true)
    esql.mockResolvedValueOnce({
      columns: probeColumns,
      values: [['2026-06-27T00:00:00.000Z', 1]],
    });
    // No boundary call expected — last slice goes to 'now'
    // Extract
    esql.mockResolvedValueOnce({ columns: extractColumns, values: [] });

    await runLogsIntegration(
      baseConfig, esClient, logger, 'default',
      crudClient, entityMetadataClient, undefined,
      { scanId: 'scan-1', observedAt: '2026-07-26T00:00:00.000Z' }
    );

    // Only probe + extract, no boundary
    expect(esql).toHaveBeenCalledTimes(2);
  });
});
