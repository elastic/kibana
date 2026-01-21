/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { getEntityDefinition } from './definitions/registry';
import type { EntityType } from './definitions/entity_schema';
import { scheduleExtractEntityTask, stopExtractEntityTask } from '../tasks/extract_entity_task';
import { installElasticsearchAssets, uninstallElasticsearchAssets } from './assets/install_assets';
import type { ApiKeyManager } from '../infra/auth';

export class AssetManager {
  constructor(
    private logger: Logger,
    private esClient: ElasticsearchClient,
    private taskManager: TaskManagerStartContract,
    private namespace: string,
    private apiKeyManager?: ApiKeyManager
  ) {}

  public async init(type: EntityType, logExtractionFrequency?: string) {
    await this.install(type); // TODO: async
    await this.start(type, logExtractionFrequency);
  }

  public async start(type: EntityType, logExtractionFrequency?: string) {
    this.logger.get(type).debug(`Scheduling extract entity task for type: ${type}`);

    // TODO: if this fails, set status to failed
    await scheduleExtractEntityTask({
      logger: this.logger,
      taskManager: this.taskManager,
      type,
      frequency: logExtractionFrequency,
      namespace: this.namespace,
    });
  }

  public async stop(type: EntityType) {
    await stopExtractEntityTask({
      taskManager: this.taskManager,
      logger: this.logger,
      type,
      namespace: this.namespace,
    });
  }

  public async install(type: EntityType) {
    // TODO: return early if already installed
    this.logger.get(type).debug(`Installing assets for entity type: ${type}`);

    // Generate API key if dependencies are available
    await this.generateApiKey(type);

    const definition = getEntityDefinition({ type });

    await installElasticsearchAssets({
      esClient: this.esClient,
      logger: this.logger.get(type),
      definition,
      namespace: this.namespace,
    });
    this.logger.debug(`Installed definition: ${type}`);

    return definition;
  }

  public async uninstall(type: EntityType) {
    const definition = getEntityDefinition({ type });
    await this.stop(type);
    await uninstallElasticsearchAssets({
      esClient: this.esClient,
      logger: this.logger.get(type),
      definition,
      namespace: this.namespace,
    });

    this.logger.get(type).debug(`Uninstalled definition: ${type}`);
  }

  /**
   * Generates an API key for the entity store if API key manager is available.
   * This should be called during installation to ensure the API key exists for tasks.
   */
  public async generateApiKey(type: EntityType): Promise<void> {
    if (!this.apiKeyManager) {
      this.logger.debug('API key manager not available, skipping API key generation');
      return;
    }

    try {
      // Check if API key already exists
      const existingApiKey = await this.apiKeyManager.getApiKey();
      if (existingApiKey) {
        this.logger.debug('API key already exists, skipping generation');
        return;
      }

      // Generate new API key
      this.logger.info('Generating API key');
      await this.apiKeyManager.generate(type);
      this.logger.info('Successfully generated API key');
    } catch (error) {
      this.logger.error(`Failed to generate API key: ${error.message}`, error);
      throw error;
    }
  }
}
