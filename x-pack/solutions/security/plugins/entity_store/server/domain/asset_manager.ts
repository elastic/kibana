/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { CheckPrivilegesResponse } from '@kbn/security-plugin-types-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { getEntityDefinition } from '../../common/domain/definitions/registry';
import type {
  EntityType,
  ManagedEntityDefinition,
} from '../../common/domain/definitions/entity_schema';
import { scheduleExtractEntityTask, stopExtractEntityTask } from '../tasks/extract_entity_task';
import { installElasticsearchAssets, uninstallElasticsearchAssets } from './assets/install_assets';
import {
  EngineDescriptorTypeName,
  type EngineDescriptor,
  type EngineDescriptorClient,
  type LogExtractionState,
} from './definitions/saved_objects';
import type { LogExtractionBodyParams } from '../routes/constants';
import {
  ENGINE_STATUS,
  ENTITY_STORE_CLUSTER_PRIVILEGES,
  ENTITY_STORE_SOURCE_INDICES_PRIVILEGES,
  ENTITY_STORE_STATUS,
  ENTITY_STORE_TARGET_INDICES_PRIVILEGES,
} from './constants';
import type {
  EntityStoreStatus,
  EngineComponentStatus,
  EngineComponentResource,
  GetStatusResult,
} from './types';
import { getExtractEntityTaskId } from '../tasks/extract_entity_task';
import { getLatestEntitiesIndexName } from './assets/latest_index';
import { getLatestIndexTemplateId } from './assets/latest_index_template';
import { getUpdatesIndexTemplateId } from './assets/updates_index_template';
import {
  getComponentTemplateName,
  getUpdatesComponentTemplateName,
} from './assets/component_templates';
import { getUpdatesEntitiesDataStreamName } from './assets/updates_data_stream';
import type { LogsExtractionClient } from './logs_extraction_client';

interface AssetManagerDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  taskManager: TaskManagerStartContract;
  engineDescriptorClient: EngineDescriptorClient;
  namespace: string;
  isServerless: boolean;
  logsExtractionClient: LogsExtractionClient;
  security: SecurityPluginStart;
}

export class AssetManager {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly taskManager: TaskManagerStartContract;
  private readonly engineDescriptorClient: EngineDescriptorClient;
  private readonly namespace: string;
  private readonly isServerless: boolean;
  private readonly logsExtractionClient: LogsExtractionClient;
  private readonly security: SecurityPluginStart;

  constructor(deps: AssetManagerDependencies) {
    this.logger = deps.logger;
    this.esClient = deps.esClient;
    this.taskManager = deps.taskManager;
    this.engineDescriptorClient = deps.engineDescriptorClient;
    this.namespace = deps.namespace;
    this.isServerless = deps.isServerless;
    this.logsExtractionClient = deps.logsExtractionClient;
    this.security = deps.security;
  }

  public async initEntity(
    request: KibanaRequest,
    type: EntityType,
    logExtractionParams?: LogExtractionBodyParams
  ) {
    await this.install(type, logExtractionParams); // TODO: async
    await this.start(request, type);
  }

  public async start(request: KibanaRequest, type: EntityType) {
    try {
      this.logger.get(type).debug(`Scheduling extract entity task for type: ${type}`);
      const {
        logExtractionState: { frequency },
      } = await this.engineDescriptorClient.findOrThrow(type);

      await scheduleExtractEntityTask({
        logger: this.logger,
        taskManager: this.taskManager,
        type,
        frequency,
        namespace: this.namespace,
        request,
      });
    } catch (error) {
      this.logger.get(type).error(`Error starting extract entity task for type ${type}:`, error);
      throw error;
    }
  }

  public async stop(type: EntityType) {
    try {
      await stopExtractEntityTask({
        taskManager: this.taskManager,
        logger: this.logger,
        type,
        namespace: this.namespace,
      });
    } catch (error) {
      this.logger.get(type).error(`Error stopping extract entity task for type ${type}:`, error);
      throw error;
    }
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
      this.logger.error(`Error installing assets for entity type ${type}`, { error });
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
      this.logger.get(type).error(`Error uninstalling assets for entity type ${type}`, { error });
      throw error;
    }
  }

  public async getStatus(withComponents: boolean = false): Promise<GetStatusResult> {
    try {
      const engines = await this.engineDescriptorClient.getAll();
      const status = this.calculateEntityStoreStatus(engines);

      if (withComponents) {
        const enginesWithComponents = await Promise.all(
          engines.map((engine) => this.getEngineWithComponents(engine))
        );
        return { status, engines: enginesWithComponents };
      }

      return { status, engines };
    } catch (error) {
      this.logger.error('Error getting status', { error });
      throw error;
    }
  }

  public async getPrivileges(
    request: KibanaRequest,
    additionalIndexPattern: string = ''
  ): Promise<CheckPrivilegesResponse> {
    const checkPrivileges = this.security.authz.checkPrivilegesDynamicallyWithRequest(request);

    const sourceIndexPatterns = await this.logsExtractionClient.getIndexPatterns(
      additionalIndexPattern
    );
    const kibanaPrivileges = this.security.authz.actions.savedObject.get(
      EngineDescriptorTypeName,
      'create'
    );

    const sourceIndexPrivileges = Object.fromEntries(
      sourceIndexPatterns.map((idx) => [idx, ENTITY_STORE_SOURCE_INDICES_PRIVILEGES])
    );

    const targetIndexPrivileges = {
      [getLatestEntitiesIndexName(this.namespace)]: ENTITY_STORE_TARGET_INDICES_PRIVILEGES,
    };

    return checkPrivileges({
      kibana: [kibanaPrivileges],
      elasticsearch: {
        cluster: ENTITY_STORE_CLUSTER_PRIVILEGES,
        index: { ...targetIndexPrivileges, ...sourceIndexPrivileges },
      },
    });
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
      this.getIndexComponents(),
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

  private getEntityDefinitionComponent(definition: ManagedEntityDefinition): EngineComponentStatus {
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
    const latestId = getLatestIndexTemplateId(this.namespace);
    const updatesId = getUpdatesIndexTemplateId(this.namespace);
    const [latestExists, updatesExists] = await Promise.all([
      this.tryAsBoolean(this.esClient.indices.getIndexTemplate({ name: latestId })),
      this.tryAsBoolean(this.esClient.indices.getIndexTemplate({ name: updatesId })),
    ]);
    return [
      { id: latestId, installed: latestExists, resource },
      { id: updatesId, installed: updatesExists, resource },
    ];
  }

  private async getIndexComponents(): Promise<EngineComponentStatus[]> {
    const resource: EngineComponentResource = 'index';
    const latestIndex = getLatestEntitiesIndexName(this.namespace);
    const updatesDataStreamName = getUpdatesEntitiesDataStreamName(this.namespace);
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
    const latestName = getComponentTemplateName(definition.type, this.namespace);
    const updatesName = getUpdatesComponentTemplateName(definition.type, this.namespace);
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
      const countResult = await this.logsExtractionClient.extractLogs(type, { countOnly: true });
      return {
        id: taskId,
        installed: true,
        resource: 'task',
        status: task.state.status ?? null,
        remainingLogsToExtract: countResult.success ? countResult.count : null,
        runs: task.state.runs ?? 0,
        lastError: task.state.lastError ?? null,
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
    if (engines.length === 0) {
      return ENTITY_STORE_STATUS.NOT_INSTALLED;
    } else if (engines.some((engine) => engine.status === ENGINE_STATUS.ERROR)) {
      return ENTITY_STORE_STATUS.ERROR;
    } else if (engines.every((engine) => engine.status === ENGINE_STATUS.STOPPED)) {
      return ENTITY_STORE_STATUS.STOPPED;
    } else if (engines.some((engine) => engine.status === ENGINE_STATUS.INSTALLING)) {
      return ENTITY_STORE_STATUS.INSTALLING;
    }

    return ENTITY_STORE_STATUS.RUNNING;
  }
}
