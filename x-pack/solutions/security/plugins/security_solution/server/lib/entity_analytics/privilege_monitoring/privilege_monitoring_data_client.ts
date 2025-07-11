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
import Papa from 'papaparse';
import { Readable } from 'stream';

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { PrivmonBulkUploadUsersCSVResponse } from '../../../../common/api/entity_analytics/privilege_monitoring/users/upload_csv.gen';
import type { HapiReadableStream } from '../../../types';
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
import {
  PRIVILEGED_MONITOR_IMPORT_USERS_INDEX_MAPPING,
  generateUserIndexMappings,
} from './elasticsearch/indices';
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

import { batchPartitions } from '../shared/streams/batching';
import { queryExistingUsers } from './users/query_existing_users';
import { bulkUpsertBatch } from './users/bulk/upsert_batch';
import type { SoftDeletionResults } from './users/soft_delete_omitted_users';
import { softDeleteOmittedUsers } from './users/soft_delete_omitted_users';
import { privilegedUserParserTransform } from './users/privileged_user_parse_transform';
import type { Accumulator } from './users/bulk/utils';
import { accumulateUpsertResults } from './users/bulk/utils';
import type { PrivMonBulkUser, PrivMonUserSource } from './types';
import {
  PrivilegeMonitoringEngineDescriptorClient,
  MonitoringEntitySourceDescriptorClient,
} from './saved_objects';
import {
  PRIVMON_EVENT_INGEST_PIPELINE_ID,
  eventIngestPipeline,
} from './elasticsearch/pipelines/event_ingested';

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
    const currentEngineStatus = await this.getEngineStatus();
    if (currentEngineStatus.status === PRIVILEGE_MONITORING_ENGINE_STATUS.STARTED) {
      this.log(
        'debug',
        'Privilege monitoring engine is already initialized, skipping initialization.'
      );
      return this.engineClient.get();
    }
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
      this.log('debug', 'Creating privilege user monitoring event.ingested pipeline');
      await this.createIngestPipelineIfDoesNotExist();

      await this.createOrUpdateIndex().catch((e) => {
        if (e.meta.body.error.type === 'resource_already_exists_exception') {
          this.opts.logger.info('Privilege monitoring index already exists');
        } else {
          throw e;
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

  async getEngineStatus() {
    const engineDescriptor = await this.engineClient.get();

    return {
      status: engineDescriptor.status,
      error: engineDescriptor.error,
    };
  }

  public async createOrUpdateIndex() {
    this.log('info', `Creating or updating index: ${this.getIndex()}`);
    await createOrUpdateIndex({
      esClient: this.internalUserClient,
      logger: this.opts.logger,
      options: {
        index: this.getIndex(),
        mappings: generateUserIndexMappings(),
        settings: {
          hidden: true,
          mode: 'lookup',
          default_pipeline: PRIVMON_EVENT_INGEST_PIPELINE_ID,
        },
      },
    });
  }

  public async doesIndexExist() {
    try {
      return await this.internalUserClient.indices.exists({
        index: this.getIndex(),
      });
    } catch (e) {
      return false;
    }
  }

  public async createIngestPipelineIfDoesNotExist() {
    const pipelinesResponse = await this.internalUserClient.ingest.getPipeline(
      { id: PRIVMON_EVENT_INGEST_PIPELINE_ID },
      { ignore: [404] }
    );
    if (!pipelinesResponse[PRIVMON_EVENT_INGEST_PIPELINE_ID]) {
      this.log('info', 'Privileged user monitoring ingest pipeline does not exist, creating.');
      await this.internalUserClient.ingest.putPipeline(eventIngestPipeline);
    } else {
      this.log('info', 'Privileged user monitoring ingest pipeline already exists.');
    }
  }

  /**
   * This creates an index for the user to populate privileged users.
   * It already defines the mappings and settings for the index.
   */
  public createPrivilegesImportIndex(indexName: string, mode: 'lookup' | 'standard') {
    this.log('info', `Creating privileges import index: ${indexName} with mode: ${mode}`);
    // Use the current user client to create the index, the internal user does not have permissions to any index
    return this.esClient.indices.create({
      index: indexName,
      mappings: { properties: PRIVILEGED_MONITOR_IMPORT_USERS_INDEX_MAPPING },
      settings: {
        mode,
      },
    });
  }

  public async searchPrivilegesIndices(query: string | undefined) {
    const { indices, fields } = await this.esClient.fieldCaps({
      index: [query ? `*${query}*` : '*', ...PRE_EXCLUDE_INDICES],
      types: ['keyword'],
      fields: ['user.name'],
      include_unmapped: true,
      ignore_unavailable: true,
      allow_no_indices: true,
      expand_wildcards: 'open',
      include_empty_fields: true,
      filters: '-parent',
    });

    const indicesWithUserName = fields['user.name']?.keyword?.indices ?? indices;

    if (!Array.isArray(indicesWithUserName) || indicesWithUserName.length === 0) {
      return [];
    }

    return indicesWithUserName.filter(
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
      user: {
        is_privileged: true,
      },
      labels: {
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
      size: 10000,
      index: this.getIndex(),
      query,
    });
    return response.hits.hits.map((hit) => ({
      id: hit._id,
      ...(hit._source as {}),
    })) as MonitoredUserDoc[];
  }

  public async uploadUsersCSV(
    stream: HapiReadableStream,
    { retries, flushBytes }: { retries: number; flushBytes: number }
  ): Promise<PrivmonBulkUploadUsersCSVResponse> {
    const csvStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
      header: false,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    const res = Readable.from(stream.pipe(csvStream))
      .pipe(privilegedUserParserTransform())
      .pipe(batchPartitions(100)) // we cant use .map() because we need to hook into the stream flush to finish the last batch
      .map(queryExistingUsers(this.esClient, this.getIndex()))
      .map(bulkUpsertBatch(this.esClient, this.getIndex(), { flushBytes, retries }))
      .reduce(accumulateUpsertResults, {
        users: [],
        errors: [],
        failed: 0,
        successful: 0,
      } satisfies Accumulator)

      .then(softDeleteOmittedUsers(this.esClient, this.getIndex(), { flushBytes, retries }))
      .then((results: SoftDeletionResults) => {
        return {
          errors: results.updated.errors.concat(results.deleted.errors),
          stats: {
            failed: results.updated.failed + results.deleted.failed,
            successful: results.updated.successful + results.deleted.successful,
            total:
              results.updated.failed +
              results.updated.successful +
              results.deleted.failed +
              results.deleted.successful,
          },
        };
      });

    return res;
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

  /**
   * Synchronizes users from monitoring index sources and soft-deletes (mark as not privileged) stale entries.
   *
   * This method:
   * - Retrieves all saved objects of type 'index' that define monitoring sources.
   * - For each valid source with an index pattern, fetches usernames from the monitoring index.
   * - Identifies users no longer present in the source index (stale users).
   * - Performs a bulk soft-delete (marks as not privileged) for all stale users found.
   * - Handles missing indices gracefully by logging a warning and skipping them.
   *
   * Additionally, all users from index sources are synced with the internal privileged user index,
   * ensuring each user is either created or updated with the latest data.
   *
   * @returns {Promise<void>} Resolves when synchronization and soft-deletion are complete.
   */
  public async plainIndexSync() {
    // get all monitoring index source saved objects of type 'index'
    const indexSources = await this.monitoringIndexSourceClient.findByIndex();
    if (indexSources.length === 0) {
      this.log('debug', 'No monitoring index sources found. Skipping sync.');
      return;
    }
    const allStaleUsers: PrivMonBulkUser[] = [];

    for (const source of indexSources) {
      // eslint-disable-next-line no-continue
      if (!source.indexPattern) continue; // if no index pattern, skip this source
      const index: string = source.indexPattern;

      try {
        const batchUserNames = await this.syncUsernamesFromIndex({
          indexName: index,
          kuery: source.filter?.kuery,
        });
        // collect stale users
        const staleUsers = await this.findStaleUsersForIndex(index, batchUserNames);
        allStaleUsers.push(...staleUsers);
      } catch (error) {
        if (
          error?.meta?.body?.error?.type === 'index_not_found_exception' ||
          error?.message?.includes('index_not_found_exception')
        ) {
          this.log('warn', `Index "${index}" not found — skipping.`);
          // eslint-disable-next-line no-continue
          continue;
        }
        this.log('error', `Unexpected error during sync for index "${index}": ${error.message}`);
      }
    }
    // Soft delete stale users
    this.log('debug', `Found ${allStaleUsers.length} stale users across all index sources.`);
    if (allStaleUsers.length > 0) {
      const ops = this.bulkOperationsForSoftDeleteUsers(allStaleUsers, this.getIndex());
      await this.esClient.bulk({ body: ops });
    }
  }

  /**
   * Synchronizes usernames from a specified index by collecting them in batches
   * and performing create or update operations in the privileged user index.
   *
   * This method:
   * - Executes a paginated search on the provided index (with optional KQL filter).
   * - Extracts `user.name` values from each document.
   * - Checks for existing monitored users to determine if each username should be created or updated.
   * - Performs bulk operations to insert or update users in the internal privileged user index.
   *
   * Designed to support large indices through pagination (`search_after`) and batching.
   * Logs each step and handles errors during bulk writes.
   *
   * @param indexName - Name of the Elasticsearch index to pull usernames from.
   * @param kuery - Optional KQL filter to narrow down results.
   * @returns A list of all usernames processed from the source index.
   */
  public async syncUsernamesFromIndex({
    indexName,
    kuery,
  }: {
    indexName: string;
    kuery?: string | unknown;
  }): Promise<string[]> {
    const batchUsernames: string[] = [];
    let searchAfter: SortResults | undefined;
    const batchSize = 100;

    const query = kuery ? toElasticsearchQuery(fromKueryExpression(kuery)) : { match_all: {} };
    while (true) {
      const response = await this.searchUsernamesInIndex({
        indexName,
        batchSize,
        searchAfter,
        query,
      });

      const hits = response.hits.hits;
      if (hits.length === 0) break;

      // Collect usernames from the hits
      for (const hit of hits) {
        const username = hit._source?.user?.name;
        if (username) batchUsernames.push(username);
      }

      const existingUserRes = await this.getMonitoredUsers(batchUsernames);

      const existingUserMap = new Map<string, string | undefined>();
      for (const hit of existingUserRes.hits.hits) {
        const username = hit._source?.user?.name;
        this.log('debug', `Found existing user: ${username} with ID: ${hit._id}`);
        if (username) existingUserMap.set(username, hit._id);
      }

      const usersToWrite: PrivMonBulkUser[] = batchUsernames.map((username) => ({
        username,
        indexName,
        existingUserId: existingUserMap.get(username),
      }));

      if (usersToWrite.length === 0) return batchUsernames;

      const ops = this.buildBulkOperationsForUsers(usersToWrite, this.getIndex());
      this.log('debug', `Executing bulk operations for ${usersToWrite.length} users`);
      try {
        this.log('debug', `Bulk ops preview:\n${JSON.stringify(ops, null, 2)}`);
        await this.esClient.bulk({ body: ops });
      } catch (error) {
        this.log('error', `Error executing bulk operations: ${error}`);
      }
      searchAfter = hits[hits.length - 1].sort;
    }
    return batchUsernames;
  }

  private async findStaleUsersForIndex(
    indexName: string,
    userNames: string[]
  ): Promise<PrivMonBulkUser[]> {
    const response = await this.esClient.search<MonitoredUserDoc>({
      index: this.getIndex(),
      size: 10, // check this
      _source: ['user.name', 'labels.source_indices'],
      query: {
        bool: {
          must: [
            { term: { 'user.is_privileged': true } },
            { term: { 'labels.source_indices.keyword': indexName } },
          ],
          must_not: {
            terms: { 'user.name': userNames },
          },
        },
      },
    });

    return response.hits.hits.map((hit) => ({
      username: hit._source?.user?.name ?? 'unknown',
      existingUserId: hit._id,
      indexName,
    }));
  }

  public async getMonitoredUsers(batchUsernames: string[]) {
    return this.esClient.search<MonitoredUserDoc>({
      index: this.getIndex(),
      size: batchUsernames.length,
      query: {
        bool: {
          must: [{ terms: { 'user.name': batchUsernames } }],
        },
      },
    });
  }

  /**
   * Builds a list of Elasticsearch bulk operations to upsert privileged users.
   *
   * For each user:
   * - If the user already exists (has an ID), generates an `update` operation using a Painless script
   *   to append the index name to `labels.source_indices` and ensure `'index'` is listed in `labels.sources`.
   * - If the user is new, generates an `index` operation to create a new document with default labels.
   *
   * Logs key steps during operation generation and returns the bulk operations array, ready for submission to the ES Bulk API.
   *
   * @param users - List of users to create or update.
   * @param userIndexName - Name of the Elasticsearch index where user documents are stored.
   * @returns An array of bulk operations suitable for the Elasticsearch Bulk API.
   */
  public buildBulkOperationsForUsers(users: PrivMonBulkUser[], userIndexName: string): object[] {
    const ops: object[] = [];
    this.log('info', `Building bulk operations for ${users.length} users`);
    for (const user of users) {
      if (user.existingUserId) {
        // Update user with painless script
        this.log(
          'info',
          `Updating existing user: ${user.username} with ID: ${user.existingUserId}`
        );
        ops.push(
          { update: { _index: userIndexName, _id: user.existingUserId } },
          {
            script: {
              source: `
              if (!ctx._source.labels.source_indices.contains(params.index)) {
                ctx._source.labels.source_indices.add(params.index);
              }
              if (!ctx._source.labels.sources.contains("index")) {
                ctx._source.labels.sources.add("index");
              }
            `,
              params: {
                index: user.indexName,
              },
            },
          }
        );
      } else {
        // New user — create
        this.log('info', `Creating new user: ${user.username} with index: ${user.indexName}`);
        ops.push(
          { index: { _index: userIndexName } },
          {
            user: { name: user.username, is_privileged: true },
            labels: {
              sources: ['index'],
              source_indices: [user.indexName],
            },
          }
        );
      }
    }
    this.log('info', `Built ${ops.length} bulk operations for users`);
    return ops;
  }

  /**
   * Builds bulk operations to soft-delete users by updating their privilege status.
   *
   * For each user:
   * - Removes the specified `index` from `labels.source_indices`.
   * - If no source indices remain, removes `'index'` from `labels.sources`.
   * - If no sources remain, sets `user.is_privileged` to `false`, effectively marking the user as no longer privileged.
   *
   * These operations are used to clean up users that are no longer found in the associated index sources
   * without deleting their documents entirely.
   *
   * @param users - Users to be soft-deleted based on missing index source association.
   * @param userIndexName - The Elasticsearch index where user documents are stored.
   * @returns An array of bulk update operations compatible with the Elasticsearch Bulk API.
   */
  public bulkOperationsForSoftDeleteUsers(
    users: PrivMonBulkUser[],
    userIndexName: string
  ): object[] {
    const ops: object[] = [];
    this.log('info', `Building bulk operations for soft delete users`);
    for (const user of users) {
      ops.push(
        { update: { _index: userIndexName, _id: user.existingUserId } },
        {
          script: {
            source: `
            if (ctx._source.labels?.source_indices != null) {
              ctx._source.labels.source_indices.removeIf(idx -> idx == params.index);
            }

            if (ctx._source.labels?.source_indices == null || ctx._source.labels.source_indices.isEmpty()) {
              if (ctx._source.labels?.sources != null) {
                ctx._source.labels.sources.removeIf(src -> src == 'index');
              }
            }

            if (ctx._source.labels?.sources == null || ctx._source.labels.sources.isEmpty()) {
              ctx._source.user.is_privileged = false;
            }
          `,
            params: {
              index: user.indexName,
            },
          },
        }
      );
    }

    return ops;
  }

  async searchUsernamesInIndex({
    indexName,
    batchSize,
    searchAfter,
    query,
  }: {
    indexName: string;
    batchSize: number;
    searchAfter?: SortResults;
    query: object;
  }) {
    return this.esClient.search<{ user?: { name?: string } }>({
      index: indexName,
      size: batchSize,
      _source: ['user.name'],
      sort: [{ 'user.name': 'asc' }],
      search_after: searchAfter,
      query,
    });
  }
}
