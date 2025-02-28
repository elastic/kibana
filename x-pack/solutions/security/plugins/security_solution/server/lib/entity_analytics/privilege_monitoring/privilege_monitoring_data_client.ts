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
  AnalyticsServiceSetup,
} from '@kbn/core/server';

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ApiKeyManager } from './auth/api_key';
import { startPrivilegeMonitoringTask } from './tasks/privilege_monitoring_task';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { generateUserIndexMappings, getPrivilegedMonitorUsersIndex } from './indicies';

interface PrivilegeMonitoringClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  taskManager?: TaskManagerStartContract;
  auditLogger?: AuditLogger;
  kibanaVersion: string;
  telemetry?: AnalyticsServiceSetup;
  apiKeyManager?: ApiKeyManager;
}

export class PrivilegeMonitoringDataClient {
  private apiKeyGenerator?: ApiKeyManager;
  private esClient: ElasticsearchClient;

  constructor(private readonly opts: PrivilegeMonitoringClientOpts) {
    this.esClient = opts.clusterClient.asCurrentUser;
    this.apiKeyGenerator = opts.apiKeyManager;
  }

  async init() {
    await this.createOrUpdateIndex();
    if (!this.opts.taskManager) {
      throw new Error('Task Manager is not available');
    }

    await startPrivilegeMonitoringTask({
      logger: this.opts.logger,
      namespace: this.opts.namespace,
      taskManager: this.opts.taskManager,
    });
  }

  public async createOrUpdateIndex() {
    await createOrUpdateIndex({
      esClient: this.esClient,
      logger: this.opts.logger,
      options: {
        index: this.getIndex(),
        mappings: generateUserIndexMappings(),
      },
    });
  }

  public getIndex(){ 
    return getPrivilegedMonitorUsersIndex(this.opts.namespace);
  }
}
