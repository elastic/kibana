/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Matcher } from '../../../constants';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import type { AfterKey } from './privileged_status_match';
import type { PrivMonOktaIntegrationsUser } from '../../../../types';
import { makeIntegrationOpsBuilder } from '../../../bulk/upsert';

// First step -- see which are privileged via matchers
export const buildMatcherScript = (matcher?: Matcher): estypes.Script => {
  if (!matcher || matcher.fields.length === 0 || matcher.values.length === 0) {
    throw new Error('Invalid matcher: fields and values must be defined and non-empty');
  }

  return {
    lang: 'painless',
    params: {
      matcher_fields: matcher.fields,
      matcher_values: matcher.values,
    },
    source: `
      for (def f : params.matcher_fields) {
        if (doc.containsKey(f) && !doc[f].empty) {
          for (def v : doc[f]) {
            if (params.matcher_values.contains(v)) return true;
          }
        }
      }
      return false;
    `,
  };
};
// First step -- see which are privileged via matchers
export const buildPrivilegedSearchBody = (
  script: estypes.Script,
  timeGte: string = 'now-10y',
  afterKey?: AfterKey,
  pageSize: number = 20
): Omit<estypes.SearchRequest, 'index'> => ({
  size: 0,
  query: {
    range: { '@timestamp': { gte: timeGte } },
  },
  aggs: {
    privileged_user_status_since_last_run: {
      composite: {
        size: pageSize,
        sources: [{ username: { terms: { field: 'user.name' } } }],
        ...(afterKey ? { after: afterKey } : {}),
      },
      aggs: {
        latest_doc_for_user: {
          top_hits: {
            size: 1,
            sort: [{ '@timestamp': { order: 'desc' as estypes.SortOrder } }],
            script_fields: { 'user.is_privileged': { script } },
            _source: { includes: ['user', 'roles', '@timestamp'] },
          },
        },
      },
    },
  },
});

// Script to update privileged status and sources array based on new status from source
// If new status is false, remove source from sources array, and if sources array is empty, set is_privileged to false
// If new status is true, add source to sources array if not already present, and set is_privileged to true

// Note: this script does not update last_seen or roles, those should be handled separately if needed: will need to update
export const UPDATE_SCRIPT_SOURCE = `
if (params.new_privileged_status == false) {
  if (ctx._source.user.is_privileged == true) {
    if (ctx._source.labels.sources == null) {
      ctx._source.labels.sources = [];
    }
    ctx._source.labels.sources.removeIf(s -> java.util.Objects.equals(s, params.sourceLabel));
    if (ctx._source.labels.sources.size() == 0) {
      ctx._source.user.is_privileged = false;
    }
  }
} else if (params.new_privileged_status == true) {
  if (ctx._source.labels.sources == null) {
    ctx._source.labels.sources = [];
  }

  if (ctx._source.user.is_privileged != true) {
    ctx._source.user.is_privileged = true;
  }

  if (!ctx._source.labels.sources.contains(params.sourceLabel)) {
    ctx._source.labels.sources.add(params.sourceLabel);
  }
}
if(params.containsKey('new_roles')&& params.new_roles != null) {
    if (ctx._source.user == null) { ctx._source.user = new HashMap(); }
    if (ctx._source.user.roles == null) { ctx._source.user.roles = new ArrayList(); }
    ctx._source.user.roles = new ArrayList(params.new_roles);
  }
`;

export const buildBulkUpsertBody = async (
  // merge with the index sync code, they are very similar
  users: PrivMonOktaIntegrationsUser[],
  sourceLabel: string,
  dataClient: PrivilegeMonitoringDataClient
) => {
  const body: object[] = [];
  dataClient.log('info', `Building bulk operations for integrations sync:  ${users.length} users`);
  // check if existing and do create or update accordingly
  for (const user of users) {
    if (user.existingUserId) {
      // update existing user
      dataClient.log(
        'debug',
        `Updating existing user: ${user.username} with ID: ${user.existingUserId}`
      );
      body.push(
        { update: { _index: dataClient.index, _id: user.username } },
        {
          script: {
            source: UPDATE_SCRIPT_SOURCE,
            params: {
              new_privileged_status: user.isPrivileged,
              sourceLabel,
              new_roles: user.roles ?? [],
            },
          },
        }
      );
    } else if (user.isPrivileged) {
      dataClient.log('info', `Creating new user with integrations sync: ${user.username}`);
      body.push(
        { index: { _index: dataClient.index } },
        {
          user: { id: user.id, name: user.username, is_privileged: user.isPrivileged },
          roles: user.roles ?? [],
          labels: {
            sources: [sourceLabel],
          },
          last_seen: user.lastSeen,
        }
      );
    }
  }
  dataClient.log('debug', `Built ${body.length / 2} bulk operations for integrations users`);
  return body;
};

export const applyPrivilegedUpdates = async ({
  dataClient,
  users,
}: {
  dataClient: PrivilegeMonitoringDataClient;
  users: PrivMonOktaIntegrationsUser[];
}) => {
  if (users.length === 0) return;

  const chunkSize = 500;
  const esClient = dataClient.deps.clusterClient.asCurrentUser;
  const opsForIntegration = makeIntegrationOpsBuilder(dataClient);
  try {
    for (let start = 0; start < users.length; start += chunkSize) {
      const chunk = users.slice(start, start + chunkSize);
      const operations = opsForIntegration(chunk);
      await esClient.bulk({
        refresh: 'wait_for',
        body: operations,
      });
    }
  } catch (error) {
    dataClient.log('error', `Error applying privileged updates: ${error.message}`);
  }
};
