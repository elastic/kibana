/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  ElasticsearchServiceStart,
  IScopedClusterClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import { runTask } from './lib';
import type { EntityMaintainerRegistry } from './entity_maintainer_registry';
import { EntityStoreCrudClient } from '../entity_store/entity_store_crud_client';

export const ENTITY_MAINTAINER_TASK_TYPE = 'entity_analytics_maintainer';

export interface EntityMaintainerContext {
  entityMaintainerRegistry: EntityMaintainerRegistry;
  entityStoreCrudClient: EntityStoreCrudClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}

interface ConstructorOpts {
  entityMaintainerRegistry: EntityMaintainerRegistry;
  elasticsearchClientPromise: Promise<IScopedClusterClient>;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  spacesService: Promise<SpacesServiceStart | undefined>;
  taskManagerSetup: TaskManagerSetupContract;
}

export class EntityMaintainerClient {
  constructor(private readonly opts: ConstructorOpts) {
    // registers the task that handles entity maintenance
    opts.taskManagerSetup.registerTaskDefinitions({
      [ENTITY_MAINTAINER_TASK_TYPE]: {
        title: 'Entity maintainer task',
        createTaskRunner: ({
          taskInstance,
          abortController,
        }: {
          taskInstance: ConcreteTaskInstance;
          abortController: AbortController;
        }) => ({
          run: async () => this.runTask(taskInstance, abortController),
        }),
      },
    });
  }

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    abortController: AbortController
  ) => {
    const clusterClient = await this.opts.elasticsearchClientPromise;
    const spacesService = await this.opts.spacesService;

    const context = {
      entityMaintainerRegistry: this.opts.entityMaintainerRegistry,
      esClient: clusterClient.asInternalUser,
      logger: this.opts.logger,
      savedObjectsClient: this.opts.savedObjectsClient,
    };

    const entityStoreCrudClient = new EntityStoreCrudClient({
      clusterClient,
      namespace: taskInstance.params.spaceId,
      logger: this.opts.logger,
      dataClient: getEntityStoreDataClient(),
    });
    await runTask(context, taskInstance, abortController);
  };
}
