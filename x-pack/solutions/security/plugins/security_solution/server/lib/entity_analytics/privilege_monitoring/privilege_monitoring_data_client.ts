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
import moment from 'moment';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { merge } from 'lodash';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import {
  defaultMonitoringUsersIndex,
  getPrivilegedMonitorUsersIndex,
} from '../../../../common/entity_analytics/privilege_monitoring/constants';
import type { UpdatePrivMonUserRequestBody } from '../../../../common/api/entity_analytics/privilege_monitoring/users/update.gen';

import type {
  CreatePrivMonUserRequestBody,
  CreatePrivMonUserResponse,
} from '../../../../common/api/entity_analytics/privilege_monitoring/users/create.gen';
import type { InitMonitoringEngineResponse } from '../../../../common/api/entity_analytics/privilege_monitoring/engine/init.gen';
import type { MonitoredUserDoc } from '../../../../common/api/entity_analytics/privilege_monitoring/users/common.gen';
import {
  EngineComponentResourceEnum,
  type EngineComponentResource,
} from '../../../../common/api/entity_analytics/privilege_monitoring/common.gen';
import type { ApiKeyManager } from './auth/api_key';
import { startPrivilegeMonitoringTask } from './tasks/privilege_monitoring_task';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { generateUserIndexMappings } from './indices';

import {
  POST_EXCLUDE_INDICES,
  PRE_EXCLUDE_INDICES,
  PRIVILEGE_MONITORING_ENGINE_STATUS,
} from './constants';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../audit';
import { PrivilegeMonitoringEngineActions } from './auditing/actions';
import {
  PRIVMON_ENGINE_INITIALIZATION_EVENT,
  PRIVMON_ENGINE_RESOURCE_INIT_FAILURE_EVENT,
} from '../../telemetry/event_based/events';
import type { PrivMonUserSource } from './types';
import type { MonitoringEntitySourceDescriptor } from './saved_objects';
import {
  PrivilegeMonitoringEngineDescriptorClient,
  MonitoringEntitySourceDescriptorClient,
} from './saved_objects';

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
  private internalUserClient: ElasticsearchClient;
  private engineClient: PrivilegeMonitoringEngineDescriptorClient;
  private monitoringIndexSourceClient: MonitoringEntitySourceDescriptorClient;

  constructor(private readonly opts: PrivilegeMonitoringClientOpts) {
    this.esClient = opts.clusterClient.asCurrentUser;
    this.internalUserClient = opts.clusterClient.asInternalUser;
    this.apiKeyGenerator = opts.apiKeyManager;
    this.engineClient = new PrivilegeMonitoringEngineDescriptorClient({
      soClient: opts.soClient,
      namespace: opts.namespace,
    });
    this.monitoringIndexSourceClient = new MonitoringEntitySourceDescriptorClient({
      soClient: opts.soClient,
      namespace: opts.namespace,
    });
  }

  async init(): Promise<InitMonitoringEngineResponse> {
    if (!this.opts.taskManager) {
      throw new Error('Task Manager is not available');
    }
    const setupStartTime = moment().utc().toISOString();

    this.audit(
      PrivilegeMonitoringEngineActions.INIT,
      EngineComponentResourceEnum.privmon_engine,
      'Initializing privilege monitoring engine'
    );

    const descriptor = await this.engineClient.init();
    this.log('debug', `Initialized privileged monitoring engine saved object`);
    // create default index source for privilege monitoring
    const indexSourceDescriptor = await this.monitoringIndexSourceClient.create({
      type: 'index',
      managed: true,
      indexPattern: defaultMonitoringUsersIndex,
      name: 'default-monitoring-index',
    });
    this.log(
      'debug',
      `Created index source for privilege monitoring: ${JSON.stringify(indexSourceDescriptor)}`
    );
    try {
      await this.createOrUpdateIndex().catch((e) => {
        if (e.meta.body.error.type === 'resource_already_exists_exception') {
          this.opts.logger.info('Privilege monitoring index already exists');
        }
      });

      if (this.apiKeyGenerator) {
        await this.apiKeyGenerator.generate();
      }

      await startPrivilegeMonitoringTask({
        logger: this.opts.logger,
        namespace: this.opts.namespace,
        taskManager: this.opts.taskManager,
      });

      const setupEndTime = moment().utc().toISOString();
      const duration = moment(setupEndTime).diff(moment(setupStartTime), 'seconds');
      this.opts.telemetry?.reportEvent(PRIVMON_ENGINE_INITIALIZATION_EVENT.eventType, {
        duration,
      });
      // sync all index users from monitoring sources
      // await this.syncAllIndexUsers();
      await this.plainIndexSync();
    } catch (e) {
      this.log('error', `Error initializing privilege monitoring engine: ${e}`);
      this.audit(
        PrivilegeMonitoringEngineActions.INIT,
        EngineComponentResourceEnum.privmon_engine,
        'Failed to initialize privilege monitoring engine',
        e
      );

      this.opts.telemetry?.reportEvent(PRIVMON_ENGINE_RESOURCE_INIT_FAILURE_EVENT.eventType, {
        error: e.message,
      });

      await this.engineClient.update({
        status: PRIVILEGE_MONITORING_ENGINE_STATUS.ERROR,
        error: {
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
      esClient: this.internalUserClient,
      logger: this.opts.logger,
      options: {
        index: this.getIndex(),
        mappings: generateUserIndexMappings(),
        settings: {
          hidden: true,
          mode: 'lookup',
        },
      },
    });
  }

  public async searchPrivilegesIndices(query: string | undefined) {
    const { indices } = await this.esClient.fieldCaps({
      index: [query ? `*${query}*` : '*', ...PRE_EXCLUDE_INDICES],
      types: ['keyword'],
      fields: ['user.name'], // search for indices with field 'user.name' of type 'keyword'
      include_unmapped: false,
      ignore_unavailable: true,
      allow_no_indices: true,
      expand_wildcards: 'open',
      include_empty_fields: false,
      filters: '-parent',
    });

    if (!Array.isArray(indices) || indices.length === 0) {
      return [];
    }

    return indices.filter(
      (name) => !POST_EXCLUDE_INDICES.some((pattern) => name.startsWith(pattern))
    );
  }

  public getIndex() {
    return getPrivilegedMonitorUsersIndex(this.opts.namespace);
  }

  public async createUser(
    user: CreatePrivMonUserRequestBody,
    source: PrivMonUserSource
  ): Promise<CreatePrivMonUserResponse> {
    const doc = merge(user, {
      labels: {
        monitoring: { privileged_users: 'monitored' },
        sources: [source],
      },
    });
    const res = await this.esClient.index({
      index: this.getIndex(),
      refresh: 'wait_for',
      document: doc,
    });

    const newUser = await this.getUser(res._id);
    if (!newUser) {
      throw new Error(`Failed to create user: ${res._id}`);
    }
    return newUser;
  }

  public async getUser(id: string): Promise<MonitoredUserDoc | undefined> {
    const response = await this.esClient.get<MonitoredUserDoc>({
      index: this.getIndex(),
      id,
    });
    return response.found
      ? ({ ...response._source, id: response._id } as MonitoredUserDoc)
      : undefined;
  }

  public async updateUser(
    id: string,
    user: UpdatePrivMonUserRequestBody
  ): Promise<MonitoredUserDoc | undefined> {
    await this.esClient.update<MonitoredUserDoc>({
      index: this.getIndex(),
      refresh: 'wait_for',
      id,
      doc: user,
    });
    return this.getUser(id);
  }

  public async deleteUser(id: string): Promise<void> {
    await this.esClient.delete({
      index: this.getIndex(),
      id,
    });
  }

  public async listUsers(kuery?: string): Promise<MonitoredUserDoc[]> {
    const query = kuery ? toElasticsearchQuery(fromKueryExpression(kuery)) : { match_all: {} };
    const response = await this.esClient.search({
      index: this.getIndex(),
      query,
    });
    return response.hits.hits.map((hit) => ({
      id: hit._id,
      ...(hit._source as {}),
    })) as MonitoredUserDoc[];
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

  // --- Privileged User Sync Orchestration ---
  // These methods coordinate syncing users from monitoring sources.
  public async syncAllIndexUsers() {
    // get all monitoring index source saved objects of type 'index'
    const indexSources: MonitoringEntitySourceDescriptor[] =
      await this.monitoringIndexSourceClient.findByIndex();
    this.log(
      'debug',
      `Found index sources for privilege monitoring:\n${JSON.stringify(indexSources, null, 2)}`
    );
    // get usernames from each index source
    const allUserNames = new Set<string>();

    for (const source of indexSources) {
      const index = source.indexPattern ?? '';
      const kuery =
        typeof source.filter?.kuery === 'string' ? (source.filter.kuery as string) : undefined;
      try {
        // store / sync usernames in internal privileged users index
        const usernames = await this.createUsersFromIndexSource(index, kuery);
        usernames.forEach((username) => allUserNames.add(username));
      } catch (error) {
        this.log('error', `Failed to sync users from index ${index}: ${error}`);
      }
    }
    await this.removeStaleIndexUsers(allUserNames);
  }

  public async plainIndexSync() {
    // get all monitoring index source saved objects of type 'index'
    const indexSources: MonitoringEntitySourceDescriptor[] =
      await this.monitoringIndexSourceClient.findByIndex();
    this.log(
      'debug',
      `Found index sources for privilege monitoring:\n${JSON.stringify(indexSources, null, 2)}`
    );
    const seenUserNames: string[] = [];
    for (const source of indexSources) {
      const index = source.indexPattern ?? '';
      const kuery = typeof source.filter?.kuery === 'string' ? source.filter.kuery : undefined;
      const batchUserNames = await this.getAllUsernamesFromIndex(index, kuery);
      seenUserNames.push(...batchUserNames);
    }
    this.log('debug', `Total usernames collected: ${seenUserNames.length}`);
  }

  public async createUsersFromIndexSource(indexName: string, kuery?: string): Promise<Set<string>> {
    const query = kuery ? toElasticsearchQuery(fromKueryExpression(kuery)) : { match_all: {} };

    const response = await this.esClient.search<{ user?: { name?: string } }>({
      index: indexName,
      _source: ['user.name'],
      query,
    });

    const usernames = new Set<string>();

    for (const hit of response.hits.hits) {
      const username = hit._source?.user?.name;
      if (username && !usernames.has(username)) {
        usernames.add(username);
        this.createUser({ user: { name: username } }, 'index_sync');
      }
    }
    return usernames;
  }

  public async removeStaleIndexUsers(currentUsernames: Set<string>) {
    const existingDocs: MonitoredUserDoc[] = await this.listUsers('labels.sources: "index_sync"');
    const staleUserIds: string[] = [];

    for (const doc of existingDocs) {
      if (doc.user?.name && !currentUsernames.has(doc.user.name) && doc.id) {
        this.log(
          'debug',
          `User ${doc.user.name} (ID: ${doc.id}) is stale and will be removed from index_sync`
        );
        staleUserIds.push(doc.id);
      }
    }

    await Promise.all(staleUserIds.map((id) => this.deleteUser(id)));
    this.log('debug', `Removed ${staleUserIds.length} stale users from index_sync`);
  }

  public async getAllUsernamesFromIndex(indexName: string, kuery?: string): Promise<string[]> {
    const batchUsernames: string[] = [];
    let searchAfter: SortResults | undefined;
    const batchSize = 100; // Make a const

    const query = kuery ? toElasticsearchQuery(fromKueryExpression(kuery)) : { match_all: {} };

    while (true) {
      const response = await this.esClient.search<{ user?: { name?: string } }>({
        index: indexName,
        size: batchSize,
        _source: ['user.name'],
        sort: [{ 'user.name.keyword': 'asc' }],
        search_after: searchAfter,
        query,
      });

      const hits = response.hits.hits;
      if (hits.length === 0) break;

      for (const hit of hits) {
        const username = hit._source?.user?.name;
        if (username) batchUsernames.push(username);
      }

      searchAfter = hits[hits.length - 1].sort;

      this.log(
        'debug',
        `Fetched ${hits.length} usernames from ${indexName}, total so far: ${batchUsernames.length}`
      );
    }

    return batchUsernames;
  }
}
