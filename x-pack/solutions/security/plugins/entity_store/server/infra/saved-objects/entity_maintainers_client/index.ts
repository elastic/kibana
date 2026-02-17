/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './constants';
export * from './types';

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import type { EntityMaintainerTaskEntry } from './constants';
import { EntityMaintainerTaskEntry as EntityMaintainerTaskEntrySchema } from './constants';
import { EntityMaintainersTasksTypeName, EntityMaintainersTasksId } from './types';

const ENTITY_MAINTAINERS_TASKS_ATTR = 'entity-maintainers-tasks' as const;

type EntityMaintainersTasksAttributes = Record<
  typeof ENTITY_MAINTAINERS_TASKS_ATTR,
  EntityMaintainerTaskEntry[]
>;

export class EntityMaintainersTasksClient {
  constructor(
    private readonly repository: ISavedObjectsRepository,
    private readonly logger: Logger
  ) {}

  async getAll(): Promise<EntityMaintainerTaskEntry[]> {
    try {
      const doc = await this.repository.get<EntityMaintainersTasksAttributes>(
        EntityMaintainersTasksTypeName,
        EntityMaintainersTasksId
      );
      const raw = doc.attributes[ENTITY_MAINTAINERS_TASKS_ATTR] ?? [];
      return raw.map((entry) => EntityMaintainerTaskEntrySchema.parse(entry));
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return [];
      }
      this.logger.error(`Failed to get entity maintainer tasks: ${err?.message}`);
      throw err;
    }
  }

  async addOrUpdate(entry: EntityMaintainerTaskEntry): Promise<void> {
    const taskEntry = EntityMaintainerTaskEntrySchema.parse(entry);
    try {
      const existing = await this.repository.get<EntityMaintainersTasksAttributes>(
        EntityMaintainersTasksTypeName,
        EntityMaintainersTasksId
      );
      
      const tasks = existing.attributes[ENTITY_MAINTAINERS_TASKS_ATTR] ?? [];
      this.logger.debug(`Tasks registered: ${JSON.stringify(tasks)}`);
      const filtered = tasks.filter((t) => t.id !== taskEntry.id);
      await this.repository.update(EntityMaintainersTasksTypeName, EntityMaintainersTasksId, {
        [ENTITY_MAINTAINERS_TASKS_ATTR]: [...filtered, taskEntry],
      });
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        await this.create(taskEntry);
        return;
      }
      this.logger.error(
        `Failed to register entity maintainer task in saved object: ${err?.message}`
      );
      throw err;
    }
  }

  private async create(entry: EntityMaintainerTaskEntry): Promise<void> {
    this.logger.debug(`Creating entity maintainers tasks document with first entry`);
    await this.repository.create(
      EntityMaintainersTasksTypeName,
      { [ENTITY_MAINTAINERS_TASKS_ATTR]: [entry] },
      { id: EntityMaintainersTasksId }
    );
  }
}
