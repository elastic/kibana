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
import type { EntityType, ManagedEntityDefinition } from './definitions/entity_schema';
import { scheduleExtractEntityTask, stopExtractEntityTask } from '../tasks/extract_entity_task';
import { installElasticsearchAssets, uninstallElasticsearchAssets } from './assets/install_assets';
import { EngineDescriptorClient, LogExtractionState } from './definitions/saved_objects';
import { LogExtractionBodyParams } from '../routes/constants';

interface AssetManagerDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  taskManager: TaskManagerStartContract;
  engineDescriptorClient: EngineDescriptorClient;
  namespace: string;
}

export class AssetManager {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly taskManager: TaskManagerStartContract;
  private readonly engineDescriptorClient: EngineDescriptorClient;
  private readonly namespace: string;

  constructor(deps: AssetManagerDependencies) {
    this.logger = deps.logger;
    this.esClient = deps.esClient;
    this.taskManager = deps.taskManager;
    this.engineDescriptorClient = deps.engineDescriptorClient;
    this.namespace = deps.namespace;
  }

  public async init(type: EntityType, logExtractionParams?: LogExtractionBodyParams) {
    await this.install(type, logExtractionParams); // TODO: async
    await this.start(type, logExtractionParams?.frequency);
  }

  public async start(type: EntityType, logExtractionFrequency?: string) {
    this.logger.debug(`Scheduling extract entity task for type: ${type}`);

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

  public async install(type: EntityType, logExtractionParams?: LogExtractionBodyParams): Promise<ManagedEntityDefinition> {
    // TODO: return early if already installed
    try {
      this.logger.debug(`Installing assets for entity type: ${type}`);
      const definition = getEntityDefinition({ type });
      const initialState = this.calculateInitialState(logExtractionParams);

      await Promise.all([
        this.engineDescriptorClient.init(type, initialState),
        installElasticsearchAssets({
          esClient: this.esClient,
          logger: this.logger,
          definition,
          namespace: this.namespace,
        }),
      ]);

      this.logger.debug(`Installed definition: ${type}`);

      return definition;
    } catch (error) {
      this.logger.error(`Error installing assets for entity type ${type}: ${error}`);
      throw error;
    }
  }

  public async uninstall(type: EntityType) {
    try {
      const definition = getEntityDefinition({ type });
      await this.stop(type);

      await Promise.all([
        this.engineDescriptorClient.delete(type),
        uninstallElasticsearchAssets({
          esClient: this.esClient,
          logger: this.logger,
          definition,
          namespace: this.namespace,
        }),
      ]);

      this.logger.debug(`Uninstalled definition: ${type}`);
    } catch (error) {
      this.logger.error(`Error uninstalling assets for entity type ${type}: ${error}`);
      throw error;
    }
  }

  private calculateInitialState(logExtractionParams?: LogExtractionBodyParams): Partial<LogExtractionState> {
    if (!logExtractionParams) {
      return {};
    }

    const fieldsToExtract: Array<keyof LogExtractionBodyParams> = [
      'filter',
      'fieldHistoryLength',
      'additionalIndexPattern',
      'lookbackPeriod',
      'delay',
      'docsLimit',
      'frequency',
    ];

    const result: Partial<LogExtractionState> = {};
    for (const key of fieldsToExtract) {
      const value = logExtractionParams[key];
      if (value !== undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }

    return result;
  }
}
