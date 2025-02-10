/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  ElasticsearchClient,
  SavedObjectsClientContract,
  AuditLogger,
  IScopedClusterClient,
  AuditEvent,
  AnalyticsServiceSetup,
} from '@kbn/core/server';
import { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import type { HealthStatus, SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { isEqual } from 'lodash/fp';
import moment from 'moment';
import type { EntityDefinitionWithState } from '@kbn/entityManager-plugin/server/lib/entities/types';
import type { EntityDefinition } from '@kbn/entities-schema';
import type { estypes } from '@elastic/elasticsearch';
import { merge } from '../../../../common/utils/objects/merge';
import { getEnabledStoreEntityTypes } from '../../../../common/entity_analytics/entity_store/utils';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { ExperimentalFeatures } from '../../../../common';
import type {
  GetEntityStoreStatusRequestQuery,
  GetEntityStoreStatusResponse,
} from '../../../../common/api/entity_analytics/entity_store/status.gen';
import type {
  InitEntityStoreRequestBody,
  InitEntityStoreResponse,
} from '../../../../common/api/entity_analytics/entity_store/enable.gen';
import type { AppClient } from '../../..';
import { EngineComponentResourceEnum } from '../../../../common/api/entity_analytics';
import type {
  Entity,
  EngineDataviewUpdateResult,
  InitEntityEngineRequestBody,
  InitEntityEngineResponse,
  InspectQuery,
  ListEntityEnginesResponse,
  EngineComponentStatus,
  EngineComponentResource,
} from '../../../../common/api/entity_analytics';
import { EngineDescriptorClient } from './saved_object/engine_descriptor';
import {
  ENGINE_STATUS,
  ENTITY_STORE_STATUS,
  MAX_SEARCH_RESPONSE_SIZE,
  defaultOptions,
} from './constants';
import { AssetCriticalityMigrationClient } from '../asset_criticality/asset_criticality_migration_client';
import {
  startEntityStoreFieldRetentionEnrichTask,
  removeEntityStoreFieldRetentionEnrichTask,
  getEntityStoreFieldRetentionEnrichTaskState as getEntityStoreFieldRetentionEnrichTaskStatus,
  removeEntityStoreDataViewRefreshTask,
  startEntityStoreDataViewRefreshTask,
  getEntityStoreDataViewRefreshTaskState,
} from './tasks';
import {
  createEntityIndex,
  deleteEntityIndex,
  createPlatformPipeline,
  deletePlatformPipeline,
  createEntityIndexComponentTemplate,
  deleteEntityIndexComponentTemplate,
  createFieldRetentionEnrichPolicy,
  executeFieldRetentionEnrichPolicy,
  deleteFieldRetentionEnrichPolicy,
  getPlatformPipelineStatus,
  getFieldRetentionEnrichPolicyStatus,
  getEntityIndexStatus,
  getEntityIndexComponentTemplateStatus,
} from './elasticsearch_assets';
import { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import {
  buildEntityDefinitionId,
  buildIndexPatterns,
  getEntitiesIndexName,
  isPromiseFulfilled,
  isPromiseRejected,
} from './utils';
import { EntityEngineActions } from './auditing/actions';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../audit';
import type { EntityRecord, EntityStoreConfig } from './types';
import {
  ENTITY_ENGINE_INITIALIZATION_EVENT,
  ENTITY_ENGINE_RESOURCE_INIT_FAILURE_EVENT,
} from '../../telemetry/event_based/events';
import { CRITICALITY_VALUES } from '../asset_criticality/constants';
import { createEngineDescription } from './installation/engine_description';
import { convertToEntityManagerDefinition } from './entity_definitions/entity_manager_conversion';
import {
  createKeywordBuilderPipeline,
  deleteKeywordBuilderPipeline,
} from '../../asset_inventory/ingest_pipelines';

import type { ApiKeyManager } from './auth/api_key';

// Workaround. TransformState type is wrong. The health type should be: TransformHealth from '@kbn/transform-plugin/common/types/transform_stats'
export interface TransformHealth extends estypes.TransformGetTransformStatsTransformStatsHealth {
  issues?: TransformHealthIssue[];
}

export interface TransformHealthIssue {
  type: string;
  issue: string;
  details?: string;
  count: number;
  first_occurrence?: number;
}

interface EntityStoreClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  taskManager?: TaskManagerStartContract;
  auditLogger?: AuditLogger;
  kibanaVersion: string;
  dataViewsService: DataViewsService;
  appClient: AppClient;
  config: EntityStoreConfig;
  experimentalFeatures: ExperimentalFeatures;
  telemetry?: AnalyticsServiceSetup;
  apiKeyManager?: ApiKeyManager;
}

interface SearchEntitiesParams {
  entityTypes: EntityType[];
  filterQuery?: string;
  page: number;
  perPage: number;
  sortField: string;
  sortOrder: SortOrder;
}

export class EntityStoreDataClient {
  private engineClient: EngineDescriptorClient;
  private assetCriticalityMigrationClient: AssetCriticalityMigrationClient;
  private entityClient: EntityClient;
  private riskScoreDataClient: RiskScoreDataClient;
  private esClient: ElasticsearchClient;
  private apiKeyGenerator?: ApiKeyManager;

  constructor(private readonly options: EntityStoreClientOpts) {
    const {
      clusterClient,
      logger,
      soClient,
      auditLogger,
      kibanaVersion,
      namespace,
      apiKeyManager,
    } = options;
    this.esClient = clusterClient.asCurrentUser;
    this.apiKeyGenerator = apiKeyManager;

    this.entityClient = new EntityClient({
      clusterClient,
      soClient,
      logger,
    });

    this.engineClient = new EngineDescriptorClient({
      soClient,
      namespace,
    });

    this.assetCriticalityMigrationClient = new AssetCriticalityMigrationClient({
      esClient: this.esClient,
      logger,
      auditLogger,
    });

    this.riskScoreDataClient = new RiskScoreDataClient({
      soClient,
      esClient: this.esClient,
      logger,
      namespace,
      kibanaVersion,
    });
  }

  private async getEngineComponentsState(
    type: EntityType,
    definition?: EntityDefinition
  ): Promise<EngineComponentStatus[]> {
    const { namespace, taskManager } = this.options;

    return definition
      ? Promise.all([
          ...(taskManager
            ? [getEntityStoreFieldRetentionEnrichTaskStatus({ namespace, taskManager })]
            : []),
          ...(taskManager
            ? [getEntityStoreDataViewRefreshTaskState({ namespace, taskManager })]
            : []),
          getPlatformPipelineStatus({
            engineId: definition.id,
            esClient: this.esClient,
          }),
          getFieldRetentionEnrichPolicyStatus({
            definitionMetadata: {
              namespace,
              entityType: type,
              version: definition.version,
            },
            esClient: this.esClient,
          }),
          getEntityIndexStatus({
            entityType: type,
            esClient: this.esClient,
            namespace,
          }),
          getEntityIndexComponentTemplateStatus({
            definitionId: definition.id,
            esClient: this.esClient,
          }),
        ])
      : Promise.resolve([] as EngineComponentStatus[]);
  }

  public async enable(
    requestBodyOverrides: InitEntityStoreRequestBody,
    { pipelineDebugMode = false }: { pipelineDebugMode?: boolean } = {}
  ): Promise<InitEntityStoreResponse> {
    if (!this.options.taskManager) {
      throw new Error('Task Manager is not available');
    }

    // Immediately defer the initialization to the next tick. This way we don't block on the init preflight checks
    const run = <T>(fn: () => Promise<T>) =>
      new Promise<T>((resolve) => setTimeout(() => fn().then(resolve), 0));

    const { experimentalFeatures } = this.options;
    const enabledEntityTypes = getEnabledStoreEntityTypes(experimentalFeatures);

    // When entityTypes param is defined it only enables the engines that are provided
    const enginesTypes = requestBodyOverrides.entityTypes
      ? (requestBodyOverrides.entityTypes as EntityType[]).filter((type) =>
          enabledEntityTypes.includes(type)
        )
      : enabledEntityTypes;

    const promises = enginesTypes.map((entity) =>
      run(() => this.init(entity, requestBodyOverrides, { pipelineDebugMode }))
    );

    const engines = await Promise.all(promises);
    return { engines, succeeded: true };
  }

  public async status({
    include_components: withComponents = false,
  }: GetEntityStoreStatusRequestQuery): Promise<GetEntityStoreStatusResponse> {
    const { namespace } = this.options;
    const { engines, count } = await this.engineClient.list();

    let status = ENTITY_STORE_STATUS.RUNNING;
    if (count === 0) {
      status = ENTITY_STORE_STATUS.NOT_INSTALLED;
    } else if (engines.some((engine) => engine.status === ENGINE_STATUS.ERROR)) {
      status = ENTITY_STORE_STATUS.ERROR;
    } else if (engines.every((engine) => engine.status === ENGINE_STATUS.STOPPED)) {
      status = ENTITY_STORE_STATUS.STOPPED;
    } else if (engines.some((engine) => engine.status === ENGINE_STATUS.INSTALLING)) {
      status = ENTITY_STORE_STATUS.INSTALLING;
    }

    if (withComponents) {
      const enginesWithComponents = await Promise.all(
        engines.map(async (engine) => {
          const id = buildEntityDefinitionId(engine.type, namespace);
          const {
            definitions: [definition],
          } = await this.entityClient.getEntityDefinitions({
            id,
            includeState: withComponents,
          });

          const definitionComponents = this.getComponentFromEntityDefinition(id, definition);

          const entityStoreComponents = await this.getEngineComponentsState(
            EntityType[engine.type],
            definition
          );

          return {
            ...engine,
            components: [...definitionComponents, ...entityStoreComponents],
          };
        })
      );

      return { engines: enginesWithComponents, status };
    } else {
      return { engines, status };
    }
  }

  public async init(
    entityType: EntityType,
    requestBody: InitEntityEngineRequestBody,
    { pipelineDebugMode = false }: { pipelineDebugMode?: boolean } = {}
  ): Promise<InitEntityEngineResponse> {
    const { experimentalFeatures } = this.options;

    if (entityType === EntityType.universal && !experimentalFeatures.assetInventoryStoreEnabled) {
      throw new Error('Universal entity store is not enabled');
    }

    if (entityType === EntityType.service && !experimentalFeatures.serviceEntityStoreEnabled) {
      throw new Error('Service entity store is not enabled');
    }

    if (!this.options.taskManager) {
      throw new Error('Task Manager is not available');
    }

    const { config } = this.options;

    await this.riskScoreDataClient.createOrUpdateRiskScoreLatestIndex().catch((e) => {
      if (e.meta.body.error.type === 'resource_already_exists_exception') {
        this.options.logger.debug(
          `Risk score index for ${entityType} already exists, skipping creation.`
        );
        return;
      }

      throw e;
    });

    const requiresMigration =
      await this.assetCriticalityMigrationClient.isEcsDataMigrationRequired();

    if (requiresMigration) {
      throw new Error(
        'Asset criticality data migration is required before initializing entity store. If this error persists, please restart Kibana.'
      );
    }

    this.log('info', entityType, `Initializing entity store`);
    this.audit(
      EntityEngineActions.INIT,
      EngineComponentResourceEnum.entity_engine,
      entityType,
      'Initializing entity engine'
    );

    const descriptor = await this.engineClient.init(entityType, requestBody);
    this.log('debug', entityType, `Initialized engine saved object`);

    this.asyncSetup(
      entityType,
      this.options.taskManager,
      config,
      requestBody,
      pipelineDebugMode
    ).catch((e) =>
      this.log('error', entityType, `Error during async setup of entity store: ${e.message}`)
    );

    return descriptor;
  }

  private async asyncSetup(
    entityType: EntityType,
    taskManager: TaskManagerStartContract,
    config: EntityStoreConfig,
    requestParams: InitEntityEngineRequestBody,
    pipelineDebugMode: boolean
  ) {
    const setupStartTime = moment().utc().toISOString();
    const { logger, namespace, appClient, dataViewsService } = this.options;
    try {
      const defaultIndexPatterns = await buildIndexPatterns(namespace, appClient, dataViewsService);
      const options = merge(defaultOptions, requestParams);

      const description = createEngineDescription({
        entityType,
        namespace,
        requestParams,
        defaultIndexPatterns,
        config,
      });

      // clean up any existing entity store
      await this.delete(entityType, taskManager, { deleteData: false, deleteEngine: false });

      if (this.apiKeyGenerator) {
        await this.apiKeyGenerator.generate();
      }

      // set up the entity manager definition
      const definition = convertToEntityManagerDefinition(description, {
        namespace,
        filter: options.filter,
      });

      await this.entityClient.createEntityDefinition({
        definition,
        installOnly: true,
      });
      this.log(`debug`, entityType, `Created entity definition`);

      if (entityType === EntityType.universal) {
        logger.debug('creating keyword builder pipeline');
        await createKeywordBuilderPipeline({
          logger,
          esClient: this.esClient,
        });
      }

      // the index must be in place with the correct mapping before the enrich policy is created
      // this is because the enrich policy will fail if the index does not exist with the correct fields
      await createEntityIndexComponentTemplate(description, this.esClient);
      this.log(`debug`, entityType, `Created entity index component template`);
      await createEntityIndex({
        entityType,
        esClient: this.esClient,
        namespace,
        logger,
      });
      this.log(`debug`, entityType, `Created entity index`);

      // we must create and execute the enrich policy before the pipeline is created
      // this is because the pipeline will fail if the enrich index does not exist
      await createFieldRetentionEnrichPolicy({
        description,
        options: { namespace },
        esClient: this.esClient,
      });
      this.log(`debug`, entityType, `Created field retention enrich policy`);

      await executeFieldRetentionEnrichPolicy({
        entityType,
        version: description.version,
        options: { namespace },
        esClient: this.esClient,
        logger,
      });
      this.log(`debug`, entityType, `Executed field retention enrich policy`);
      await createPlatformPipeline({
        description,
        options: { namespace },
        debugMode: pipelineDebugMode,
        logger,
        esClient: this.esClient,
      });
      this.log(`debug`, entityType, `Created @platform pipeline`);

      // finally start the entity definition now that everything is in place
      const updated = await this.start(entityType, { force: true });

      // the task will execute the enrich policy on a schedule
      await startEntityStoreFieldRetentionEnrichTask({
        namespace,
        logger,
        taskManager,
        interval: options.enrichPolicyExecutionInterval,
      });

      // this task will continuously refresh the Entity Store indices based on the Data View
      await startEntityStoreDataViewRefreshTask({
        namespace,
        logger,
        taskManager,
      });

      this.log(`debug`, entityType, `Started entity store field retention enrich task`);
      this.log(`info`, entityType, `Entity store initialized`);

      const setupEndTime = moment().utc().toISOString();
      const duration = moment(setupEndTime).diff(moment(setupStartTime), 'seconds');
      this.options.telemetry?.reportEvent(ENTITY_ENGINE_INITIALIZATION_EVENT.eventType, {
        duration,
      });

      return updated;
    } catch (err) {
      this.log(`error`, entityType, `Error initializing entity store: ${err.message}`);

      this.audit(
        EntityEngineActions.INIT,
        EngineComponentResourceEnum.entity_engine,
        entityType,
        'Failed to initialize entity engine resources',
        err
      );

      this.options.telemetry?.reportEvent(ENTITY_ENGINE_RESOURCE_INIT_FAILURE_EVENT.eventType, {
        error: err.message,
      });

      await this.engineClient.update(entityType, {
        status: ENGINE_STATUS.ERROR,
        error: {
          message: err.message,
          stack: err.stack,
          action: 'init',
        },
      });

      await this.delete(entityType, taskManager, { deleteData: true, deleteEngine: false });
    }
  }

  public getComponentFromEntityDefinition(
    id: string,
    definition: EntityDefinitionWithState | EntityDefinition | undefined
  ): EngineComponentStatus[] {
    if (!definition) {
      return [
        {
          id,
          installed: false,
          resource: EngineComponentResourceEnum.entity_definition,
        },
      ];
    }

    if ('state' in definition) {
      const transformHealthToComponentHealth = (
        health: HealthStatus | undefined
      ): EngineComponentStatus['health'] =>
        health ? (health.toLowerCase() as Lowercase<HealthStatus>) : 'unknown';

      return [
        {
          id: definition.id,
          installed: definition.state.installed,
          resource: EngineComponentResourceEnum.entity_definition,
        },
        ...definition.state.components.transforms.map(({ installed, stats }) => ({
          id,
          resource: EngineComponentResourceEnum.transform,
          installed,
          health: transformHealthToComponentHealth(stats?.health?.status),
          errors: (stats?.health as TransformHealth)?.issues?.map(({ issue, details }) => ({
            title: issue,
            message: details,
          })),
        })),
        ...definition.state.components.ingestPipelines.map((pipeline) => ({
          resource: EngineComponentResourceEnum.ingest_pipeline,
          ...pipeline,
        })),
        ...definition.state.components.indexTemplates.map(({ installed, id: templateId }) => ({
          id: templateId,
          installed,
          resource: EngineComponentResourceEnum.index_template,
        })),
      ];
    }
    return [];
  }

  public async getExistingEntityDefinition(entityType: EntityType) {
    const entityDefinitionId = buildEntityDefinitionId(entityType, this.options.namespace);

    const {
      definitions: [definition],
    } = await this.entityClient.getEntityDefinitions({
      id: entityDefinitionId,
    });

    if (!definition) {
      throw new Error(`Unable to find entity definition for ${entityType}`);
    }

    return definition;
  }

  public async start(entityType: EntityType, options?: { force: boolean }) {
    const { namespace } = this.options;
    const descriptor = await this.engineClient.get(entityType);
    if (!options?.force && descriptor.status !== ENGINE_STATUS.STOPPED) {
      throw new Error(
        `In namespace ${namespace}: Cannot start Entity engine for ${entityType} when current status is: ${descriptor.status}`
      );
    }

    this.log('info', entityType, `Starting entity store`);

    // startEntityDefinition requires more fields than the engine descriptor
    // provides so we need to fetch the full entity definition
    const fullEntityDefinition = await this.getExistingEntityDefinition(entityType);
    this.audit(
      EntityEngineActions.START,
      EngineComponentResourceEnum.entity_definition,
      entityType,
      'Starting entity definition'
    );
    await this.entityClient.startEntityDefinition(fullEntityDefinition);
    this.log('debug', entityType, `Started entity definition`);

    return this.engineClient.updateStatus(entityType, ENGINE_STATUS.STARTED);
  }

  public async stop(entityType: EntityType) {
    const { namespace } = this.options;
    const descriptor = await this.engineClient.get(entityType);

    if (descriptor.status !== ENGINE_STATUS.STARTED) {
      throw new Error(
        `In namespace ${namespace}: Cannot stop Entity engine for ${entityType} when current status is: ${descriptor.status}`
      );
    }

    this.log('info', entityType, `Stopping entity store`);

    // stopEntityDefinition requires more fields than the engine descriptor
    // provides so we need to fetch the full entity definition
    const fullEntityDefinition = await this.getExistingEntityDefinition(entityType);
    this.audit(
      EntityEngineActions.STOP,
      EngineComponentResourceEnum.entity_definition,
      entityType,
      'Stopping entity definition'
    );
    await this.entityClient.stopEntityDefinition(fullEntityDefinition);
    this.log('debug', entityType, `Stopped entity definition`);

    return this.engineClient.updateStatus(entityType, ENGINE_STATUS.STOPPED);
  }

  public async get(entityType: EntityType) {
    return this.engineClient.get(entityType);
  }

  public async list(): Promise<ListEntityEnginesResponse> {
    return this.engineClient.list();
  }

  public async delete(
    entityType: EntityType,
    taskManager: TaskManagerStartContract,
    options = { deleteData: false, deleteEngine: true }
  ) {
    const { namespace, logger, appClient, dataViewsService, config } = this.options;
    const { deleteData, deleteEngine } = options;

    const descriptor = await this.engineClient.maybeGet(entityType);
    const defaultIndexPatterns = await buildIndexPatterns(namespace, appClient, dataViewsService);

    const description = createEngineDescription({
      entityType,
      namespace,
      defaultIndexPatterns,
      config,
    });

    if (!description.id) {
      throw new Error(`Unable to find entity definition for ${entityType}`);
    }

    this.log('info', entityType, `Deleting entity store`);
    this.audit(
      EntityEngineActions.DELETE,
      EngineComponentResourceEnum.entity_engine,
      entityType,
      'Deleting entity engine'
    );

    try {
      await this.entityClient
        .deleteEntityDefinition({
          id: description.id,
          deleteData,
        })
        // Swallowing the error as it is expected to fail if no entity definition exists
        .catch((e) =>
          this.log(`warn`, entityType, `Error deleting entity definition: ${e.message}`)
        );
      this.log('debug', entityType, `Deleted entity definition`);

      await deleteEntityIndexComponentTemplate({
        id: description.id,
        esClient: this.esClient,
      });
      this.log('debug', entityType, `Deleted entity index component template`);

      await deletePlatformPipeline({
        description,
        logger,
        esClient: this.esClient,
      });
      this.log('debug', entityType, `Deleted platform pipeline`);

      await deleteFieldRetentionEnrichPolicy({
        description,
        options: { namespace },
        esClient: this.esClient,
        logger,
      });
      this.log('debug', entityType, `Deleted field retention enrich policy`);

      if (entityType === EntityType.universal) {
        logger.debug(`Deleting asset inventory keyword builder pipeline`);

        await deleteKeywordBuilderPipeline({
          logger,
          esClient: this.esClient,
        });
      }

      if (deleteData) {
        await deleteEntityIndex({
          entityType,
          esClient: this.esClient,
          namespace,
          logger,
        });
        this.log('debug', entityType, `Deleted entity index`);
      }

      if (descriptor && deleteEngine) {
        await this.engineClient.delete(entityType);
      }
      // if the last engine then stop the task
      const { engines } = await this.engineClient.list();
      if (engines.length === 0) {
        await removeEntityStoreFieldRetentionEnrichTask({
          namespace,
          logger,
          taskManager,
        });
        await removeEntityStoreDataViewRefreshTask({
          namespace,
          logger,
          taskManager,
        });
        this.log(
          'debug',
          entityType,
          `Deleted entity store field retention and data view refresh tasks`
        );
      }

      logger.info(`[Entity Store] In namespace ${namespace}: Deleted store for ${entityType}`);
      return { deleted: true };
    } catch (err) {
      this.log(`error`, entityType, `Error deleting entity store: ${err.message}`);

      this.audit(
        EntityEngineActions.DELETE,
        EngineComponentResourceEnum.entity_engine,
        entityType,
        'Failed to delete entity engine',
        err
      );

      throw err;
    }
  }

  public async searchEntities(params: SearchEntitiesParams): Promise<{
    records: Entity[];
    total: number;
    inspect: InspectQuery;
  }> {
    const { page, perPage, sortField, sortOrder, filterQuery, entityTypes } = params;

    const index = entityTypes.map((type) => getEntitiesIndexName(type, this.options.namespace));
    const from = (page - 1) * perPage;
    const sort = sortField ? [{ [sortField]: sortOrder }] : undefined;
    const query = filterQuery ? JSON.parse(filterQuery) : undefined;

    const response = await this.esClient.search<EntityRecord>({
      index,
      query,
      size: Math.min(perPage, MAX_SEARCH_RESPONSE_SIZE),
      from,
      sort,
      ignore_unavailable: true,
    });
    const { hits } = response;

    const total = typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;

    const records = hits.hits.map((hit) => {
      const { asset, ...source } = hit._source as EntityRecord;

      const assetOverwrite: Pick<Entity, 'asset'> =
        asset && asset.criticality !== CRITICALITY_VALUES.DELETED
          ? { asset: { criticality: asset.criticality } }
          : {};

      return {
        ...source,
        ...assetOverwrite,
      };
    });

    const inspect: InspectQuery = {
      dsl: [JSON.stringify({ index, body: query }, null, 2)],
      response: [JSON.stringify(response, null, 2)],
    };

    return { records, total, inspect };
  }

  public async applyDataViewIndices(): Promise<{
    successes: EngineDataviewUpdateResult[];
    errors: Error[];
  }> {
    const { logger } = this.options;
    logger.debug(
      `In namespace ${this.options.namespace}: Applying data view indices to the entity store`
    );

    const { engines } = await this.engineClient.list();

    const updateDefinitionPromises: Array<Promise<EngineDataviewUpdateResult>> = engines.map(
      async (engine) => {
        const originalStatus = engine.status;
        const id = buildEntityDefinitionId(engine.type, this.options.namespace);
        const definition = await this.getExistingEntityDefinition(EntityType[engine.type]);

        if (
          originalStatus === ENGINE_STATUS.INSTALLING ||
          originalStatus === ENGINE_STATUS.UPDATING
        ) {
          throw new Error(
            `Error updating entity store: There are changes already in progress for engine ${id}`
          );
        }

        const indexPatterns = await buildIndexPatterns(
          this.options.namespace,
          this.options.appClient,
          this.options.dataViewsService
        );

        // Skip update if index patterns are the same
        if (isEqual(definition.indexPatterns, indexPatterns)) {
          logger.debug(
            `In namespace ${this.options.namespace}: No data view index changes detected.`
          );
          return { type: engine.type, changes: {} };
        } else {
          logger.info(
            `In namespace ${this.options.namespace}: Data view index changes detected, applying changes to entity definition.`
          );
        }

        // Update savedObject status
        await this.engineClient.updateStatus(engine.type, ENGINE_STATUS.UPDATING);

        try {
          // Update entity manager definition
          await this.entityClient.updateEntityDefinition({
            id,
            definitionUpdate: {
              ...definition,
              indexPatterns,
            },
          });

          // Restore the savedObject status and set the new index pattern
          await this.engineClient.updateStatus(engine.type, originalStatus);

          return { type: engine.type, changes: { indexPatterns } };
        } catch (error) {
          // Rollback the engine initial status when the update fails
          await this.engineClient.updateStatus(engine.type, originalStatus);

          throw error;
        }
      }
    );

    const updatedDefinitions = await Promise.allSettled(updateDefinitionPromises);

    const updateErrors = updatedDefinitions
      .filter(isPromiseRejected)
      .map((result) => result.reason);

    const updateSuccesses = updatedDefinitions
      .filter(isPromiseFulfilled<EngineDataviewUpdateResult>)
      .map((result) => result.value);

    return {
      successes: updateSuccesses,
      errors: updateErrors,
    };
  }

  private log(
    level: Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>,
    entityType: EntityType,
    msg: string
  ) {
    this.options.logger[level](
      `[Entity Engine] [entity.${entityType}] [namespace: ${this.options.namespace}] ${msg}`
    );
  }

  private audit(
    action: EntityEngineActions,
    resource: EngineComponentResource,
    entityType: EntityType,
    msg: string,
    error?: Error
  ) {
    // NOTE: Excluding errors, all auditing events are currently WRITE events, meaning the outcome is always UNKNOWN.
    // This may change in the future, depending on the audit action.
    const outcome = error ? AUDIT_OUTCOME.FAILURE : AUDIT_OUTCOME.UNKNOWN;

    const type =
      action === EntityEngineActions.CREATE
        ? AUDIT_TYPE.CREATION
        : EntityEngineActions.DELETE
        ? AUDIT_TYPE.DELETION
        : AUDIT_TYPE.CHANGE;

    const category = AUDIT_CATEGORY.DATABASE;

    const message = error ? `${msg}: ${error.message}` : msg;
    const event: AuditEvent = {
      message: `[Entity Engine] [entity.${entityType}] ${message}`,
      event: {
        action: `${action}_${entityType}_${resource}`,
        category,
        outcome,
        type,
      },
    };

    return this.options.auditLogger?.log(event);
  }
}
