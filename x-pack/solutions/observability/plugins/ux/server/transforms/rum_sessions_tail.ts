/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { newSessionIds, RUM_SESSIONS_INDEX } from '../../common/rum_sessions';
import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';
import { SESSION_ID_SCRIPT } from '../routes/session_replay/session_id_script';
import { kueryFilters } from '../routes/rum/kuery';

export const RAW_TAIL_SESSION_CAP = 500;

const serviceFilters = (serviceName?: string): object[] =>
  serviceName
    ? [
        {
          bool: {
            should: [
              { term: { 'resource.attributes.service.name': serviceName } },
              { term: { 'attributes.service.name': serviceName } },
            ],
            minimum_should_match: 1,
          },
        },
      ]
    : [];

export const collectRawTailSessionIds = async ({
  client,
  rangeFrom,
  rangeTo,
  serviceName,
  kuery,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  kuery?: string;
}): Promise<string[]> => {
  const result = await client.search({
    index: RUM_SESSION_SOURCE_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: rangeFrom, lte: rangeTo } } },
          ...serviceFilters(serviceName),
          ...kueryFilters(kuery),
        ],
      },
    },
    aggs: {
      sessions: {
        terms: {
          script: { source: SESSION_ID_SCRIPT, lang: 'painless' },
          size: RAW_TAIL_SESSION_CAP,
          exclude: '',
        },
      },
    },
  });
  const buckets =
    (result.aggregations as { sessions?: { buckets?: Array<{ key?: string | number }> } })?.sessions
      ?.buckets ?? [];
  return buckets.map((bucket) => String(bucket.key ?? '')).filter(Boolean);
};

export const lookupIndexedSessionIds = async (
  client: ElasticsearchClient,
  tailIds: string[]
): Promise<Set<string>> => {
  if (tailIds.length === 0) {
    return new Set();
  }
  const ids = tailIds.slice(0, RAW_TAIL_SESSION_CAP);
  const result = await client.search({
    index: RUM_SESSIONS_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: ids.length,
    _source: ['session.id'],
    query: { terms: { 'session.id': ids } },
  });
  return new Set(
    result.hits.hits
      .map((hit) => {
        const source = hit._source as { session?: { id?: string } } | undefined;
        return source?.session?.id;
      })
      .filter((id): id is string => Boolean(id))
  );
};

/** Session IDs in the raw tail that the session index has never written. */
export const resolveNewTailSessionIds = async ({
  client,
  rangeFrom,
  rangeTo,
  serviceName,
  kuery,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  kuery?: string;
}): Promise<string[]> => {
  const tailIds = await collectRawTailSessionIds({
    client,
    rangeFrom,
    rangeTo,
    serviceName,
    kuery,
  });
  const indexedIds = await lookupIndexedSessionIds(client, tailIds);
  return newSessionIds(tailIds, indexedIds);
};
