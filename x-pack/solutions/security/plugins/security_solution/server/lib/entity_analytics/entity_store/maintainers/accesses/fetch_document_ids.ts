/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid } from '@kbn/entity-store/common';

import { INDEX_PATTERN, LOOKBACK_WINDOW } from './constants';

export async function fetchDocumentIds(
  esClient: ElasticsearchClient,
  bucketFilter: QueryDslQueryContainer
): Promise<string[]> {
  const result = await esClient.search({
    index: INDEX_PATTERN,
    size: 10000,
    _source: false,
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: LOOKBACK_WINDOW, lt: 'now' } } },
          { term: { 'event.code': '4624' } },
          { term: { 'event.provider': 'Microsoft-Windows-Security-Auditing' } },
          { term: { 'event.category': 'authentication' } },
          { term: { 'event.action': 'logged-in' } },
          { term: { 'event.outcome': 'success' } },
          {
            terms: {
              'winlog.logon.type': [
                'Interactive',
                'Network',
                'Unlock',
                'RemoteInteractive',
                'CachedInteractive',
              ],
            },
          },
          { exists: { field: 'user.name' } },
          euid.getEuidDslDocumentsContainsIdFilter('user'),
          bucketFilter,
        ],
        must_not: [
          { wildcard: { 'user.name': '*$' } },
          { terms: { 'user.name': ['SYSTEM', 'LOCAL SERVICE', 'NETWORK SERVICE'] } },
          { wildcard: { 'user.name': 'UMFD-*' } },
          { wildcard: { 'user.name': 'DWM-*' } },
          { term: { 'winlog.event_data.VirtualAccount': 'Yes' } },
        ],
      },
    },
  });

  return result.hits.hits.map((hit) => hit._id).filter((id): id is string => id != null);
}
