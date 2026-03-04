/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { SavedObjectsErrorHelpers, type KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
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
  taskSnapshot?: TaskSnapshot;
}

interface EntityMaintainersClientDeps {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  namespace: string;
}

export class EntityMaintainersClient {
  private readonly logger: Logger;
  private readonly taskManager: TaskManagerStartContract;
  private readonly namespace: string;

  constructor(deps: EntityMaintainersClientDeps) {
    this.logger = deps.logger;
    this.taskManager = deps.taskManager;
    this.namespace = deps.namespace;
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
      });
    } catch (error) {
      this.logger.error(`Failed to stop entity maintainer task: ${id}`, { error });
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
          });
        })
      );
    } catch (error) {
      this.logger.error('Failed to remove all entity maintainer tasks', { error });
      throw error;
    }
  }

  public async getMaintainers(): Promise<EntityMaintainerListEntry[]> {
    const entries = entityMaintainersRegistry.getAll();

    const results = await Promise.all(
      entries.map(async (entry): Promise<EntityMaintainerListEntry> => {
        const { id, interval, description } = entry;
        const taskId = getTaskId(id, this.namespace);
        let taskSnapshot: TaskSnapshot | undefined;
        let taskStatus: EntityMaintainerTaskStatus = EntityMaintainerTaskStatus.NOT_STARTED;

        try {
          const task = await this.taskManager.get(taskId);
          const { metadata, state, taskStatus: taskStatusFromState } = task.state;
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
          taskSnapshot,
        };
      })
    );

    return results;
  }
}
