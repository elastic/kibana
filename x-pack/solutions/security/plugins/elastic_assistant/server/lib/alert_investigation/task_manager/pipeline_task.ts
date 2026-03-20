/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract, IntervalSchedule } from '@kbn/task-manager-plugin/server';
import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { PipelineConfig, PipelineExecutionResult } from '../types';
import { DEFAULT_PIPELINE_CONFIG } from '../types';

export const PIPELINE_TASK_TYPE = 'security:alert-investigation-pipeline';
export const PIPELINE_TASK_ID_PREFIX = 'alert-investigation-pipeline';

export interface PipelineTaskState extends Record<string, unknown> {
  lastExecutionId: string | null;
  lastStatus: 'idle' | 'running' | 'completed' | 'failed';
  lastError: string | null;
  lastCompletedAt: string | null;
  consecutiveFailures: number;
  lastResult: PipelineExecutionResult | null;
}

export const DEFAULT_TASK_STATE: PipelineTaskState = {
  lastExecutionId: null,
  lastStatus: 'idle',
  lastError: null,
  lastCompletedAt: null,
  consecutiveFailures: 0,
  lastResult: null,
};

type PipelineRunFn = (params: {
  spaceId: string;
  config: PipelineConfig;
  esClient: ElasticsearchClient;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}) => Promise<PipelineExecutionResult>;

export const registerPipelineTaskType = ({
  taskManager,
  logger,
  runPipeline,
  getEsClient,
  getSavedObjectsClient,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  runPipeline: PipelineRunFn;
  getEsClient: () => Promise<ElasticsearchClient>;
  getSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
}): void => {
  taskManager.registerTaskDefinitions({
    [PIPELINE_TASK_TYPE]: {
      title: 'Alert Investigation Pipeline',
      description:
        'Periodically processes new security alerts through deduplication, entity extraction, case matching, and attack discovery',
      timeout: '10m',
      maxAttempts: 1,
      createTaskRunner: ({ taskInstance }) => ({
        run: async (): Promise<{ state: PipelineTaskState; schedule?: IntervalSchedule }> => {
          const { spaceId, config: configOverrides } =
            (taskInstance.params as { spaceId?: string; config?: Partial<PipelineConfig> }) ?? {};

          const resolvedSpaceId = spaceId ?? 'default';
          const config: PipelineConfig = {
            ...DEFAULT_PIPELINE_CONFIG,
            ...configOverrides,
          };

          const state = (taskInstance.state ?? DEFAULT_TASK_STATE) as PipelineTaskState;

          logger.info(
            `Pipeline task starting for space '${resolvedSpaceId}' (consecutive failures: ${state.consecutiveFailures})`
          );

          try {
            const esClient = await getEsClient();
            const savedObjectsClient = await getSavedObjectsClient();

            const result = await runPipeline({
              spaceId: resolvedSpaceId,
              config,
              esClient,
              logger,
              savedObjectsClient,
            });

            const newState: PipelineTaskState = {
              lastExecutionId: result.executionId,
              lastStatus: result.errors.length > 0 ? 'completed' : 'completed',
              lastError: result.errors.length > 0 ? result.errors.join('; ') : null,
              lastCompletedAt: result.completedAt,
              consecutiveFailures: 0,
              lastResult: result,
            };

            logger.info(
              `Pipeline task completed: ${result.alertsProcessed} alerts, ${result.casesMatched} matched, ${result.casesCreated} created`
            );

            return {
              state: newState,
              schedule: {
                interval: `${config.intervalMinutes}m`,
              } as IntervalSchedule,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Pipeline task failed: ${errorMessage}`);

            const newState: PipelineTaskState = {
              ...state,
              lastStatus: 'failed',
              lastError: errorMessage,
              consecutiveFailures: state.consecutiveFailures + 1,
              lastResult: null,
            };

            const backoffMinutes = Math.min(
              config.intervalMinutes * Math.pow(2, newState.consecutiveFailures),
              60
            );

            return {
              state: newState,
              schedule: {
                interval: `${backoffMinutes}m`,
              } as IntervalSchedule,
            };
          }
        },
      }),
    },
  });
};

export const getTaskIdForSpace = (spaceId: string): string =>
  `${PIPELINE_TASK_ID_PREFIX}:${spaceId}`;
