/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  Matcher,
  MonitoringEntitySource,
} from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import type { AfterKey } from './privileged_status_match';
import type { PrivMonBulkUser } from '../../../../types';
import { makeIntegrationOpsBuilder } from '../../../bulk/upsert';
import { errorsMsg, getErrorFromBulkResponse } from '../../utils';

/**
 * Build painless script for matcher
 * @param matcher - matcher object containing fields and values to match against
 * @returns
 */
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

/**
 * Building privileged search body for matchers
 */
export const buildPrivilegedSearchBody = (
  script: estypes.Script,
  timeGte: string,
  afterKey?: AfterKey,
  pageSize: number = 100
): Omit<estypes.SearchRequest, 'index'> => ({
  size: 0,
  query: {
    range: { '@timestamp': { gte: timeGte, lte: 'now' } },
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

export const applyPrivilegedUpdates = async ({
  dataClient,
  users,
  source,
}: {
  dataClient: PrivilegeMonitoringDataClient;
  users: PrivMonBulkUser[];
  source: MonitoringEntitySource;
}) => {
  if (users.length === 0) return;

  const chunkSize = 500;
  const esClient = dataClient.deps.clusterClient.asCurrentUser;
  const opsForIntegration = makeIntegrationOpsBuilder(dataClient);
  try {
    for (let start = 0; start < users.length; start += chunkSize) {
      const chunk = users.slice(start, start + chunkSize);
      const operations = opsForIntegration(chunk, source);
      const resp = await esClient.bulk({
        refresh: 'wait_for',
        body: operations,
      });
      const errors = getErrorFromBulkResponse(resp);
      dataClient.log('error', errorsMsg(errors));
    }
  } catch (error) {
    dataClient.log('error', `Error applying privileged updates: ${error.message}`);
  }
};
