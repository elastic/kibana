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
import { LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT } from '../saved_objects/global_state/constants';
import {
  installSharedElasticsearchAssets,
  installIndicesAndDataStreams,
  uninstallElasticsearchAssets,
} from './install_assets';
import { installEuidStoredScripts, deleteEuidStoredScripts } from './euid_stored_scripts';
import { scheduleExtractEntityTask, stopExtractEntityTask } from '../../tasks/extract_entity_task';
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
    findOrThrow: jest.Mock;
  };
  let mockGlobalStateClient: {
    init: jest.Mock;
    findOrThrow: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
  };
  let mockLogsExtractionClient: {
    updateConfig: jest.Mock;
  };

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
      findOrThrow: jest.fn(),
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

    mockLogsExtractionClient = {
      updateConfig: jest.fn(),
    };

    client = new AssetManagerClient({
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
      logsExtractionClient:
        mockLogsExtractionClient as unknown as import('../logs_extraction').LogsExtractionClient,
      security: {} as SecurityPluginStart,
      analytics: {
        reportEvent: jest.fn(),
      } as unknown as import('../../telemetry/events').TelemetryReporter,
      savedObjectsClient: {} as SavedObjectsClientContract,
    });
  });

  const noOverride = { frequency: null, delay: null, lookbackPeriod: null };

  it('creates shared indices and data streams once during init', async () => {
    await client.init({} as KibanaRequest, ['host', 'user']);

    expect(mockInstallSharedElasticsearchAssets).toHaveBeenCalledTimes(1);
    expect(mockInstallIndicesAndDataStreams).not.toHaveBeenCalled();
    expect(mockEngineDescriptorClient.init).toHaveBeenCalledTimes(2);
    expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('host', noOverride);
    expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('user', noOverride);
    expect(mockScheduleExtractEntityTask).toHaveBeenCalledTimes(2);
  });

  it('does not recreate shared indices or data streams during per-type install', async () => {
    const installed = await client.install('host');

    expect(installed).toBe(true);
    expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('host', noOverride);
    expect(mockInstallIndicesAndDataStreams).not.toHaveBeenCalled();
    expect(mockEngineDescriptorClient.update).not.toHaveBeenCalled();
  });

  describe('default per-type cadence overrides', () => {
    it('schedules service and generic extraction tasks at their reduced default frequency', async () => {
      mockGlobalStateClient.find.mockResolvedValue(undefined);

      await client.init({} as KibanaRequest, ['service', 'generic']);

      // per-type overrides are seeded on the engine descriptor...
      expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('service', {
        frequency: '10m',
        delay: null,
        lookbackPeriod: null,
      });
      expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('generic', {
        frequency: '30m',
        delay: null,
        lookbackPeriod: null,
      });
      // ...while the shared global config is untouched, still at the system default
      expect(mockGlobalStateClient.init).toHaveBeenCalledWith(
        expect.objectContaining({ logsExtraction: expect.objectContaining({ frequency: '1m' }) })
      );
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'service', frequency: '10m' })
      );
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'generic', frequency: '30m' })
      );
    });

    it('schedules host and user extraction tasks at the global frequency (no default override)', async () => {
      mockGlobalStateClient.find.mockResolvedValue(undefined);

      await client.init({} as KibanaRequest, ['host', 'user']);

      expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('host', noOverride);
      expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('user', noOverride);
      expect(mockGlobalStateClient.init).toHaveBeenCalledWith(
        expect.objectContaining({ logsExtraction: expect.objectContaining({ frequency: '1m' }) })
      );
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'host', frequency: '1m' })
      );
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'user', frequency: '1m' })
      );
    });

    it('lets an explicitly supplied global frequency win over a type default', async () => {
      mockGlobalStateClient.find.mockResolvedValue(undefined);

      await client.init({} as KibanaRequest, ['service', 'host'], { frequency: '5m' });

      // an explicit frequency at install time is a deliberate request for the whole store;
      // it must not be silently overridden by service's built-in 10m default
      expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('service', noOverride);
      expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('host', noOverride);
      // the requested frequency is what actually gets persisted as the shared global config
      expect(mockGlobalStateClient.init).toHaveBeenCalledWith(
        expect.objectContaining({ logsExtraction: expect.objectContaining({ frequency: '5m' }) })
      );
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'service', frequency: '5m' })
      );
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'host', frequency: '5m' })
      );
    });

    it('still applies the type default when other (non-frequency) logExtraction params are supplied', async () => {
      mockGlobalStateClient.find.mockResolvedValue(undefined);

      await client.init({} as KibanaRequest, ['service'], { delay: '2m' });

      // frequency is untouched by the request, so the type default is still seeded...
      expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('service', {
        frequency: '10m',
        delay: null,
        lookbackPeriod: null,
      });
      // ...while the requested delay is populated on the shared global config as expected,
      // alongside the untouched system-default frequency
      expect(mockGlobalStateClient.init).toHaveBeenCalledWith(
        expect.objectContaining({
          logsExtraction: expect.objectContaining({ delay: '2m', frequency: '1m' }),
        })
      );
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'service', frequency: '10m' })
      );
    });
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

  describe('logsExtraction resolution on install', () => {
    const existingLogsExtraction = {
      additionalIndexPatterns: ['existing-*'],
      fieldHistoryLength: 99,
      lookbackPeriod: '12h',
      delay: '5m',
      docsLimit: 1234,
      maxLogsPerPage: 5678,
      timeout: '60s',
      frequency: '2m',
    };

    it('fresh install with no params applies defaults', async () => {
      mockGlobalStateClient.find.mockResolvedValue(undefined);

      await client.init({} as KibanaRequest, ['host']);

      expect(mockGlobalStateClient.init).toHaveBeenCalledWith(
        expect.objectContaining({
          logsExtraction: expect.objectContaining({
            additionalIndexPatterns: [],
            fieldHistoryLength: 10,
            lookbackPeriod: '3h',
            delay: '1m',
            frequency: '1m',
            docsLimit: 10000,
            maxLogsPerPage: LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT,
            timeout: '59s',
          }),
        })
      );
    });

    it('fresh install with params merges params with defaults', async () => {
      mockGlobalStateClient.find.mockResolvedValue(undefined);

      await client.init({} as KibanaRequest, ['host'], { delay: '2m', frequency: '1m' });

      expect(mockGlobalStateClient.init).toHaveBeenCalledWith(
        expect.objectContaining({
          logsExtraction: expect.objectContaining({
            delay: '2m',
            frequency: '1m',
            lookbackPeriod: '3h',
            fieldHistoryLength: 10,
            additionalIndexPatterns: [],
            docsLimit: 10000,
            maxLogsPerPage: LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT,
          }),
        })
      );
    });

    it('re-install with no params preserves existing config', async () => {
      mockGlobalStateClient.find.mockResolvedValue({
        historySnapshot: {},
        logsExtraction: existingLogsExtraction,
      });

      await client.init({} as KibanaRequest, ['host']);

      expect(mockGlobalStateClient.init).toHaveBeenCalledWith(
        expect.objectContaining({ logsExtraction: existingLogsExtraction })
      );
    });

    it('re-install with empty params object preserves existing config', async () => {
      mockGlobalStateClient.find.mockResolvedValue({
        historySnapshot: {},
        logsExtraction: existingLogsExtraction,
      });

      await client.init({} as KibanaRequest, ['host'], {});

      expect(mockGlobalStateClient.init).toHaveBeenCalledWith(
        expect.objectContaining({ logsExtraction: existingLogsExtraction })
      );
    });

    it('re-install with params overwrites existing config with parsed params', async () => {
      mockGlobalStateClient.find.mockResolvedValue({
        historySnapshot: {},
        logsExtraction: existingLogsExtraction,
      });

      await client.init({} as KibanaRequest, ['host'], { delay: '2m' });

      expect(mockGlobalStateClient.init).toHaveBeenCalledWith(
        expect.objectContaining({
          logsExtraction: expect.objectContaining({
            delay: '2m',
            frequency: '1m',
            lookbackPeriod: '3h',
            fieldHistoryLength: 10,
            additionalIndexPatterns: [],
            docsLimit: 10000,
            maxLogsPerPage: LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT,
          }),
        })
      );
    });
  });

  describe('installByType', () => {
    it('bootstraps the whole store scoped to this type when the store is not installed', async () => {
      mockEngineDescriptorClient.getAll.mockResolvedValue([]);

      const installed = await client.installByType({} as KibanaRequest, 'service');

      expect(installed).toBe(true);
      // shared, store-wide resources are bootstrapped, same as POST /install
      expect(mockInstallSharedElasticsearchAssets).toHaveBeenCalledTimes(1);
      expect(mockGlobalStateClient.init).toHaveBeenCalledTimes(1);
      expect(mockScheduleHistorySnapshotTasks).toHaveBeenCalledTimes(1);
      expect(mockScheduleStatusReportTask).toHaveBeenCalledTimes(1);
      // but only the requested type is installed
      expect(mockEngineDescriptorClient.init).toHaveBeenCalledTimes(1);
      expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('service', {
        frequency: '10m',
        delay: null,
        lookbackPeriod: null,
      });
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledTimes(1);
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'service', frequency: '10m' })
      );
    });

    it('applies a caller-supplied cadence override on top of the bootstrap install', async () => {
      mockEngineDescriptorClient.getAll.mockResolvedValue([]);
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue({
        type: 'service',
        status: 'started',
        logExtractionOverrides: { frequency: '10m', delay: null, lookbackPeriod: null },
      });

      const installed = await client.installByType({} as KibanaRequest, 'service', {
        frequency: '5m',
      });

      expect(installed).toBe(true);
      expect(mockInstallSharedElasticsearchAssets).toHaveBeenCalledTimes(1);
      // bootstrap seeds the type default first...
      expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('service', {
        frequency: '10m',
        delay: null,
        lookbackPeriod: null,
      });
      // ...then the caller's override is applied and the task rescheduled accordingly
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('service', {
        logExtractionOverrides: { frequency: '5m', delay: null, lookbackPeriod: null },
      });
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'service', frequency: '5m' })
      );
    });

    it('does not call updateByType when no cadence override is supplied during bootstrap', async () => {
      mockEngineDescriptorClient.getAll.mockResolvedValue([]);

      await client.installByType({} as KibanaRequest, 'service');

      // findOrThrow / a logExtractionOverrides update are only used by updateByType;
      // `start` still calls `update` separately to flip status to STARTED.
      expect(mockEngineDescriptorClient.findOrThrow).not.toHaveBeenCalled();
      expect(mockEngineDescriptorClient.update).not.toHaveBeenCalledWith(
        'service',
        expect.objectContaining({ logExtractionOverrides: expect.anything() })
      );
    });

    it('adds a new type to an already-installed store at its built-in default cadence', async () => {
      mockEngineDescriptorClient.getAll.mockResolvedValue([
        { type: 'host', status: 'started', logExtractionOverrides: noOverride },
      ]);

      const installed = await client.installByType({} as KibanaRequest, 'service');

      expect(installed).toBe(true);
      // no shared-resource bootstrap needed — the store is already installed
      expect(mockInstallSharedElasticsearchAssets).not.toHaveBeenCalled();
      expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('service', {
        frequency: '10m',
        delay: null,
        lookbackPeriod: null,
      });
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'service', frequency: '10m' })
      );
    });

    it('lets a caller-supplied cadence override win over the type default when added to an existing store', async () => {
      mockEngineDescriptorClient.getAll.mockResolvedValue([
        { type: 'host', status: 'started', logExtractionOverrides: noOverride },
      ]);

      await client.installByType({} as KibanaRequest, 'service', { frequency: '5m' });

      expect(mockEngineDescriptorClient.init).toHaveBeenCalledWith('service', {
        frequency: '5m',
        delay: null,
        lookbackPeriod: null,
      });
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'service', frequency: '5m' })
      );
    });

    it('is idempotent when the type is already installed', async () => {
      mockEngineDescriptorClient.getAll.mockResolvedValue([
        { type: 'service', status: 'started', logExtractionOverrides: { frequency: '10m' } },
      ]);

      const installed = await client.installByType({} as KibanaRequest, 'service');

      expect(installed).toBe(false);
      expect(mockEngineDescriptorClient.init).not.toHaveBeenCalled();
      expect(mockScheduleExtractEntityTask).not.toHaveBeenCalled();
    });
  });

  describe('updateByType', () => {
    const buildEngine = (overrides: Partial<Record<string, unknown>> = {}) => ({
      type: 'service',
      status: 'started',
      logExtractionOverrides: noOverride,
      ...overrides,
    });

    it('propagates a not-found error when the type is not installed', async () => {
      const notFoundError = new Error('not found');
      mockEngineDescriptorClient.findOrThrow.mockRejectedValue(notFoundError);

      await expect(
        client.updateByType({} as KibanaRequest, 'service', { frequency: '5m' })
      ).rejects.toThrow(notFoundError);
      expect(mockEngineDescriptorClient.update).not.toHaveBeenCalled();
    });

    it('persists the merged override and reschedules when frequency changes on a started engine', async () => {
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(buildEngine());

      const result = await client.updateByType({} as KibanaRequest, 'service', {
        frequency: '15m',
      });

      expect(result).toEqual({ frequency: '15m', delay: null, lookbackPeriod: null });
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('service', {
        logExtractionOverrides: { frequency: '15m', delay: null, lookbackPeriod: null },
      });
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'service', frequency: '15m' })
      );
    });

    it('does not reschedule when only delay/lookbackPeriod change', async () => {
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(buildEngine());

      await client.updateByType({} as KibanaRequest, 'service', { delay: '2m' });

      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('service', {
        logExtractionOverrides: { frequency: null, delay: '2m', lookbackPeriod: null },
      });
      expect(mockScheduleExtractEntityTask).not.toHaveBeenCalled();
    });

    it('does not reschedule when the engine is stopped, even if frequency changes', async () => {
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(buildEngine({ status: 'stopped' }));

      await client.updateByType({} as KibanaRequest, 'service', { frequency: '15m' });

      expect(mockEngineDescriptorClient.update).toHaveBeenCalled();
      expect(mockScheduleExtractEntityTask).not.toHaveBeenCalled();
    });

    it('allows setting a value equal to the global default explicitly (not a clear)', async () => {
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        buildEngine({
          logExtractionOverrides: { frequency: '10m', delay: null, lookbackPeriod: null },
        })
      );
      mockGlobalStateClient.find.mockResolvedValue({
        historySnapshot: {},
        logsExtraction: { frequency: '1m' },
      });

      const result = await client.updateByType({} as KibanaRequest, 'service', {
        frequency: '1m',
      });

      // the override is still set (to '1m'), it is not cleared/removed
      expect(result).toEqual({ frequency: '1m', delay: null, lookbackPeriod: null });
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('service', {
        logExtractionOverrides: { frequency: '1m', delay: null, lookbackPeriod: null },
      });
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'service', frequency: '1m' })
      );
    });

    it('leaves untouched override fields as-is', async () => {
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        buildEngine({
          logExtractionOverrides: { frequency: '10m', delay: '3m', lookbackPeriod: null },
        })
      );

      await client.updateByType({} as KibanaRequest, 'service', { lookbackPeriod: '6h' });

      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('service', {
        logExtractionOverrides: { frequency: '10m', delay: '3m', lookbackPeriod: '6h' },
      });
    });
  });

  describe('updateGlobalLogExtraction', () => {
    it('updates the global config and returns it', async () => {
      const updatedConfig = { frequency: '5m' };
      mockLogsExtractionClient.updateConfig.mockResolvedValue(updatedConfig);
      mockEngineDescriptorClient.getAll.mockResolvedValue([]);

      const result = await client.updateGlobalLogExtraction({} as KibanaRequest, {
        frequency: '5m',
      });

      expect(result).toBe(updatedConfig);
      expect(mockLogsExtractionClient.updateConfig).toHaveBeenCalledWith({ frequency: '5m' });
    });

    it('does not touch per-type overrides when no cadence field is explicit', async () => {
      mockLogsExtractionClient.updateConfig.mockResolvedValue({ fieldHistoryLength: 20 });

      await client.updateGlobalLogExtraction({} as KibanaRequest, { fieldHistoryLength: 20 });

      expect(mockEngineDescriptorClient.getAll).not.toHaveBeenCalled();
      expect(mockEngineDescriptorClient.update).not.toHaveBeenCalled();
      expect(mockScheduleExtractEntityTask).not.toHaveBeenCalled();
    });

    it('clears the frequency override on every type that has one, and reschedules started types', async () => {
      mockLogsExtractionClient.updateConfig.mockResolvedValue({ frequency: '5m' });
      mockEngineDescriptorClient.getAll.mockResolvedValue([
        {
          type: 'service',
          status: 'started',
          logExtractionOverrides: { frequency: '10m', delay: null, lookbackPeriod: null },
        },
        {
          type: 'generic',
          status: 'stopped',
          logExtractionOverrides: { frequency: '30m', delay: null, lookbackPeriod: null },
        },
        { type: 'host', status: 'started', logExtractionOverrides: noOverride },
      ]);

      await client.updateGlobalLogExtraction({} as KibanaRequest, { frequency: '5m' });

      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('service', {
        logExtractionOverrides: { frequency: null, delay: null, lookbackPeriod: null },
      });
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('generic', {
        logExtractionOverrides: { frequency: null, delay: null, lookbackPeriod: null },
      });
      // host had no override to clear, so it's never touched
      expect(mockEngineDescriptorClient.update).not.toHaveBeenCalledWith('host', expect.anything());

      // only the started type (service) is rescheduled; generic is stopped
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledTimes(1);
      expect(mockScheduleExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'service', frequency: '5m' })
      );
    });

    it('does not clear delay/lookbackPeriod overrides when only frequency is explicit', async () => {
      mockLogsExtractionClient.updateConfig.mockResolvedValue({ frequency: '5m' });
      mockEngineDescriptorClient.getAll.mockResolvedValue([
        {
          type: 'service',
          status: 'started',
          logExtractionOverrides: { frequency: '10m', delay: '3m', lookbackPeriod: '6h' },
        },
      ]);

      await client.updateGlobalLogExtraction({} as KibanaRequest, { frequency: '5m' });

      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('service', {
        logExtractionOverrides: { frequency: null, delay: '3m', lookbackPeriod: '6h' },
      });
    });
  });
});
