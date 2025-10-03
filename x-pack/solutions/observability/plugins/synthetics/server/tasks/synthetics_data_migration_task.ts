/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server/plugin';
import type { SyntheticsServerSetup } from '../types';
import { MigrateLegacyAgentPolicies } from './migrate_legacy_agent_policies';

const TASK_TYPE = 'Synthetics:Data-Migration';
const DATA_MIGRATION_TASK_ID = `${TASK_TYPE}-single-instance`;

interface TaskState extends Record<string, unknown> {
  lastStartedAt: string;
}

export class SyntheticsDataMigrationTask {
  private readonly migrateLegacyAgentPolicies: MigrateLegacyAgentPolicies;
  constructor(
    public serverSetup: SyntheticsServerSetup,
    public taskManager: TaskManagerSetupContract
  ) {
    this.migrateLegacyAgentPolicies = new MigrateLegacyAgentPolicies(serverSetup);
    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Synthetics Data Migration Task',
        description: 'This task handles data migration for Synthetics monitors and configurations.',
        timeout: '5m',
        maxAttempts: 3,
        createTaskRunner: () => {
          return {
            run: async () => {
              return this.runTask();
            },
          };
        },
      },
    });
  }

  public async runTask(): Promise<{ state: TaskState; error?: Error }> {
    const startedAt = new Date();

    const taskState = {
      lastStartedAt: startedAt.toISOString(),
    };

    try {
      this.log('debug', 'Starting data migration task');

      await this.migrateLegacyAgentPolicies.run();

      this.log('debug', 'Data migration task completed successfully');
    } catch (error) {
      this.log('error', `Data migration task failed: ${error.message}`);
      return {
        error,
        state: taskState,
      };
    }

    return {
      state: taskState,
    };
  }

  private log = (level: 'info' | 'debug' | 'error', message: string) => {
    const logMessage = `[SyntheticsDataMigrationTask] ${message}`;
    switch (level) {
      case 'info':
        this.serverSetup.logger.info(logMessage);
        break;
      case 'debug':
        this.serverSetup.logger.debug(logMessage);
        break;
      case 'error':
        this.serverSetup.logger.error(logMessage);
        break;
    }
  };

  start = async () => {
    const {
      pluginsStart: { taskManager },
    } = this.serverSetup;

    this.log('debug', 'Scheduling data migration task');

    await taskManager.ensureScheduled({
      id: DATA_MIGRATION_TASK_ID,
      state: {},
      taskType: TASK_TYPE,
      params: {},
    });

    await taskManager.runSoon(DATA_MIGRATION_TASK_ID);

    this.log('debug', 'Data migration task scheduled and started successfully');
  };
}
