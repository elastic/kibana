/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import type { PrivMonBulkUser, PrivMonOktaIntegrationsUser } from '../../types';
import { UPDATE_SCRIPT_SOURCE } from '../sync/integrations/update_detection/queries';

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
            `,
              params: {
                source_id: user.sourceId,
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
  sourceLabel: string
) => Record<string, unknown>;

export const bulkUpsertOperationsFactoryShared =
  (dataClient: PrivilegeMonitoringDataClient) =>
  <T extends PrivMonBulkUser>(
    users: T[],
    sourceLabel: string,
    updateScriptSource: string,
    opts: {
      buildUpdateParams: ParamsBuilder<T>;
      buildCreateDoc: ParamsBuilder<T>;
      shouldCreate?: (user: T) => boolean;
    }
  ): object[] => {
    const { buildUpdateParams, buildCreateDoc, shouldCreate = () => true } = opts;
    const ops: object[] = [];
    dataClient.log('info', `Building bulk operations for ${users.length} users`);

    for (const user of users) {
      if (user.existingUserId) {
        ops.push(
          { update: { _index: dataClient.index, _id: user.existingUserId } },
          { script: { source: updateScriptSource, params: buildUpdateParams(user, sourceLabel) } }
        );
      } else if (shouldCreate(user)) {
        ops.push({ index: { _index: dataClient.index } }, buildCreateDoc(user, sourceLabel));
      }
    }
    return ops;
  };

export const makeIntegrationOpsBuilder = (dataClient: PrivilegeMonitoringDataClient) => {
  const buildOps = bulkUpsertOperationsFactoryShared(dataClient);
  return (usersChunk: PrivMonOktaIntegrationsUser[]) =>
    buildOps(usersChunk, 'entity_analytics_integration', UPDATE_SCRIPT_SOURCE, {
      buildUpdateParams: (user, sourceLabel) => ({
        new_privileged_status: user.isPrivileged,
        sourceLabel,
        new_roles: user.roles ?? [],
      }),
      buildCreateDoc: (user, sourceLabel) => ({
        user: { name: user.username, is_privileged: user.isPrivileged },
        roles: user.roles ?? [],
        labels: { sources: [sourceLabel] },
        last_seen: user.lastSeen,
      }),
      shouldCreate: (user) => user.isPrivileged,
    });
};

export const makeIndexOpsBuilder = (dataClient: PrivilegeMonitoringDataClient) => {
  const buildOps = bulkUpsertOperationsFactoryShared(dataClient);
  return (usersChunk: PrivMonBulkUser[]) =>
    buildOps(usersChunk, 'index', INDEX_SCRIPT, {
      buildUpdateParams: (user) => ({ source_id: user.sourceId }),
      buildCreateDoc: (user, sourceLabel) => ({
        user: { name: user.username, is_privileged: true },
        labels: { sources: [sourceLabel], source_ids: [user.sourceId] },
      }),
    });
};
