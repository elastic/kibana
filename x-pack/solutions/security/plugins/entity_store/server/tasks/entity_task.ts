/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { EntityStoreLogger } from '../infra/logging';
import { EntityType } from '../domain/definitions/constants';
import config from './config';
import { EntityStoreTaskType } from './constants';
import { EntityStoreTask } from './entity_store_task';

export class EntityTask extends EntityStoreTask {
    private readonly entityType: EntityType;

    constructor(logger: EntityStoreLogger, entityType: EntityType) {
        super(config[EntityStoreTaskType.Values.entity], logger);
        this.entityType = entityType;
    }

    static generate(logger: EntityStoreLogger, entityType: EntityType): EntityTask {
        return new EntityTask(logger, entityType);
    }

    public get name(): string {
        return `${this.config.type}:${this.entityType}`;
    }

    protected async run(taskInstance: ConcreteTaskInstance): Promise<{
        state: Record<string, unknown>;
    }> {
        const taskId = taskInstance.id;

        try {
            this.logger.info(`[task ${taskId}]: executing entity task`);
            return {
                state: {},
            };
        } catch (e) {
            this.logger.error(`[task ${taskId}]: error running task, received ${e.message}`);
            throw e;
        }
    }

    protected async cancel(): Promise<void> {
        // no-op
    }
}

export const entityTasks = {
    user: (logger: EntityStoreLogger) => EntityTask.generate(logger, EntityType.Values.user),
    host: (logger: EntityStoreLogger) => EntityTask.generate(logger, EntityType.Values.host),
    service: (logger: EntityStoreLogger) => EntityTask.generate(logger, EntityType.Values.service),
    generic: (logger: EntityStoreLogger) => EntityTask.generate(logger, EntityType.Values.generic),
};
