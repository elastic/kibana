/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import type { CoreSetup, LoggerFactory } from '@kbn/core/server';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { LockManagerService } from '@kbn/lock-manager';
import { LockAcquisitionError } from '@kbn/lock-manager';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import moment from 'moment';
import {
  getSLIIndexNamePrefix,
  getSLIRoutingPipelineName,
  LOCK_ID_RESOURCE_INSTALLER,
  SLO_RESOURCES_VERSION,
} from '../../../../common/constants';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
import { ResourcesReconcileTask, TYPE } from './resources_reconcile_task';

const mockInstall = jest.fn();
jest.mock('../../resource_installer', () => ({
  DefaultResourceInstaller: jest.fn().mockImplementation(() => ({
    install: mockInstall,
  })),
}));

const TASK_ID = `${TYPE}:1.0.0`;
const SLI_PIPELINE_ID = '.slo-observability.sli.pipeline-my-slo-1';

const config: SLOConfig = {
  sloOrphanSummaryCleanUpTaskEnabled: true,
  tempSummaryCleanupTaskEnabled: true,
  healthScanTaskEnabled: true,
  staleInstancesCleanupTaskEnabled: false,
  compositeSloSummaryTaskEnabled: true,
  sliIndexRounding: 'M',
  sliRetentionTaskEnabled: true,
  sliRetentionPeriod: moment.duration(180, 'days'),
  enabled: true,
  experimental: { ruleFormV2: { enabled: false } },
};

const createTaskInstance = (id: string = TASK_ID): ConcreteTaskInstance => {
  const now = new Date('2026-11-17T00:00:00.000Z');
  return {
    id,
    taskType: TYPE,
    params: {},
    state: {},
    scheduledAt: now,
    attempts: 0,
    status: TaskStatus.Running,
    runAt: now,
    startedAt: now,
    retryAt: null,
    ownerId: null,
  };
};

const createStartPlugins = (hasLicense: boolean = true) => {
  const taskManager = taskManagerMock.createStart();
  const plugins = {
    licensing: {
      getLicense: jest
        .fn()
        .mockResolvedValue({ hasAtLeast: jest.fn().mockReturnValue(hasLicense) }),
    },
    taskManager,
  } as unknown as SLOPluginStartDependencies;
  return { plugins, taskManager };
};

const unmigratedSliPipeline: IngestPipeline = {
  processors: [
    {
      date_index_name: {
        field: '@timestamp',
        index_name_prefix: getSLIIndexNamePrefix(SLO_RESOURCES_VERSION),
        date_rounding: 'd',
      },
    },
  ],
  _meta: { version: SLO_RESOURCES_VERSION },
};

describe('ResourcesReconcileTask', () => {
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let lockManager: jest.Mocked<Pick<LockManagerService, 'withLock'>>;
  let taskManagerSetup: ReturnType<typeof taskManagerMock.createSetup>;
  let task: ResourcesReconcileTask;

  const run = (taskInstance: ConcreteTaskInstance = createTaskInstance()) =>
    task.runTask(taskInstance, coreSetup as CoreSetup, new AbortController().signal);

  const perSloPipelinePuts = () =>
    esClient.ingest.putPipeline.mock.calls.filter(([{ id }]) =>
      id.startsWith('.slo-observability.sli.pipeline-')
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockInstall.mockResolvedValue(undefined);

    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.ingest.getPipeline.mockImplementation(async (params) => {
      const id = params?.id ?? '';
      if (id === '.slo-observability.sli.pipeline-*' || id === SLI_PIPELINE_ID) {
        return { [SLI_PIPELINE_ID]: unmigratedSliPipeline };
      }
      const routingId = getSLIRoutingPipelineName(SLO_RESOURCES_VERSION);
      if (id === routingId) {
        return {
          [routingId]: {
            _meta: { version: SLO_RESOURCES_VERSION, template_version: SLO_RESOURCES_VERSION },
          },
        };
      }
      return {};
    });

    coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([
      { elasticsearch: { client: { asInternalUser: esClient } } } as never,
      {} as never,
      {} as never,
    ]);

    lockManager = { withLock: jest.fn() };
    lockManager.withLock.mockImplementation((_lockId, callback) => callback());
    taskManagerSetup = taskManagerMock.createSetup();

    task = new ResourcesReconcileTask({
      core: coreSetup as CoreSetup,
      config,
      taskManager: taskManagerSetup,
      logFactory: loggingSystemMock.create() as unknown as LoggerFactory,
      lockManager,
    });
  });

  describe('start', () => {
    it('schedules the task every hour and runs it soon', async () => {
      const { plugins, taskManager } = createStartPlugins();

      await task.start(plugins);

      expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ id: TASK_ID, taskType: TYPE, schedule: { interval: '1h' } })
      );
      expect(taskManager.runSoon).toHaveBeenCalledWith(TASK_ID);
    });

    it('does not schedule the task without a platinum license', async () => {
      const { plugins, taskManager } = createStartPlugins(false);

      await task.start(plugins);

      expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
    });
  });

  describe('runTask', () => {
    beforeEach(async () => {
      await task.start(createStartPlugins().plugins);
    });

    it('deletes an outdated task instance', async () => {
      const result = await run(createTaskInstance(`${TYPE}:0.0.1`));

      expect(result).toEqual({ state: {}, shouldDeleteTask: true });
      expect(mockInstall).not.toHaveBeenCalled();
    });

    it('installs the resources under the lock, then migrates the SLI pipelines', async () => {
      const result = await run();

      expect(lockManager.withLock).toHaveBeenCalledWith(
        LOCK_ID_RESOURCE_INSTALLER,
        expect.any(Function)
      );
      expect(mockInstall).toHaveBeenCalledTimes(1);
      expect(perSloPipelinePuts()).toHaveLength(1);
      expect(mockInstall.mock.invocationCallOrder[0]).toBeLessThan(
        esClient.ingest.putPipeline.mock.invocationCallOrder[0]
      );
      expect(result?.state).toEqual(expect.objectContaining({ lastScanCandidates: 0 }));
    });

    it.each([
      [
        'the install fails',
        () => mockInstall.mockRejectedValue(new Error('health data stream failed')),
      ],
      [
        'another process holds the lock',
        () => lockManager.withLock.mockRejectedValue(new LockAcquisitionError('lock held')),
      ],
    ])('migrates the SLI pipelines when %s', async (_, arrange) => {
      arrange();

      await run();

      expect(perSloPipelinePuts()).toHaveLength(1);
    });
  });
});
