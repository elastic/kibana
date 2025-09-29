/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import type { PrivMonBulkUser } from '../../types';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics';

/** Script to update privileged status and sources array based on new status from source
 * If new status is false, remove source from sources array, and if sources array is empty, set is_privileged to false
 * If new status is true, add source to sources array if not already present, and set is_privileged to true
 */
export const UPDATE_SCRIPT_SOURCE = `
if (params.new_privileged_status == false) {
  if (ctx._source.user.is_privileged == true) {
    ctx._source['@timestamp'] = params.now;
    ctx._source.event.ingested = params.now;

    if (ctx._source.labels == null) {
      ctx._source.labels = new HashMap();
    }

    if (ctx._source.labels.sources == null) {
      ctx._source.labels.sources = [];
    }

    if (ctx._source.labels.source_ids == null) {
      ctx._source.labels.source_ids = [];
    }

    ctx._source.labels.source_ids.removeIf(l -> l == params.source_id);

    ctx._source.labels.sources.removeIf(l -> l == params.source_type);

    if (ctx._source.entity_analytics_monitoring != null && ctx._source.entity_analytics_monitoring.labels != null) {
      ctx._source.entity_analytics_monitoring.labels.removeIf(l -> l.source == params.source_id);
    }

    if (ctx._source.labels.sources.size() == 0) {
      ctx._source.user.is_privileged = false;
    }
  }
} else if (params.new_privileged_status == true) {
  boolean userModified = false;
  if (ctx._source.labels == null) {
    ctx._source.labels = new HashMap();
  }
  if (ctx._source.labels.source_ids == null) {
    ctx._source.labels.source_ids = new ArrayList();
  }
  if (!ctx._source.labels.source_ids.contains(params.source_id)) {
    ctx._source.labels.source_ids.add(params.source_id);
    userModified = true;
  }
  if (ctx._source.labels.sources == null) {
    ctx._source.labels.sources = new ArrayList();
  }
  if (!ctx._source.labels.sources.contains(params.source_type)) {
    ctx._source.labels.sources.add(params.source_type);
    userModified = true;
  }
  if (ctx._source.entity_analytics_monitoring == null) {
    ctx._source.entity_analytics_monitoring = new HashMap();
  }
  if (ctx._source.entity_analytics_monitoring.labels == null) {
    ctx._source.entity_analytics_monitoring.labels = new ArrayList();
  }
  if (params.monitoring_labels != null) {
    ctx._source.entity_analytics_monitoring.labels.removeIf(l -> l.source == params.source_id);
    for (label in params.monitoring_labels) {
      ctx._source.entity_analytics_monitoring.labels.add(label);
    }
    userModified = true;
  }

  if (ctx._source.user.is_privileged != true) {
    ctx._source.user.is_privileged = true;
    userModified = true;
  }
  
  if (userModified) {
    ctx._source['@timestamp'] = params.now;
    ctx._source.event.ingested = params.now;
  }
}
`;

// TODO: this script is out of date see bulkUpsertOperationsFactory below
export const INDEX_SCRIPT = `
              if (ctx._source.labels == null) {
                ctx._source.labels = new HashMap();
              }
              if (ctx._source.labels.source_ids == null) {
                ctx._source.labels.source_ids = new ArrayList();
              }
              if (!ctx._source.labels.source_ids.contains(params.source_id)) {
                ctx._source.labels.source_ids.add(params.source_id);
              }
              if (!ctx._source.labels.sources.contains("index")) {
                ctx._source.labels.sources.add("index");
              }

              ctx._source.user.is_privileged = true;
            `;
/**
 * Builds a list of Elasticsearch bulk operations to upsert privileged users.
 *
 * For each user:
 * - If the user already exists (has an ID), generates an `update` operation using a Painless script
 *   to append the source id to `labels.source_ids` and ensure `'index'` is listed in `labels.sources`.
 * - If the user is new, generates an `index` operation to create a new document with default labels.
 *
 * Logs key steps during operation generation and returns the bulk operations array, ready for submission to the ES Bulk API.
 *
 * @param dataClient - The Privilege Monitoring Data Client providing access to logging and dependencies.
 *
 * @param users - List of users to create or update.
 * @param userIndexName - Name of the Elasticsearch index where user documents are stored.
 * @returns An array of bulk operations suitable for the Elasticsearch Bulk API.
 */
export const bulkUpsertOperationsFactory =
  (dataClient: PrivilegeMonitoringDataClient) =>
  (users: PrivMonBulkUser[], userIndexName: string): object[] => {
    const ops: object[] = [];
    dataClient.log('info', `Building bulk operations for ${users.length} users`);
    const now = new Date().toISOString();
    for (const user of users) {
      if (user.existingUserId) {
        // Update user with painless script
        dataClient.log(
          'debug',
          `Updating existing user: ${user.username} with ID: ${user.existingUserId}`
        );
        ops.push(
          { update: { _index: userIndexName, _id: user.existingUserId } },
          {
            script: {
              source: `
              boolean userModified = false;
              if (ctx._source.labels == null) {
                ctx._source.labels = new HashMap();
              }
              if (ctx._source.labels.source_ids == null) {
                ctx._source.labels.source_ids = new ArrayList();
              }
              if (!ctx._source.labels.source_ids.contains(params.source_id)) {
                ctx._source.labels.source_ids.add(params.source_id);
                userModified = true;
              }
              if (ctx._source.labels.sources == null) {
                ctx._source.labels.sources = new ArrayList();
              }
              if (!ctx._source.labels.sources.contains("index")) {
                ctx._source.labels.sources.add("index");
                userModified = true;
              }

              if (ctx._source.user.is_privileged != true) {
                ctx._source.user.is_privileged = true;
                userModified = true;
              }
              
              if (userModified) {
                ctx._source['@timestamp'] = params.now;
                ctx._source.event.ingested = params.now;
              }
            `,
              params: {
                source_id: user.sourceId,
                now,
              },
            },
          }
        );
      } else {
        // New user — create
        dataClient.log('info', `Creating new user: ${user.username}`);
        ops.push(
          { index: { _index: userIndexName } },
          {
            '@timestamp': now,
            user: { name: user.username, is_privileged: true },
            labels: {
              sources: ['index'],
              source_ids: [user.sourceId],
            },
          }
        );
      }
    }
    dataClient.log('debug', `Built ${ops.length} bulk operations for users`);
    return ops;
  };

type ParamsBuilder<T extends PrivMonBulkUser> = (
  user: T,
  sourceLabel?: Object
) => Record<string, unknown>;

const buildCreateDoc = (user: PrivMonBulkUser, sourceLabel: string) => ({
  '@timestamp': new Date().toISOString(),
  user: { name: user.username, is_privileged: true },
  ...(user.monitoringLabels
    ? { entity_analytics_monitoring: { labels: user.monitoringLabels } }
    : {}),
  labels: { sources: [sourceLabel], source_ids: [user.sourceId] },
});

export const bulkUpsertOperationsFactoryShared =
  (dataClient: PrivilegeMonitoringDataClient) =>
  <T extends PrivMonBulkUser>({
    users,
    updateScriptSource,
    sourceLabel,
    buildUpdateParams,
    shouldCreate = () => true,
  }: {
    users: T[];
    updateScriptSource: string;
    sourceLabel: string;
    buildUpdateParams: ParamsBuilder<T>;
    shouldCreate?: (user: T) => boolean;
  }): object[] => {
    const ops: object[] = [];
    dataClient.log('debug', `Building bulk operations for ${users.length} users`);
    for (const user of users) {
      if (user.existingUserId) {
        ops.push(
          { update: { _index: dataClient.index, _id: user.existingUserId } },
          { script: { source: updateScriptSource, params: buildUpdateParams(user) } }
        );
      } else if (shouldCreate(user)) {
        ops.push({ index: { _index: dataClient.index } }, buildCreateDoc(user, sourceLabel));
      }
    }
    return ops;
  };

export const makeIntegrationOpsBuilder = (dataClient: PrivilegeMonitoringDataClient) => {
  const buildOps = bulkUpsertOperationsFactoryShared(dataClient);

  return (usersChunk: PrivMonBulkUser[], source: MonitoringEntitySource) =>
    buildOps({
      users: usersChunk,
      updateScriptSource: UPDATE_SCRIPT_SOURCE,
      sourceLabel: 'entity_analytics_integration',
      buildUpdateParams: (user) => ({
        new_privileged_status: user.isPrivileged,
        monitoring_labels: user.monitoringLabels,
        now: new Date().toISOString(),
        source_id: source.id,
        source_type: source.type,
      }),
      shouldCreate: (user) => user.isPrivileged,
    });
};

export const makeIndexOpsBuilder = (dataClient: PrivilegeMonitoringDataClient) => {
  const buildOps = bulkUpsertOperationsFactoryShared(dataClient);
  const indexOperations = (usersChunk: PrivMonBulkUser[]) =>
    buildOps({
      users: usersChunk,
      updateScriptSource: INDEX_SCRIPT,
      sourceLabel: 'index_sync',
      buildUpdateParams: (user) => ({ source_id: user.sourceId }),
    });
  return indexOperations;
};
