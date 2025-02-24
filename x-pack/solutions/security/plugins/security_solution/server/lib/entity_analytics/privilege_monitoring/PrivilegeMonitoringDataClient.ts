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
    this.esClient = opts.clusterClient.asInternalUser;
    this.apiKeyGenerator = opts.apiKeyManager;
  }

  init() {
    return Promise.resolve();
  }
}
