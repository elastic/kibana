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
import type {
  EngineDescriptor,
  EngineDescriptorClient,
  LogExtractionState,
} from './definitions/saved_objects';
import type { LogExtractionBodyParams } from '../routes/constants';
import { ENGINE_STATUS, ENTITY_STORE_STATUS } from './constants';
import type { EntityStoreStatus, EngineComponentStatus, EngineComponentResource } from './types';
import { getExtractEntityTaskId } from '../tasks/extract_entity_task';
import { getLatestEntitiesIndexName } from './assets/latest_index';
import { getLatestIndexTemplateId } from './assets/latest_index_template';
import { getUpdatesIndexTemplateId } from './assets/updates_index_template';
import {
  getComponentTemplateName,
  getUpdatesComponentTemplateName,
} from './assets/component_templates';
import { getUpdatesEntitiesDataStreamName } from './assets/updates_data_stream';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

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
  private readonly isServerless = false;

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

  public async getStatus(withComponents: boolean = false) {
    const engines = await this.engineDescriptorClient.getAll();
    const status = this.calculateEntityStoreStatus(engines);

    if (withComponents) {
      const enginesWithComponents = await Promise.all(
        engines.map((engine) => this.getEngineWithComponents(engine))
      );
      return { status, engines: enginesWithComponents };
    }

    return { status, engines };
  }

  private async getEngineWithComponents(
    engine: EngineDescriptor
  ): Promise<EngineDescriptor & { components: EngineComponentStatus[] }> {
    const definition = getEntityDefinition(engine.type, this.namespace);
    const components = await this.getComponentsForEngine(engine.type, definition);
    return { ...engine, components };
  }

  private async getComponentsForEngine(
    type: EntityType,
    definition: ManagedEntityDefinition
  ): Promise<EngineComponentStatus[]> {
    const [
      entityDefinitionComponent,
      indexTemplateComponents,
      indexComponents,
      componentTemplateComponents,
      ilmPolicyComponents,
      taskComponent,
    ] = await Promise.all([
      this.getEntityDefinitionComponent(definition),
      this.getIndexTemplateComponents(definition),
      this.getIndexComponents(type, definition),
      this.getComponentTemplateComponents(definition),
      this.getIlmPolicyComponents(),
      this.getExtractEntityTaskComponent(type),
    ]);

    return [
      entityDefinitionComponent,
      ...indexTemplateComponents,
      ...indexComponents,
      ...componentTemplateComponents,
      ...ilmPolicyComponents,
      taskComponent,
    ];
  }

  private getEntityDefinitionComponent(
    definition: ManagedEntityDefinition
  ): EngineComponentStatus {
    return {
      id: definition.id,
      installed: true,
      resource: 'entity_definition',
    };
  }

  private async getIndexTemplateComponents(
    definition: ManagedEntityDefinition
  ): Promise<EngineComponentStatus[]> {
    const resource = 'index_template';
    const latestId = getLatestIndexTemplateId(definition);
    const updatesId = getUpdatesIndexTemplateId(definition);
    const [latestExists, updatesExists] = await Promise.all([
      this.tryAsBoolean(this.esClient.indices.getIndexTemplate({ name: latestId })),
      this.tryAsBoolean(this.esClient.indices.getIndexTemplate({ name: updatesId })),
    ]);
    return [
      { id: latestId, installed: latestExists, resource },
      { id: updatesId, installed: updatesExists, resource },
    ];
  }

  private async getIndexComponents(
    type: EntityType,
    definition: ManagedEntityDefinition
  ): Promise<EngineComponentStatus[]> {
    const resource: EngineComponentResource = 'index';
    const latestIndex = getLatestEntitiesIndexName(type, this.namespace);
    const updatesDataStreamName = getUpdatesEntitiesDataStreamName(type, this.namespace);
    const [latestExists, updatesExists] = await Promise.all([
      this.esClient.indices.exists({ index: latestIndex }),
      this.tryAsBoolean(this.esClient.indices.getDataStream({ name: updatesDataStreamName })),
    ]);
    return [
      { id: latestIndex, installed: latestExists, resource },
      { id: updatesDataStreamName, installed: updatesExists, resource },
    ];
  }

  private async getComponentTemplateComponents(
    definition: ManagedEntityDefinition
  ): Promise<EngineComponentStatus[]> {
    const resource: EngineComponentResource = 'component_template';
    const latestName = getComponentTemplateName(definition.id);
    const updatesName = getUpdatesComponentTemplateName(definition.id);
    const [latestExists, updatesExists] = await Promise.all([
      this.tryAsBoolean(this.esClient.cluster.getComponentTemplate({ name: latestName })),
      this.tryAsBoolean(this.esClient.cluster.getComponentTemplate({ name: updatesName })),
    ]);
    return [
      { id: latestName, installed: latestExists, resource },
      { id: updatesName, installed: updatesExists, resource },
    ];
  }

  private async getIlmPolicyComponents(): Promise<EngineComponentStatus[]> {
    if (this.isServerless) {
      return [];
    }
    const resource: EngineComponentResource = 'ilm_policy';
    const ilmPolicyNames: string[] = [];
    // TODO: add ilm policy names to ilmPolicyNames
    return Promise.all(
      ilmPolicyNames.map(async (name) => {
        const installed = await this.tryAsBoolean(this.esClient.ilm.getLifecycle({ name }));
        return { id: name, installed, resource };
      })
    );
  }

  private async getExtractEntityTaskComponent(type: EntityType): Promise<EngineComponentStatus> {
    const taskId = getExtractEntityTaskId(type, this.namespace);
    try {
      const task = await this.taskManager.get(taskId);
      const state = task.state as {
        namespace?: string;
        lastExecutionTimestamp?: string;
        runs?: number;
        lastError?: string;
        entityType?: string;
        status?: string;
      };
      return {
        id: taskId,
        installed: true,
        resource: 'task',
        enabled: task.enabled ?? true,
        status: task.status,
        lastExecutionTimestamp: state?.lastExecutionTimestamp,
        runs: state?.runs,
        lastError: state?.lastError,
      };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return {
          id: taskId,
          installed: false,
          resource: 'task',
        };
      }
      throw e;
    }
  }

  /**
   * Runs an async operation. Returns true if the promise resolves (no failure),
   * or false if it throws.
   */
  private async tryAsBoolean(promise: Promise<unknown>): Promise<boolean> {
    try {
      await promise;
      return true;
    } catch {
      return false;
    }
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
=======
>>>>>>> main
  }
}
