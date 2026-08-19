/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { AssetManagerClient } from './asset_manager_client';
import { uninstallElasticsearchAssets } from './install_assets';
import { deleteEuidStoredScripts } from './euid_stored_scripts';
import { stopExtractEntityTask } from '../../tasks/extract_entity_task';
import { stopHistorySnapshotTask } from '../../tasks/history_snapshot_task';
import { stopStatusReportTask } from '../../tasks/status_report_task';

jest.mock('./install_assets');
jest.mock('./euid_stored_scripts');
jest.mock('../../tasks/extract_entity_task');
jest.mock('../../tasks/history_snapshot_task');
jest.mock('../../tasks/status_report_task');

const mockUninstallElasticsearchAssets = uninstallElasticsearchAssets as jest.MockedFunction<
  typeof uninstallElasticsearchAssets
>;
const mockDeleteEuidStoredScripts = deleteEuidStoredScripts as jest.MockedFunction<
  typeof deleteEuidStoredScripts
>;
const mockStopExtractEntityTask = stopExtractEntityTask as jest.MockedFunction<
  typeof stopExtractEntityTask
>;
const mockStopHistorySnapshotTask = stopHistorySnapshotTask as jest.MockedFunction<
  typeof stopHistorySnapshotTask
>;
const mockStopStatusReportTask = stopStatusReportTask as jest.MockedFunction<
  typeof stopStatusReportTask
>;

describe('AssetManagerClient', () => {
  const namespace = 'default';

  let client: AssetManagerClient;
  let mockEngineDescriptorClient: {
    getAll: jest.Mock;
    init: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockGlobalStateClient: {
    init: jest.Mock;
    findOrThrow: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUninstallElasticsearchAssets.mockResolvedValue(undefined);
    mockDeleteEuidStoredScripts.mockResolvedValue(undefined);
    mockStopExtractEntityTask.mockResolvedValue(undefined);
    mockStopHistorySnapshotTask.mockResolvedValue(undefined);
    mockStopStatusReportTask.mockResolvedValue(undefined);

    mockEngineDescriptorClient = {
      getAll: jest.fn().mockResolvedValue([]),
      init: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    mockGlobalStateClient = {
      init: jest.fn().mockResolvedValue(undefined),
      findOrThrow: jest.fn().mockResolvedValue({
        historySnapshot: {},
        logsExtraction: {},
      }),
      find: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    client = new AssetManagerClient({
      logger: loggerMock.create(),
      esClient: {} as jest.Mocked<ElasticsearchClient>,
      taskManager: {} as jest.Mocked<TaskManagerStartContract>,
      engineDescriptorClient:
        mockEngineDescriptorClient as unknown as import('../saved_objects').EngineDescriptorClient,
      globalStateClient:
        mockGlobalStateClient as unknown as import('../saved_objects').EntityStoreGlobalStateClient,
      ccsLogExtractionStateClient: {
        delete: jest.fn().mockResolvedValue(undefined),
      } as unknown as import('../saved_objects/ccs_log_extraction_state').CcsLogExtractionStateClient,
      namespace,
      isServerless: false,
      logsExtractionClient: {} as unknown as import('../logs_extraction').LogsExtractionClient,
      security: {} as SecurityPluginStart,
      analytics: {
        reportEvent: jest.fn(),
      } as unknown as import('../../telemetry/events').TelemetryReporter,
      savedObjectsClient: {} as SavedObjectsClientContract,
    });
  });

  describe('uninstall', () => {
    // getAll is called twice in uninstall: once via getStatus (before delete) and once
    // to compute remainingEngines (after delete). Sequence the mock accordingly.
    it('keeps shared assets when other engines remain (see: https://github.com/elastic/security-team/issues/18143)', async () => {
      mockEngineDescriptorClient.getAll
        .mockResolvedValueOnce([
          { type: 'host', status: 'started' },
          { type: 'user', status: 'started' },
        ])
        .mockResolvedValueOnce([{ type: 'user', status: 'started' }]);

      const result = await client.uninstall('host');

      expect(result).toBe(true);
      expect(mockEngineDescriptorClient.delete).toHaveBeenCalledWith('host');
      // Shared, per-namespace / cluster assets must survive.
      expect(mockUninstallElasticsearchAssets).not.toHaveBeenCalled();
      expect(mockDeleteEuidStoredScripts).not.toHaveBeenCalled();
      expect(mockGlobalStateClient.delete).not.toHaveBeenCalled();
      expect(mockStopStatusReportTask).not.toHaveBeenCalled();
      expect(mockStopHistorySnapshotTask).not.toHaveBeenCalled();
    });

    it('deletes shared assets when the last engine is uninstalled', async () => {
      mockEngineDescriptorClient.getAll
        .mockResolvedValueOnce([{ type: 'host', status: 'started' }])
        .mockResolvedValueOnce([]);

      const result = await client.uninstall('host');

      expect(result).toBe(true);
      expect(mockEngineDescriptorClient.delete).toHaveBeenCalledWith('host');
      expect(mockUninstallElasticsearchAssets).toHaveBeenCalledTimes(1);
      expect(mockDeleteEuidStoredScripts).toHaveBeenCalledTimes(1);
      expect(mockGlobalStateClient.delete).toHaveBeenCalledTimes(1);
      expect(mockStopStatusReportTask).toHaveBeenCalledTimes(1);
      expect(mockStopHistorySnapshotTask).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when the type is not installed', async () => {
      mockEngineDescriptorClient.getAll.mockResolvedValueOnce([
        { type: 'user', status: 'started' },
      ]);

      const result = await client.uninstall('host');

      expect(result).toBe(false);
      expect(mockEngineDescriptorClient.delete).not.toHaveBeenCalled();
      expect(mockUninstallElasticsearchAssets).not.toHaveBeenCalled();
      expect(mockDeleteEuidStoredScripts).not.toHaveBeenCalled();
    });
  });
});
