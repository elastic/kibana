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
  AuditEvent,
} from '@kbn/core/server';

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  EngineComponentResourceEnum,
  type EngineComponentResource,
} from '../../../../common/api/entity_analytics/privilege_monitoring/common.gen';
import type { ApiKeyManager } from './auth/api_key';
import { startPrivilegeMonitoringTask } from './tasks/privilege_monitoring_task';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { generateUserIndexMappings, getPrivilegedMonitorUsersIndex } from './indices';
import { PrivilegeMonitoringEngineDescriptorClient } from './saved_object/privilege_monitoring';
import { PRIVILEGE_MONITORING_ENGINE_STATUS } from './constants';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../audit';
import { PrivilegeMonitoringEngineActions } from './auditing/actions';

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

// TODO: update this - need some openAPI generated types here
interface InitPrivilegedMonitoringEntityEngineResponse {
  status: string;
  apiKey: string;
}

export class PrivilegeMonitoringDataClient {
  private apiKeyGenerator?: ApiKeyManager;
  private esClient: ElasticsearchClient;
  private engineClient: PrivilegeMonitoringEngineDescriptorClient;

  constructor(private readonly opts: PrivilegeMonitoringClientOpts) {
    this.esClient = opts.clusterClient.asCurrentUser;
    this.apiKeyGenerator = opts.apiKeyManager;
    this.engineClient = new PrivilegeMonitoringEngineDescriptorClient({
      soClient: opts.soClient,
      namespace: opts.namespace,
    });
  }

  private async enable() {
    /**
     * TODO: fill this in
     */
  }

  async init(): Promise<InitPrivilegedMonitoringEntityEngineResponse> {
    if (!this.opts.taskManager) {
      throw new Error('Task Manager is not available');
    }

    this.audit(
      PrivilegeMonitoringEngineActions.INIT,
      EngineComponentResourceEnum.privmon_engine,
      'Initializing privilege monitoring engine'
    );

    await this.createOrUpdateIndex().catch((e) => {
      if (e.meta.body.error.type === 'resource_already_exists_exception') {
        this.opts.logger.info('Privilege monitoring index already exists');
      }
    });

    const descriptor = await this.engineClient.init();
    this.log('debug', `Initialized privileged monitoring engine saved object`);

    if (this.apiKeyGenerator) {
      await this.apiKeyGenerator.generate(); // TODO: need this in a saved object?
    }

    try {
      await startPrivilegeMonitoringTask({
        logger: this.opts.logger,
        namespace: this.opts.namespace,
        taskManager: this.opts.taskManager,
      });
    } catch (e) {
      this.log('error', `Error starting privilege monitoring task: ${e}`);
      // TODO: audit failed initialization here
      // TODO: telemetry, report event. Reference entity_store_data_client.ts line 476
      await this.engineClient.update({
        status: PRIVILEGE_MONITORING_ENGINE_STATUS.ERROR,
        error: {
          // TODO: double check this, taken from entity_store_data_client.ts line 480 example.
          message: e.message,
          stack: e.stack,
          action: 'init',
        },
      });
    }

    return descriptor;
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

  public getIndex() {
    return getPrivilegedMonitorUsersIndex(this.opts.namespace);
  }

  private log(level: Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>, msg: string) {
    this.opts.logger[level](
      `[Privileged Monitoring Engine][namespace: ${this.opts.namespace}] ${msg}`
    );
  }

  private audit(
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

    return this.opts.auditLogger?.log(event);
  }
}
