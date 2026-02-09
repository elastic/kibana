/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import type { PrivMonBulkUser } from '../../types';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics';

/**
 * Updates a user's privileged state based on the latest status from a source.
 *
 * - When the new status is `true`:
 *   - Add the source to the `sources` array if not already present
 *   - Set `is_privileged` to `true`
 *
 * - When the new status is `false`:
 *   - Remove the source from the `sources` array
 *   - If no sources remain, set `is_privileged` to `false`
 *
 * This allows multiple sources to independently assert privileged status,
 * with `is_privileged` reflecting if at least one source is active.
 */
export const UPDATE_SCRIPT_SOURCE = `
def src = ctx._source;

if (params.new_privileged_status == false) {
  if (src.user.is_privileged == true) {
    src['@timestamp'] = params.now;
    src.event.ingested = params.now;

    if (src.labels == null) { src.labels = new HashMap(); }
    if (src.labels.sources == null) { src.labels.sources = new ArrayList(); }
    if (src.labels.source_ids == null) { src.labels.source_ids = new ArrayList(); }

    src.labels.source_ids.removeIf(l -> l == params.source_id);
    src.labels.sources.removeIf(l -> l == params.source_type);

    if (src.entity_analytics_monitoring != null && src.entity_analytics_monitoring.labels != null) {
      src.entity_analytics_monitoring.labels.removeIf(l -> l.source == params.source_id);
    }

    if (src.labels.sources.size() == 0) {
      src.user.is_privileged = false;
      ctx._source.user.entity = ctx._source.user.entity != null ? ctx._source.user.entity : new HashMap();
      ctx._source.user.entity.attributes = ctx._source.user.entity.attributes != null ? ctx._source.user.entity.attributes : new HashMap();
      ctx._source.user.entity.attributes.Privileged = false;
    }
  }
} else {
  boolean modified = false;

  if (src.labels == null) { src.labels = new HashMap(); }
  if (src.labels.source_ids == null) { src.labels.source_ids = new ArrayList(); }
  if (!src.labels.source_ids.contains(params.source_id)) {
    src.labels.source_ids.add(params.source_id);
    modified = true;
  }
  if (src.labels.sources == null) { src.labels.sources = new ArrayList(); }
  if (!src.labels.sources.contains(params.source_type)) {
    src.labels.sources.add(params.source_type);
    modified = true;
  }

  if (src.entity_analytics_monitoring == null) { src.entity_analytics_monitoring = new HashMap(); }
  if (src.entity_analytics_monitoring.labels == null) { src.entity_analytics_monitoring.labels = new ArrayList(); }

  if (params.monitoring_labels != null) {
    def toRemove = new ArrayList();
    for (label in src.entity_analytics_monitoring.labels) {
      boolean keep = false;
      for (newLabel in params.monitoring_labels) {
        if (label.source == newLabel.source && label.value == newLabel.value && label.field == newLabel.field) {
          keep = true;
          break;
        }
      }
      if (!keep) {
        toRemove.add(label);
      }
    }
    if (toRemove.size() > 0) {
      modified = true;
      for (label in toRemove) {
        src.entity_analytics_monitoring.labels.remove(label);
      }
    }

    for (label in params.monitoring_labels) {
      boolean exists = false;
      for (existing in src.entity_analytics_monitoring.labels) {
        if (existing.source == label.source && existing.value == label.value && existing.field == label.field) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        src.entity_analytics_monitoring.labels.add(label);
        modified = true;
      }
    }
  }

  if (src.user.is_privileged != true) {
    src.user.is_privileged = true;
    ctx._source.user.entity = ctx._source.user.entity != null ? ctx._source.user.entity : new HashMap();
    ctx._source.user.entity.attributes = ctx._source.user.entity.attributes != null ? ctx._source.user.entity.attributes : new HashMap();
    ctx._source.user.entity.attributes.Privileged = true;
    modified = true;
  }

  if (modified) {
    src['@timestamp'] = params.now;
    src.event.ingested = params.now;
  }
}
`;

type ParamsBuilder<T extends PrivMonBulkUser> = (
  user: T,
  sourceLabel?: Object
) => Record<string, unknown>;

const buildCreateDoc = (user: PrivMonBulkUser, sourceLabel: string) => ({
  '@timestamp': new Date().toISOString(),
  user: {
    name: user.username,
    is_privileged: true,
    entity: { attributes: { Privileged: true } },
  },
  ...(user.monitoringLabels
    ? { entity_analytics_monitoring: { labels: user.monitoringLabels } }
    : {}),
  labels: { sources: [sourceLabel], source_ids: [user.sourceId] },
});

/**
 * Builds a list of bulk operations to upsert privileged users.
 *
 * Allows customization of:
 * - The update script source (updateScriptSource)
 * - The source label used for new documents (sourceLabel)
 * - The parameters passed to the update script (buildUpdateParams)
 * - Creation of new users (shouldCreate)
 *
 * For each user:
 * - If the user already exists (has existingUserId), generates update operation using
 *   updateScriptSource with parameters built by buildUpdateParams(user).
 * - If the user is new and shouldCreate(user) returns true, generates index operation
 *   to create a new document with sourceLabel and user data.
 *
 * Logs steps during ops generation and returns the bulk operations array, for Bulk API.
 *
 * @param dataClient - The Privilege Monitoring Data Client providing access to logging and dependencies.
 * @param users - List of users to create or update.
 * @param updateScriptSource - The Painless script source to use for update operations.
 * @param sourceLabel - The label to use for the source type when creating new documents.
 * @param buildUpdateParams - Function to build parameters for the update script based on user data.
 * @param shouldCreate - Optional function to determine if a new user should be created (defaults to always creating).
 * @returns  Array of bulk operations suitable for the Elasticsearch Bulk API.
 */
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

export const makeOpsBuilder = (dataClient: PrivilegeMonitoringDataClient) => {
  const buildOps = bulkUpsertOperationsFactoryShared(dataClient);
  return (usersChunk: PrivMonBulkUser[], source: MonitoringEntitySource) => {
    let sourceLabel = 'entity_analytics_integration';
    if (source.type === 'index') {
      sourceLabel = 'index'; // want to update source label to index_sync. Currently just index. Related Issue: https://github.com/elastic/security-team/issues/14071
    }
    return buildOps({
      users: usersChunk,
      updateScriptSource: UPDATE_SCRIPT_SOURCE,
      sourceLabel,
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
};
