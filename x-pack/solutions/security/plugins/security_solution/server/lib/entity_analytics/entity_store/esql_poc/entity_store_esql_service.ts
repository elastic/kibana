/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import moment from 'moment';
import { EntityType } from '../../../../../common/api/entity_analytics/entity_store';
import {
  removeEntityStoreESQLExecuteTask,
  startEntityStoreESQLExecuteTask,
} from './kibana_task_run_cycle';
import { buildESQLQuery } from './esql_builder';
import type { AppClient } from '../../../../client';
import {
  createEntityStoreState,
  deleteEntityStoreState,
  getEntityStoreState,
  updateEntityStoreLastExecutionTime,
} from './entity_store_state_manager';
import type { ApiKeyManager } from '../auth/api_key';
import { executeEsqlQuery } from './esql_executer';
import { storeEntityStoreDocs } from './elasticsearch_store_results';
import type { EntityStoreEsqlConfig } from './config';

const defaultLookback = () => moment().utc().subtract(1, 'minute').toISOString();

export class EntityStoreESQLService {
  private namespace: string;
  private esClient: ElasticsearchClient;
  private soClient: SavedObjectsClientContract;
  private apiKeyGenerator: ApiKeyManager;
  private logger: Logger;
  private dataViews: DataViewsService;
  private appClient: AppClient;
  private taskManager?: TaskManagerStartContract;

  constructor(
    namespace: string,
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    logger: Logger,
    dataViews: DataViewsService,
    appClient: AppClient,
    apiKeyGenerator: ApiKeyManager,
    taskManager?: TaskManagerStartContract
  ) {
    this.namespace = namespace;
    this.esClient = esClient;
    this.soClient = soClient;
    this.logger = logger;
    this.dataViews = dataViews;
    this.appClient = appClient;
    this.apiKeyGenerator = apiKeyGenerator;
    this.taskManager = taskManager;
  }

  public async startTask(config: EntityStoreEsqlConfig) {
    if (!this.taskManager) {
      this.logger.warn(`[Entity Store ESQL] no task manager configured, skipping`);
      return;
    }

    await this.apiKeyGenerator.generate();

    await Promise.all(
      Object.values(EntityType.Values).map(async (entityType) => {
        return createEntityStoreState(this.soClient, entityType, this.namespace, config);
      })
    );

    await startEntityStoreESQLExecuteTask(this.namespace, this.taskManager, this.logger);
  }

  public async stopTask() {
    if (!this.taskManager) {
      this.logger.warn(`[Entity Store ESQL] no task manager configured, skipping`);
      return;
    }

    await removeEntityStoreESQLExecuteTask(this.namespace, this.taskManager, this.logger);

    await Promise.all(
      Object.values(EntityType.Values).map(async (entityType) => {
        return deleteEntityStoreState(this.soClient, entityType, this.namespace);
      })
    );
  }

  public async runEntityStoreCycleForAllEntities() {
    await Promise.all(
      Object.values(EntityType.Values)
        .filter((type) => type !== 'generic') // generic is causing problems with mappings, will fix later
        .map(async (entityType) => {
          return this.runEntityStoreCycle(entityType as EntityType);
        })
    );
  }

  async runEntityStoreCycle(type: EntityType) {
    const state = await getEntityStoreState(this.soClient, type, this.namespace);
    const lastExecutionTime = state.lastExecutionTimeISO || defaultLookback();

    const now = moment().toISOString();

    this.logger.info(
      `[Entity Store ESQL] [${type}-${this.namespace}] Searching from ${lastExecutionTime} to ${now}`
    );

    const query = await buildESQLQuery(
      this.namespace,
      type,
      this.appClient,
      this.dataViews,
      lastExecutionTime || defaultLookback(),
      now,
      state.config
    );

    // this.logger.debug(`[Entity Store ESQL] [${type}-${this.namespace}] running query
    // ${query}`);

    const docs = await executeEsqlQuery(this.esClient, query, this.logger);

    await storeEntityStoreDocs(this.esClient, type, this.namespace, docs);

    // this.logger.debug(JSON.stringify(docs, undefined, 2));

    let lastSeenTimestamp;
    if (docs.length > 0) {
      lastSeenTimestamp = docs[docs.length - 1]['@timestamp'] as string;
    } else {
      lastSeenTimestamp = now;
    }

    await updateEntityStoreLastExecutionTime(
      this.soClient,
      type,
      this.namespace,
      lastSeenTimestamp
    );

    this.logger.info(
      `[Entity Store ESQL] [${type}-${this.namespace}] Processed ${docs.length} entities for type`
    );
  }
}
