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
  afterKey?: AfterKey, // needs to be record of field to field value?
  pageSize: number = 20
): Omit<estypes.SearchRequest, 'index'> => ({
  size: 0,
  query: {
    bool: {
      must: [{ script: { script } }],
    },
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
            script_fields: { is_privileged: { script } },
            _source: { includes: ['user', 'roles', '@timestamp'] }, // lets see what this gives us out
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
    if (ctx._source.labels.sources == null) { ctx._source.labels.sources = []; }
    ctx._source.labels.sources.removeIf(s -> s == params.sourceLabel);
    if (ctx._source.labels.sources.size() == 0) { ctx._source.user.is_privileged = false; }
  }
} else {
  if (ctx._source.labels.sources == null) { ctx._source.labels.sources = []; }
  if (ctx._source.user.is_privileged == true) {
    if (!ctx._source.labels.sources.contains(params.sourceLabel)) {
      ctx._source.labels.sources.add(params.sourceLabel);
    }
  } else {
    ctx._source.user.is_privileged = true;
    if (!ctx._source.labels.sources.contains(params.sourceLabel)) {
      ctx._source.labels.sources.add(params.sourceLabel);
    }
  }
}
`;

// WIP below should be moved to correct place

export const buildBulkBody = async (
  users: PrivMonOktaIntegrationsUser[],
  index: string,
  sourceLabel: string
) => {
  const body = [];
  for (const u of users) {
    body.push({ update: { _index: index, _id: u.username } });
    body.push({
      script: {
        lang: 'painless',
        source: UPDATE_SCRIPT_SOURCE,
        params: {
          new_privileged_status: u.isPrivileged,
          sourceLabel,
        },
      },
      // upsert defines doc shape if it does not exist yet
      upsert: {
        user: { id: u.id, name: u.username },
        roles: u.roles ?? [],
        is_privileged: u.isPrivileged,
        labels: {
          sources: u.isPrivileged ? [sourceLabel] : [],
        },
        last_seen: u.lastSeen,
      },
    });
  }
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

  try {
    for (let i = 0; i < users.length; i += chunkSize) {
      const chunk = users.slice(i, i + chunkSize);
      const operations = await buildBulkBody(
        chunk,
        dataClient.index,
        'entity_analytics_integration'
      );
      await esClient.bulk({
        refresh: 'wait_for',
        body: operations,
      });
    }
  } catch (error) {
    dataClient.log('error', `Error applying privileged updates: ${error.message}`);
  }
};
