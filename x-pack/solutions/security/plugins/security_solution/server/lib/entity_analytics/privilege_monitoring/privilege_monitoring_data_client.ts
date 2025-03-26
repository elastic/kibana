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
import { PrivilegeMonitoringEngineDescriptorClient } from './saved_object/privilege_monitoring';

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
  /**
   *
   * init the engine,
   * kibana task created,
   * create save object with engine status and api key of user who enabled engine --
   * ticket does not say enable, but is this implied? Or just ability of saved object when we want to enable engine?
   * indices created
   *
   * definition and descriptor -- different things. **
   */
  async init(): Promise<InitPrivilegedMonitoringEntityEngineResponse> {
    if (!this.opts.taskManager) {
      throw new Error('Task Manager is not available');
    }

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

    await startPrivilegeMonitoringTask({
      logger: this.opts.logger,
      namespace: this.opts.namespace,
      taskManager: this.opts.taskManager,
    });

    await this.engineClient.update({ status: 'installing' });

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
}
