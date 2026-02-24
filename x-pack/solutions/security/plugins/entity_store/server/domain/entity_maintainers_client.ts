/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  scheduleEntityMaintainerTask,
  stopEntityMaintainer,
} from '../tasks/entity_maintainers';
import { entityMaintainersRegistry } from '../tasks/entity_maintainers/entity_maintainers_registry';
import { EntityMaintainerTaskStatus } from '../tasks/entity_maintainers/types';

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
      const { interval } = entityMaintainersRegistry.get(id)!;
      await scheduleEntityMaintainerTask({
        logger: this.logger,
        taskManager: this.taskManager,
        id,
        interval,
        namespace: this.namespace,
        request,
      });
      entityMaintainersRegistry.update(id, { taskStatus: EntityMaintainerTaskStatus.STARTED });
    } catch (error) {
      this.logger.error(`Failed to start entity maintainer task: ${id}`, { error });
      throw error;
    }
  }

  public async startAll(request: KibanaRequest): Promise<void> {
    this.logger.debug('Starting entity maintainer tasks');
    try {
      const tasks = entityMaintainersRegistry.getAll();
      await Promise.all(
        tasks.map(async ({ id, interval }) => {
          await scheduleEntityMaintainerTask({
            logger: this.logger,
            taskManager: this.taskManager,
            id,
            interval,
            namespace: this.namespace,
            request,
          });
          entityMaintainersRegistry.update(id, { taskStatus: EntityMaintainerTaskStatus.STARTED });
        })
      );
    } catch (error) {
      this.logger.error('Failed to start entity maintainer tasks', { error });
      throw error;
    }
  }

  public async stop(id: string): Promise<void> {
    if (!entityMaintainersRegistry.hasId(id)) {
      return;
    }
    this.logger.debug(`Stopping entity maintainer task: ${id}`);
    try {
      await stopEntityMaintainer({
        taskManager: this.taskManager,
        id,
        namespace: this.namespace,
        logger: this.logger,
      });
      entityMaintainersRegistry.update(id, { taskStatus: EntityMaintainerTaskStatus.STOPPED });
    } catch (error) {
      this.logger.error(`Failed to stop entity maintainer task: ${id}`, { error });
      throw error;
    }
  }
}
