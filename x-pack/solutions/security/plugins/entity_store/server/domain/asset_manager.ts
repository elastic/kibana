/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { getEntityDefinition } from './definitions/registry';
import type { EntityType, ManagedEntityDefinition } from './definitions/entity_schema';
import { scheduleExtractEntityTask, stopExtractEntityTask } from '../tasks/extract_entity_task';
import { installElasticsearchAssets, uninstallElasticsearchAssets } from './assets/install_assets';
import type { EngineDescriptor, EngineDescriptorClient, LogExtractionState } from './definitions/saved_objects';
import type { LogExtractionBodyParams } from '../routes/constants';
import { ENGINE_STATUS, ENTITY_STORE_STATUS } from './constants';
import { EntityStoreStatus } from './types';

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

  public async initEntity(
    request: KibanaRequest,
    type: EntityType,
    logExtractionParams?: LogExtractionBodyParams
  ) {
    await this.install(type, logExtractionParams); // TODO: async
    await this.start(request, type, logExtractionParams?.frequency);
  }

  public async start(request: KibanaRequest, type: EntityType, logExtractionFrequency?: string) {
    this.logger.get(type).debug(`Scheduling extract entity task for type: ${type}`);

    // TODO: if this fails, set status to failed
    await scheduleExtractEntityTask({
      logger: this.logger,
      taskManager: this.taskManager,
      type,
      frequency: logExtractionFrequency,
      namespace: this.namespace,
      request,
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

  public async install(
    type: EntityType,
    logExtractionParams?: LogExtractionBodyParams
  ): Promise<ManagedEntityDefinition> {
    // TODO: return early if already installed
    try {
      this.logger.get(type).debug(`Installing assets for entity type: ${type}`);
      const definition = getEntityDefinition(type, this.namespace);
      const initialState: Partial<LogExtractionState> = logExtractionParams ?? {};

      await Promise.all([
        this.engineDescriptorClient.init(type, initialState),
        installElasticsearchAssets({
          esClient: this.esClient,
          logger: this.logger,
          definition,
          namespace: this.namespace,
        }),
      ]);

      await this.engineDescriptorClient.update(type, { status: ENGINE_STATUS.STARTED });

      this.logger.debug(`Installed definition: ${type}`);

      return definition;
    } catch (error) {
      this.logger.error(`Error installing assets for entity type ${type}: ${error}`);
      throw error;
    }
  }

  public async uninstall(type: EntityType) {
    try {
      const definition = getEntityDefinition(type, this.namespace);
      await this.stop(type);

      await Promise.all([
        this.engineDescriptorClient.delete(type),
        uninstallElasticsearchAssets({
          esClient: this.esClient,
          logger: this.logger.get(type),
          definition,
          namespace: this.namespace,
        }),
      ]);

      this.logger.get(type).debug(`Uninstalled definition: ${type}`);
    } catch (error) {
      this.logger.get(type).error(`Error uninstalling assets for entity type ${type}: ${error}`);
      throw error;
    }
  }

  public async getStatus() {
    const engines = await this.engineDescriptorClient.getAll();
    const status = this.calculateEntityStoreStatus(engines);
    
    return {
      status,
      engines,
    };
  }

  private calculateEntityStoreStatus(engines: EngineDescriptor[]): EntityStoreStatus {
    let status = ENTITY_STORE_STATUS.RUNNING;
    if (engines.length === 0) {
      status = ENTITY_STORE_STATUS.NOT_INSTALLED;
    } else if (engines.some((engine) => engine.status === ENGINE_STATUS.ERROR)) {
      status = ENTITY_STORE_STATUS.ERROR;
    } else if (engines.every((engine) => engine.status === ENGINE_STATUS.STOPPED)) {
      status = ENTITY_STORE_STATUS.STOPPED;
    } else if (engines.some((engine) => engine.status === ENGINE_STATUS.INSTALLING)) {
      status = ENTITY_STORE_STATUS.INSTALLING;
    }

    return status;
  }
}
