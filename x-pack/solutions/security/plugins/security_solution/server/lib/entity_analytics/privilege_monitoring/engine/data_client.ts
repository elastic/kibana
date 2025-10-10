/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  AuditLogger,
  IScopedClusterClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientProviderOptions,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ExperimentalFeatures } from '@kbn/experimental-features';
import type { MonitoringEngineComponentResource } from '../../../../../common/api/entity_analytics';
import { getPrivilegedMonitorUsersIndex } from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import type { ApiKeyManager } from '../auth/api_key';
import type { PrivilegeMonitoringEngineActions } from '../auditing/actions';
import { monitoringEntitySourceType } from '../saved_objects';
import type { PrivMonLogger, PrivMonLogLevel } from '../logger';
import { createPrivMonLogger } from '../logger';
import type { PrivMonAuditLogger } from '../audit_logger';
import { createPrivMonAuditLogger } from '../audit_logger';

export interface PrivilegeMonitoringGlobalDependencies {
  namespace: string;
  kibanaVersion: string;

  logger: Logger;
  auditLogger?: AuditLogger;
  telemetry: AnalyticsServiceSetup;

  clusterClient: IScopedClusterClient;
  savedObjects: SavedObjectsServiceStart;

  apiKeyManager?: ApiKeyManager;
  taskManager?: TaskManagerStartContract;

  experimentalFeatures?: ExperimentalFeatures;
}

/**
 * Privmon data client serves only as a wrapper for plugin/request dependencies and common, global actions
 */
export class PrivilegeMonitoringDataClient {
  public index: string;
  public logger: PrivMonLogger;
  public auditLogger: PrivMonAuditLogger;

  constructor(public readonly deps: PrivilegeMonitoringGlobalDependencies) {
    this.index = getPrivilegedMonitorUsersIndex(deps.namespace);
    this.deps.experimentalFeatures = deps.experimentalFeatures;
    this.logger = createPrivMonLogger(this.deps.logger, this.deps.namespace);
    this.auditLogger = createPrivMonAuditLogger(this.deps.auditLogger);
  }

  public getScopedSoClient(request: KibanaRequest, options?: SavedObjectsClientProviderOptions) {
    const includedHiddenTypes = options?.includedHiddenTypes ?? [monitoringEntitySourceType.name];
    return this.deps.savedObjects.getScopedClient(request, { ...options, includedHiddenTypes });
  }

  public log(level: PrivMonLogLevel, msg: string) {
    this.logger.log(level, msg);
  }

  public audit(
    action: PrivilegeMonitoringEngineActions,
    resource: MonitoringEngineComponentResource,
    msg: string,
    error?: Error
  ) {
    this.auditLogger.log(action, resource, msg, error);
  }
}
