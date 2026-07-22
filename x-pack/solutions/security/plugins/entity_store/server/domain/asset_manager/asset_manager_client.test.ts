/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { AssetManagerClient } from './asset_manager_client';
import {
  installSharedElasticsearchAssets,
  installIndicesAndDataStreams,
  uninstallElasticsearchAssets,
} from './install_assets';
import { installEuidStoredScripts, deleteEuidStoredScripts } from './euid_stored_scripts';
import {
  getExtractEntityTaskId,
  scheduleExtractEntityTask,
  stopExtractEntityTask,
} from '../../tasks/extract_entity_task';
import {
  scheduleHistorySnapshotTasks,
  stopHistorySnapshotTask,
} from '../../tasks/history_snapshot_task';
import { scheduleStatusReportTask, stopStatusReportTask } from '../../tasks/status_report_task';
import { stopAndRemoveV1, stopAndRemoveV1SharedTasks } from '../../infra/remove_v1';

jest.mock('./install_assets');
jest.mock('./euid_stored_scripts');
jest.mock('../../tasks/extract_entity_task');
jest.mock('../../tasks/history_snapshot_task');
jest.mock('../../tasks/status_report_task');
jest.mock('../../infra/remove_v1');

const mockInstallSharedElasticsearchAssets =
  installSharedElasticsearchAssets as jest.MockedFunction<typeof installSharedElasticsearchAssets>;
const mockInstallIndicesAndDataStreams = installIndicesAndDataStreams as jest.MockedFunction<
  typeof installIndicesAndDataStreams
>;
const mockUninstallElasticsearchAssets = uninstallElasticsearchAssets as jest.MockedFunction<
  typeof uninstallElasticsearchAssets
>;
const mockInstallEuidStoredScripts = installEuidStoredScripts as jest.MockedFunction<
  typeof installEuidStoredScripts
>;
const mockDeleteEuidStoredScripts = deleteEuidStoredScripts as jest.MockedFunction<
  typeof deleteEuidStoredScripts
>;
const mockScheduleExtractEntityTask = scheduleExtractEntityTask as jest.MockedFunction<
  typeof scheduleExtractEntityTask
>;
const mockStopExtractEntityTask = stopExtractEntityTask as jest.MockedFunction<
  typeof stopExtractEntityTask
>;
const mockScheduleHistorySnapshotTasks = scheduleHistorySnapshotTasks as jest.MockedFunction<
  typeof scheduleHistorySnapshotTasks
>;
const mockStopHistorySnapshotTask = stopHistorySnapshotTask as jest.MockedFunction<
  typeof stopHistorySnapshotTask
>;
const mockScheduleStatusReportTask = scheduleStatusReportTask as jest.MockedFunction<
  typeof scheduleStatusReportTask
>;
const mockStopStatusReportTask = stopStatusReportTask as jest.MockedFunction<
  typeof stopStatusReportTask
>;
const mockStopAndRemoveV1 = stopAndRemoveV1 as jest.MockedFunction<typeof stopAndRemoveV1>;
const mockStopAndRemoveV1SharedTasks = stopAndRemoveV1SharedTasks as jest.MockedFunction<
  typeof stopAndRemoveV1SharedTasks
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
  let mockTaskManager: { bulkUpdateSchedules: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstallSharedElasticsearchAssets.mockResolvedValue(undefined);
    mockInstallIndicesAndDataStreams.mockResolvedValue(undefined);
    mockUninstallElasticsearchAssets.mockResolvedValue(undefined);
    mockInstallEuidStoredScripts.mockResolvedValue(undefined);
    mockDeleteEuidStoredScripts.mockResolvedValue(undefined);
    mockScheduleExtractEntityTask.mockResolvedValue(undefined);
    mockStopExtractEntityTask.mockResolvedValue(undefined);
    mockScheduleHistorySnapshotTasks.mockResolvedValue(undefined);
    mockStopHistorySnapshotTask.mockResolvedValue(undefined);
    mockScheduleStatusReportTask.mockResolvedValue(undefined);
    mockStopStatusReportTask.mockResolvedValue(undefined);
    mockStopAndRemoveV1.mockResolvedValue(undefined);
    mockStopAndRemoveV1SharedTasks.mockResolvedValue(undefined);

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

    mockTaskManager = { bulkUpdateSchedules: jest.fn().mockResolvedValue(undefined) };

    client = new AssetManagerClient({
      logger: loggerMock.create(),
      esClient: {} as jest.Mocked<ElasticsearchClient>,
      taskManager: mockTaskManager as unknown as jest.Mocked<TaskManagerStartContract>,
      engineDescriptorClient:
        mockEngineDescriptorClient as unknown as import('../saved_objects').EngineDescriptorClient,
      globalStateClient:
        mockGlobalStateClient as unknown as import('../saved_objects').EntityStoreGlobalStateClient,
      remoteLogExtractionStateClient: {
        delete: jest.fn().mockResolvedValue(undefined),
      } as unknown as import('../saved_objects/remote_log_extraction_state').RemoteLogExtractionStateClient,
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

  it('creates shared indices and data streams once during init', async () => {
    await client.init({} as KibanaRequest, ['host', 'user']);

    expect(mockInstallSharedElasticsearchAssets).toHaveBeenCalledTimes(1);
    expect(mockInstallIndicesAndDataStreams).not.toHaveBeenCalled();
    expect(mockEngineDescriptorClient.init).toHaveBeenCalledTimes(2);
    expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('host');
    expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('user');
    expect(mockScheduleExtractEntityTask).toHaveBeenCalledTimes(2);
  });

  it('does not recreate shared indices or data streams during per-type install', async () => {
    const installed = await client.install('host');

    expect(installed).toBe(true);
    expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('host');
    expect(mockInstallIndicesAndDataStreams).not.toHaveBeenCalled();
    expect(mockEngineDescriptorClient.update).not.toHaveBeenCalled();
  });

  describe('getPrivileges', () => {
    let checkPrivilegesWithRequestMock: jest.Mock;
    let getLocalIndexPatternsMock: jest.Mock;
    let getPrivilegesClient: AssetManagerClient;

    beforeEach(() => {
      checkPrivilegesWithRequestMock = jest.fn().mockResolvedValue({});
      getLocalIndexPatternsMock = jest.fn();

      getPrivilegesClient = new AssetManagerClient({
        logger: loggerMock.create(),
        esClient: {} as jest.Mocked<ElasticsearchClient>,
        taskManager: {} as jest.Mocked<TaskManagerStartContract>,
        engineDescriptorClient:
          mockEngineDescriptorClient as unknown as import('../saved_objects').EngineDescriptorClient,
        globalStateClient:
          mockGlobalStateClient as unknown as import('../saved_objects').EntityStoreGlobalStateClient,
        remoteLogExtractionStateClient: {
          delete: jest.fn().mockResolvedValue(undefined),
        } as unknown as import('../saved_objects/remote_log_extraction_state').RemoteLogExtractionStateClient,
        namespace,
        isServerless: false,
        logsExtractionClient: {
          getLocalIndexPatterns: getLocalIndexPatternsMock,
        } as unknown as import('../logs_extraction').LogsExtractionClient,
        security: {
          authz: {
            checkPrivilegesDynamicallyWithRequest: jest
              .fn()
              .mockReturnValue(checkPrivilegesWithRequestMock),
            actions: {
              savedObject: {
                get: jest.fn().mockReturnValue('some-kibana-privilege'),
              },
            },
          },
        } as unknown as SecurityPluginStart,
        analytics: {
          reportEvent: jest.fn(),
        } as unknown as import('../../telemetry/events').TelemetryReporter,
        savedObjectsClient: {} as SavedObjectsClientContract,
      });
    });

    it('strips negative index patterns before forwarding to _has_privileges', async () => {
      getLocalIndexPatternsMock.mockResolvedValue([
        'logs-*',
        '-logs-cloud_security_posture.*',
        '.entities.entities-default',
        '-logs-excluded-*',
      ]);

      await getPrivilegesClient.getPrivileges({} as KibanaRequest);

      const [calledWith] = checkPrivilegesWithRequestMock.mock.calls[0];
      const indexKeys = Object.keys(calledWith.elasticsearch.index);

      expect(indexKeys.every((key) => !key.startsWith('-'))).toBe(true);
      expect(indexKeys).toContain('logs-*');
      expect(indexKeys).toContain('.entities.entities-default');
      expect(indexKeys).not.toContain('-logs-cloud_security_posture.*');
      expect(indexKeys).not.toContain('-logs-excluded-*');
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

  describe('log extraction on install', () => {
    it('forwards the provided input to global state for persistence', async () => {
      await client.init({} as KibanaRequest, ['host'], { delay: '2m', frequency: '5m' });

      expect(mockGlobalStateClient.init).toHaveBeenCalledWith(
        expect.objectContaining({ logsExtraction: { delay: '2m', frequency: '5m' } })
      );
    });

    it('schedules the extract task with the frequency from the persisted config', async () => {
      // start reads the resolved config back from global state — that single source drives the schedule.
      mockGlobalStateClient.findOrThrow.mockResolvedValue({
        historySnapshot: {},
        logsExtraction: { frequency: '7m' },
      });

      await client.init({} as KibanaRequest, ['host']);

      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'host', frequency: '7m' })
      );
    });
  });

  describe('rescheduleLogExtraction', () => {
    beforeEach(() => {
      jest.mocked(getExtractEntityTaskId).mockImplementation((type, ns) => `extract:${type}:${ns}`);
    });

    it('reschedules only the started engines to the configured frequency', async () => {
      mockEngineDescriptorClient.getAll.mockResolvedValue([
        { type: 'host', status: 'started' },
        { type: 'user', status: 'stopped' },
      ]);
      mockGlobalStateClient.findOrThrow.mockResolvedValue({
        historySnapshot: {},
        logsExtraction: { frequency: '7m' },
      });

      await client.rescheduleLogExtraction();

      expect(mockTaskManager.bulkUpdateSchedules).toHaveBeenCalledTimes(1);
      const [taskIds, schedule] = mockTaskManager.bulkUpdateSchedules.mock.calls[0];
      expect(schedule).toEqual({ interval: '7m' });
      expect(taskIds).toHaveLength(1);
      expect(taskIds[0]).toContain('host');
    });

    it('does nothing when there are no started engines', async () => {
      mockEngineDescriptorClient.getAll.mockResolvedValue([{ type: 'host', status: 'stopped' }]);

      await client.rescheduleLogExtraction();

      expect(mockTaskManager.bulkUpdateSchedules).not.toHaveBeenCalled();
    });
  });
});
