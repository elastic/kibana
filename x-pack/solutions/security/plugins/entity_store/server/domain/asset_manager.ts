/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import defaults from 'lodash/defaults';
import { getEntityDefinition } from './definitions/registry';
import type { EntityType } from './definitions/entity_schema';
import { scheduleExtractEntityTask, stopExtractEntityTask } from '../tasks/extract_entity_task';
import type { EntityStoreTaskConfig } from '../tasks/config';
import { TasksConfig } from '../tasks/config';
import { EntityStoreTaskType } from '../tasks/constants';
import { installElasticsearchAssets, uninstallElasticsearchAssets } from './assets/install_assets';

export class AssetManager {
  constructor(
    private logger: Logger,
    private esClient: ElasticsearchClient,
    private taskManager: TaskManagerStartContract
  ) {}

  public async init(type: EntityType, logExtractionFrequency?: string) {
    await this.install(type); // TODO: async
    await this.start(type, logExtractionFrequency);
  }

  public async start(type: EntityType, logExtractionFrequency?: string) {
    this.logger.debug(`Scheduling extract entity task for type: ${type}`);

    const task: EntityStoreTaskConfig = defaults(
      {},
      TasksConfig[EntityStoreTaskType.Values.extractEntity],
      { interval: logExtractionFrequency }
    );

    // TODO: if this fails, set status to failed
    await scheduleExtractEntityTask({
      logger: this.logger,
      taskManager: this.taskManager,
      type,
      task,
    });
  }
  public async stop(type: EntityType) {
    return await stopExtractEntityTask({
      taskManager: this.taskManager,
      logger: this.logger,
      type,
    });
  }

  public async install(type: EntityType) {
    // TODO: return early if already installed
    this.logger.debug(`Installing assets for entity type: ${type}`);
    const definition = getEntityDefinition({ type });

    await installElasticsearchAssets({
      esClient: this.esClient,
      logger: this.logger,
      definition,
      namespace: 'default',
    });
    this.logger.debug(`Installed definition: ${type}`);

    return definition;
  }

  public async uninstall(type: EntityType) {
    const definition = getEntityDefinition({ type });
    await this.stop(type);
    await uninstallElasticsearchAssets({
      esClient: this.esClient,
      logger: this.logger,
      definition,
      namespace: 'default',
    });

    this.logger.debug(`Uninstalled definition: ${type}`);
  }
}
