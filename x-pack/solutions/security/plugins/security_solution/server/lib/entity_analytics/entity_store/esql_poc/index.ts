/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ApiKeyManager } from '../auth/api_key';
import {
  removeEntityStoreESQLExecuteTask,
  startEntityStoreESQLExecuteTask,
} from './kibana_task_run_cycle';

export class EntityStoreESQLService {
  private namespace: string;
  private esClient: ElasticsearchClient;
  private soClient: SavedObjectsClientContract;
  private apiKeyGenerator: ApiKeyManager;
  private taskManager?: TaskManagerStartContract;
  private logger: Logger;

  constructor(
    namespace: string,
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    apiKeyGenerator: ApiKeyManager,
    logger: Logger,
    taskManager?: TaskManagerStartContract
  ) {
    this.namespace = namespace;
    this.esClient = esClient;
    this.soClient = soClient;
    this.apiKeyGenerator = apiKeyGenerator;
    this.taskManager = taskManager;
    this.logger = logger;
  }

  public async startTask() {
    if (!this.taskManager) {
      this.logger.warn(`[Entity Store ESQL] no task manager configured, skipping`);
      return;
    }

    await startEntityStoreESQLExecuteTask(this.namespace, this.taskManager, this.logger);
  }

  public async stopTask() {
    if (!this.taskManager) {
      this.logger.warn(`[Entity Store ESQL] no task manager configured, skipping`);
      return;
    }

    await removeEntityStoreESQLExecuteTask(this.namespace, this.taskManager, this.logger);
  }
}
