/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addTransactionLabels } from '@kbn/apm-utils';
import type { CoreSetup, LoggerFactory } from '@kbn/core/server';
import {
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
import {
  CompositeSloSummaryTask,
  getCompositeSloSummaryTaskId,
  TYPE,
} from './composite_slo_summary_task';
import { computeAndPersistCompositeSummaries } from './compute_and_persist_composite_summaries';
import { COMPOSITE_SLO_SUMMARY_TASK_SKIP_REASON } from './constants';

jest.mock('@kbn/apm-utils', () => ({
  addTransactionLabels: jest.fn(),
}));

jest.mock('./compute_and_persist_composite_summaries', () => ({
  computeAndPersistCompositeSummaries: jest.fn().mockResolvedValue(undefined),
}));

const addTransactionLabelsMock = addTransactionLabels as jest.MockedFunction<
  typeof addTransactionLabels
>;
const mockPersist = computeAndPersistCompositeSummaries as jest.MockedFunction<
  typeof computeAndPersistCompositeSummaries
>;

function createConcreteTaskInstanceStub(id: string): ConcreteTaskInstance {
  const now = new Date('2024-01-01T00:00:00.000Z');
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
}

function createStartPlugins(): SLOPluginStartDependencies {
  return {
    licensing: {
      getLicense: jest.fn().mockResolvedValue({ hasAtLeast: jest.fn().mockReturnValue(true) }),
    },
    taskManager: taskManagerMock.createStart(),
  } as unknown as SLOPluginStartDependencies;
}

describe('CompositeSloSummaryTask', () => {
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let task: CompositeSloSummaryTask;

  const baseConfig = {
    sloOrphanSummaryCleanUpTaskEnabled: true,
    tempSummaryCleanupTaskEnabled: true,
    healthScanTaskEnabled: true,
    staleInstancesCleanupTaskEnabled: false,
    compositeSloSummaryTaskEnabled: true,
    enabled: true,
    experimental: {
      ruleFormV2: { enabled: false },
    },
  } satisfies SLOConfig;

  function createTask(options?: { compositeSloEnabled?: boolean }): CompositeSloSummaryTask {
    coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asInternalUser: elasticsearchServiceMock.createClusterClient().asInternalUser,
          },
        },
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue(savedObjectsRepositoryMock.create()),
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(options?.compositeSloEnabled ?? true),
        },
      } as never,
      {} as never,
      {} as never,
    ]);

    return new CompositeSloSummaryTask({
      core: coreSetup as CoreSetup,
      config: baseConfig,
      taskManager: taskManagerMock.createSetup(),
      logFactory: loggingSystemMock.create() as unknown as LoggerFactory,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockPersist.mockResolvedValue(undefined);
    task = createTask();
  });

  describe('runTask APM labels', () => {
    it('labels skipped when task was never started', async () => {
      await task.runTask(
        createConcreteTaskInstanceStub(getCompositeSloSummaryTaskId()),
        coreSetup as CoreSetup,
        new AbortController()
      );

      expect(addTransactionLabelsMock).toHaveBeenCalledWith({
        plugin: 'slo',
        composite_slo_summary_run_outcome: 'skipped',
        composite_slo_summary_skip_reason: COMPOSITE_SLO_SUMMARY_TASK_SKIP_REASON.TASK_NOT_STARTED,
      });
      expect(mockPersist).not.toHaveBeenCalled();
    });

    it('labels skipped outdated_task_version when task instance id does not match', async () => {
      await task.start(createStartPlugins());

      await task.runTask(
        createConcreteTaskInstanceStub('stale-task-instance-id'),
        coreSetup as CoreSetup,
        new AbortController()
      );

      expect(addTransactionLabelsMock).toHaveBeenCalledWith({
        plugin: 'slo',
        composite_slo_summary_run_outcome: 'skipped',
        composite_slo_summary_skip_reason:
          COMPOSITE_SLO_SUMMARY_TASK_SKIP_REASON.OUTDATED_TASK_VERSION,
      });
      expect(mockPersist).not.toHaveBeenCalled();
    });

    it('runs computeAndPersistCompositeSummaries when started and id matches', async () => {
      await task.start(createStartPlugins());

      await task.runTask(
        createConcreteTaskInstanceStub(getCompositeSloSummaryTaskId()),
        coreSetup as CoreSetup,
        new AbortController()
      );

      expect(mockPersist).toHaveBeenCalledTimes(1);
    });

    it('skips computeAndPersistCompositeSummaries when composite SLO feature flag is disabled', async () => {
      task = createTask({ compositeSloEnabled: false });
      await task.start(createStartPlugins());

      await task.runTask(
        createConcreteTaskInstanceStub(getCompositeSloSummaryTaskId()),
        coreSetup as CoreSetup,
        new AbortController()
      );

      expect(mockPersist).not.toHaveBeenCalled();
    });
  });
});
