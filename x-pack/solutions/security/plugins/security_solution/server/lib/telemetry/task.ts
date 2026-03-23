/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Logger, LogMeta } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { ITelemetryReceiver } from './receiver';
import type { ITelemetryEventsSender } from './sender';
import type { ITaskMetricsService } from './task_metrics.types';
import { stateSchemaByVersion, emptyState, type LatestTaskStateSchema } from './task_state';
import { newTelemetryLogger, withErrorMessage } from './helpers';
import { type TelemetryLogger } from './telemetry_logger';

export interface SecurityTelemetryTaskConfig {
  type: string;
  title: string;
  interval: string;
  timeout: string;
  version: string;
  getLastExecutionTime?: LastExecutionTimestampCalculator;
  runTask: SecurityTelemetryTaskRunner;
}

export type SecurityTelemetryTaskRunner = (
  taskId: string,
  logger: Logger,
  receiver: ITelemetryReceiver,
  sender: ITelemetryEventsSender,
  taskMetricsService: ITaskMetricsService,
  taskExecutionPeriod: TaskExecutionPeriod
) => Promise<number>;

export interface TaskExecutionPeriod {
  last?: string;
  current: string;
}

export type LastExecutionTimestampCalculator = (
  executeTo: string,
  lastExecutionTimestamp?: string
) => string;

export class SecurityTelemetryTask {
  private readonly config: SecurityTelemetryTaskConfig;
  private readonly logger: TelemetryLogger;
  private readonly sender: ITelemetryEventsSender;
  private readonly receiver: ITelemetryReceiver;
  private readonly taskMetricsService: ITaskMetricsService;

  constructor(
    config: SecurityTelemetryTaskConfig,
    logger: Logger,
    sender: ITelemetryEventsSender,
    receiver: ITelemetryReceiver,
    taskMetricsService: ITaskMetricsService
  ) {
    this.config = config;
    this.logger = newTelemetryLogger(logger.get('task'));
    this.sender = sender;
    this.receiver = receiver;
    this.taskMetricsService = taskMetricsService;
  }

  public getLastExecutionTime = (
    taskExecutionTime: string,
    taskInstance: ConcreteTaskInstance
  ): string | undefined => {
    return this.config.getLastExecutionTime
      ? this.config.getLastExecutionTime(
          taskExecutionTime,
          taskInstance.state?.lastExecutionTimestamp
        )
      : undefined;
  };

  public getTaskId = (): string => {
    return `${this.config.type}:${this.config.version}`;
  };

  public register = (taskManager: TaskManagerSetupContract) => {
    taskManager.registerTaskDefinitions({
      [this.config.type]: {
        title: this.config.title,
        timeout: this.config.timeout,
        stateSchemaByVersion,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          const state = taskInstance.state as LatestTaskStateSchema;

          return {
            run: async () => {
              const taskExecutionTime = moment().utc().toISOString();
              const executionPeriod = {
                last: this.getLastExecutionTime(taskExecutionTime, taskInstance),
                current: taskExecutionTime,
              };

              const hits = await this.runTask(taskInstance.id, executionPeriod);

              const updatedState: LatestTaskStateSchema = {
                lastExecutionTimestamp: taskExecutionTime,
                runs: state.runs + 1,
                hits,
              };

              return {
                state: updatedState,
              };
            },
            cancel: async () => {},
          };
        },
      },
    });
  };

  public start = async (taskManager: TaskManagerStartContract) => {
    const taskId = this.getTaskId();
    this.logger.debug('Attempting to schedule task', { taskId } as LogMeta);
    try {
      await taskManager.ensureScheduled({
        id: taskId,
        taskType: this.config.type,
        scope: ['securitySolution'],
        schedule: {
          interval: this.config.interval,
        },
        state: emptyState,
        params: { version: this.config.version },
      });
    } catch (error) {
      this.logger.error('Error scheduling task', withErrorMessage(error));
    }
  };

  public runTask = async (taskId: string, executionPeriod: TaskExecutionPeriod) => {
    this.logger.debug('Attempting to run', { taskId } as LogMeta);
    if (taskId !== this.getTaskId()) {
      this.logger.info('outdated task', { taskId } as LogMeta);
      return 0;
    }

    const isOptedIn = await this.sender.isTelemetryOptedIn();
    if (!isOptedIn) {
      this.logger.info('Telemetry is not opted-in', { taskId } as LogMeta);
      return 0;
    }

    const isTelemetryServicesReachable = await this.sender.isTelemetryServicesReachable();
    if (!isTelemetryServicesReachable) {
      this.logger.info('Cannot reach telemetry services', { taskId } as LogMeta);
      return 0;
    }

    this.logger.debug('Running task', { taskId } as LogMeta);
    return this.config.runTask(
      taskId,
      this.logger,
      this.receiver,
      this.sender,
      this.taskMetricsService,
      executionPeriod
    );
  };
}
