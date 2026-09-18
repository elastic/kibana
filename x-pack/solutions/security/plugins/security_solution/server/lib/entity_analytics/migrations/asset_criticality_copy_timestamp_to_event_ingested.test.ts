/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../asset_criticality/asset_criticality_migration_client', () => ({
  AssetCriticalityMigrationClient: jest.fn().mockImplementation(() => ({
    copyTimestampToEventIngestedForAssetCriticality: jest
      .fn()
      .mockResolvedValue({ updated: 0, failures: [] }),
  })),
}));

import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { auditLoggerMock } from '@kbn/core-security-server-mocks';

import { createMigrationTask } from './asset_criticality_copy_timestamp_to_event_ingested';

const TASK_TYPE = 'security-solution-ea-asset-criticality-copy-timestamp-to-event-ingested';
const TASK_ID = `${TASK_TYPE}-task-id`;

describe('assetCrticalityCopyTimestampToEventIngested — execution context wrap', () => {
  const logger = loggerMock.create();
  const auditLogger = auditLoggerMock.create();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('wraps the migration run in coreStart.executionContext.withContext with the expected label and id', async () => {
    const withContext = jest.fn().mockImplementation(<T>(_ctx: unknown, fn: () => T): T => fn());
    const mockCoreStart = {
      elasticsearch: { client: elasticsearchServiceMock.createClusterClient() },
      executionContext: { withContext },
    };
    const getStartServices = jest.fn().mockResolvedValue([mockCoreStart, {}]);

    const migrationTask = createMigrationTask({ getStartServices, logger, auditLogger })({
      signal: new AbortController().signal,
    });

    await migrationTask.run();

    expect(withContext).toHaveBeenCalledTimes(1);
    expect(withContext).toHaveBeenCalledWith(
      {
        type: 'security_solution',
        name: 'entity_analytics:asset_criticality_migration',
        id: TASK_ID,
      },
      expect.any(Function)
    );
  });
});
