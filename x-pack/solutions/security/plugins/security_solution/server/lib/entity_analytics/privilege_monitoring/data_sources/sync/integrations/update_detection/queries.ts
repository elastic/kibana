/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Matcher } from '../../../constants';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import type { AfterKey } from './privileged_status_match';

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
  if (ctx._source.is_privileged == true) {
    if (ctx._source.sources == null) { ctx._source.sources = []; }
    ctx._source.sources.removeIf(s -> s == params.sourceLabel);
    if (ctx._source.sources.size() == 0) { ctx._source.is_privileged = false; }
  }
} else {
  if (ctx._source.sources == null) { ctx._source.sources = []; }
  if (ctx._source.is_privileged == true) {
    if (!ctx._source.sources.contains(params.sourceLabel)) {
      ctx._source.sources.add(params.sourceLabel);
    }
  } else {
    ctx._source.is_privileged = true;
    if (!ctx._source.sources.contains(params.sourceLabel)) {
      ctx._source.sources.add(params.sourceLabel);
    }
  }
}
`;

// WIP below should be moved to correct place, this is here for future me to move
interface PrivUser {
  // TODO: probably not this type - this is POC quick results atm
  userKey: string;
  id?: string;
  name?: string;
  roles?: string[];
  isPrivileged: boolean;
  lastSeen?: string;
}

export const buildBulkBody = async (users: PrivUser[], index: string, sourceLabel: string) => {
  const body = [];
  for (const u of users) {
    body.push({ update: { _index: index, _id: u.userKey } });
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
        user: { id: u.id, name: u.name },
        roles: u.roles ?? [],
        is_privileged: u.isPrivileged,
        sources: u.isPrivileged ? [sourceLabel] : [],
        last_seen: u.lastSeen,
      },
      // Optional: doc_as_upsert: true,   // if you prefer partial doc merging
    });
  }
  return body;
};

export const applyPrivilegedUpdates = async (
  dataClient: PrivilegeMonitoringDataClient,
  esClient: ElasticsearchClient,
  users: PrivUser[]
) => {
  if (users.length === 0) return;
  // chunk if large; 500–1k updates per bulk is a good rule
  const chunkSize = 500;
  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    const res = await esClient.bulk({
      refresh: 'wait_for',
      body: buildBulkBody(chunk, 'indexPattern', 'sourceLabel'),
    });
    if (res.errors) {
      const fails = res.items.filter((item) => item.update?.error);
      dataClient.log(
        'warn',
        `Bulk had ${fails.length} failures; first=${JSON.stringify(fails[0])}`
      );
    }
  }
};
