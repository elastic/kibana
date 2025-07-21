/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  IScopedClusterClient,
  SavedObjectsClientContract,
  AuditLogger,
  Logger,
  AuditEvent,
} from '@kbn/core/server';

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EngineComponentResource } from '../../../../../common/api/entity_analytics';
import { getPrivilegedMonitorUsersIndex } from '../../../../../common/entity_analytics/privilege_monitoring/utils';
import type { ApiKeyManager } from '../auth/api_key';
import type {
  PrivilegeMonitoringEngineDescriptorClient,
  MonitoringEntitySourceDescriptorClient,
} from '../saved_objects';
import { PrivilegeMonitoringEngineActions } from '../auditing/actions';
import { AUDIT_OUTCOME, AUDIT_TYPE, AUDIT_CATEGORY } from '../../audit';

interface PrivilegeMonitoringGlobalDependencies {
  namespace: string;
  kibanaVersion: string;

  logger: Logger;
  auditLogger: AuditLogger;
  telemetry: AnalyticsServiceSetup;

  clusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  engineClient: PrivilegeMonitoringEngineDescriptorClient;
  monitoringIndexSourceClient: MonitoringEntitySourceDescriptorClient;

  apiKeyManager?: ApiKeyManager;
  taskManager?: TaskManagerStartContract;
}

/**
 * Entity Analytics Data Clients serve only as wrappers for dependencies and to conform to Kibana plugin architecture.
 */
export class PrivilegeMonitoringDataClient {
  public index: string;
  constructor(public readonly deps: PrivilegeMonitoringGlobalDependencies) {
    this.index = getPrivilegedMonitorUsersIndex(deps.namespace);
  }

  public log(level: Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>, msg: string) {
    this.deps.logger[level](
      `[Privileged Monitoring Engine][namespace: ${this.deps.namespace}] ${msg}`
    );
  }

  public audit(
    action: PrivilegeMonitoringEngineActions,
    resource: EngineComponentResource,
    msg: string,
    error?: Error
  ) {
    // NOTE: Excluding errors, all auditing events are currently WRITE events, meaning the outcome is always UNKNOWN.
    // This may change in the future, depending on the audit action.
    const outcome = error ? AUDIT_OUTCOME.FAILURE : AUDIT_OUTCOME.UNKNOWN;

    const type =
      action === PrivilegeMonitoringEngineActions.CREATE
        ? AUDIT_TYPE.CREATION
        : PrivilegeMonitoringEngineActions.DELETE
        ? AUDIT_TYPE.DELETION
        : AUDIT_TYPE.CHANGE;

    const category = AUDIT_CATEGORY.DATABASE;

    const message = error ? `${msg}: ${error.message}` : msg;
    const event: AuditEvent = {
      message: `[Privilege Monitoring] ${message}`,
      event: {
        action: `${action}_${resource}`,
        category,
        outcome,
        type,
      },
    };

    return this.deps.auditLogger?.log(event);
  }
}
