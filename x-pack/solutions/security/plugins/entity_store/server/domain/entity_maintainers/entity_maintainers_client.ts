/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { SavedObjectsErrorHelpers, type KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LicenseType } from '@kbn/licensing-types';
import {
  getTaskId,
  removeEntityMaintainer,
  scheduleEntityMaintainerTask,
  startEntityMaintainer,
  stopEntityMaintainer,
} from '../../tasks/entity_maintainers';
import { entityMaintainersRegistry } from '../../tasks/entity_maintainers/entity_maintainers_registry';
import type { EntityMaintainerState } from '../../tasks/entity_maintainers/types';
import { EntityMaintainerTaskStatus } from '../../tasks/entity_maintainers/types';
import type { TelemetryReporter } from '../../telemetry/events';

interface TaskSnapshot {
  runs: number;
  lastSuccessTimestamp: string | null;
  lastErrorTimestamp: string | null;
  state: EntityMaintainerState;
}

export interface EntityMaintainerListEntry {
  id: string;
  taskStatus: EntityMaintainerTaskStatus;
  interval: string;
  description?: string;
  nextRunAt: string | null;
  minLicense: LicenseType;
  taskSnapshot?: TaskSnapshot;
}

interface EntityMaintainersClientDeps {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  namespace: string;
  analytics: TelemetryReporter;
}

export class EntityMaintainersClient {
  private readonly logger: Logger;
  private readonly taskManager: TaskManagerStartContract;
  private readonly namespace: string;
  private readonly analytics: TelemetryReporter;

  constructor(deps: EntityMaintainersClientDeps) {
    this.logger = deps.logger;
    this.taskManager = deps.taskManager;
    this.namespace = deps.namespace;
    this.analytics = deps.analytics;
  }

  public async start(id: string, request: KibanaRequest): Promise<void> {
    if (!entityMaintainersRegistry.hasId(id)) {
      return;
    }
    this.logger.debug(`Starting entity maintainer task: ${id}`);
    try {
      await startEntityMaintainer({
        taskManager: this.taskManager,
        id,
        namespace: this.namespace,
        logger: this.logger,
        request,
        analytics: this.analytics,
      });
    } catch (error) {
      this.logger.error(`Failed to start entity maintainer task: ${id}`, { error });
      throw error;
    }
  }

  /**
   * Schedules only maintainers that do not yet have a task document (taskSnapshot undefined).
   * Uses getMaintainers() to determine which registry entries already have tasks.
   */
  public async init(request: KibanaRequest): Promise<void> {
    this.logger.debug('Initializing entity maintainer tasks');
    try {
      const maintainers = await this.getMaintainers();
      const toSchedule = maintainers.filter((m) => m.taskSnapshot === undefined);
      await Promise.all(
        toSchedule.map(async ({ id, interval }) => {
          await scheduleEntityMaintainerTask({
            logger: this.logger,
            taskManager: this.taskManager,
            id,
            interval,
            namespace: this.namespace,
            request,
          });
        })
      );
    } catch (error) {
      this.logger.error('Failed to initialize entity maintainer tasks', { error });
      throw error;
    }
  }

  public async stop(id: string, request: KibanaRequest): Promise<void> {
    if (!entityMaintainersRegistry.hasId(id)) {
      return;
    }
    this.logger.debug(`Stopping entity maintainer task: ${id}`);
    try {
      await stopEntityMaintainer({
        taskManager: this.taskManager,
        id,
        request,
        namespace: this.namespace,
        logger: this.logger,
        analytics: this.analytics,
      });
    } catch (error) {
      this.logger.error(`Failed to stop entity maintainer task: ${id}`, { error });
      throw error;
    }
  }

  public async runNow(id: string): Promise<void> {
    try {
      if (!entityMaintainersRegistry.hasId(id)) {
        this.logger.debug(`Maintainer not found, skipping run now: ${id}`);
        return;
      }
      const taskId = getTaskId(id, this.namespace);
      await this.taskManager.runSoon(taskId);
    } catch (error) {
      this.logger.error(`Failed to run entity maintainer task: ${id}`, { error });
      throw error;
    }
  }

  public async removeAll(): Promise<void> {
    this.logger.debug('Removing all entity maintainer tasks');
    try {
      const tasks = entityMaintainersRegistry.getAll();
      await Promise.all(
        tasks.map(async ({ id }) => {
          await removeEntityMaintainer({
            taskManager: this.taskManager,
            id,
            namespace: this.namespace,
            logger: this.logger,
            analytics: this.analytics,
          });
        })
      );
    } catch (error) {
      this.logger.error('Failed to remove all entity maintainer tasks', { error });
      throw error;
    }
  }

  public async getMaintainers(ids?: string[]): Promise<EntityMaintainerListEntry[]> {
    const entries = entityMaintainersRegistry.getAll();
    const filteredEntries = ids?.length ? entries.filter(({ id }) => ids.includes(id)) : entries;

    const results = await Promise.all(
      filteredEntries.map(async (entry): Promise<EntityMaintainerListEntry> => {
        const { id, interval, description, minLicense } = entry;
        const taskId = getTaskId(id, this.namespace);
        let taskSnapshot: TaskSnapshot | undefined;
        let nextRunAt: string | null = null;
        let taskStatus: EntityMaintainerTaskStatus = EntityMaintainerTaskStatus.NEVER_STARTED;

        try {
          const task = await this.taskManager.get(taskId);
          const { metadata, state, taskStatus: taskStatusFromState } = task.state;
          nextRunAt = task.runAt?.toISOString() ?? null;
          taskStatus = taskStatusFromState;
          const runs = metadata?.runs ?? 0;
          const lastSuccessTimestamp = metadata?.lastSuccessTimestamp ?? null;
          const lastErrorTimestamp = metadata?.lastErrorTimestamp ?? null;
          taskSnapshot = {
            runs,
            lastSuccessTimestamp,
            lastErrorTimestamp,
            state,
          };
        } catch (error) {
          // NotFound is part of the expected flow, it means the task has been registered but has not been scheduled yet.
          if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
            this.logger.error(`Failed to get task snapshot for entity maintainer: ${id}`, {
              error,
            });
            throw error;
          }
        }

        return {
          id,
          taskStatus,
          interval,
          description,
          nextRunAt,
          minLicense,
          taskSnapshot,
        };
      })
    );

    return results;
  }
}
