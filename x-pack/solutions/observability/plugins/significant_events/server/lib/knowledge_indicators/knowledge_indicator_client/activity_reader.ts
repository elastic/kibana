/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { KNOWLEDGE_INDICATORS_DATA_STREAM, type StoredKnowledgeIndicator } from '../data_stream';

export interface KnowledgeActivity {
  id: string;
  indicator_id: string;
  stream_name: string;
  timestamp: string;
  kind:
    | 'knowledge_added'
    | 'knowledge_updated'
    | 'knowledge_removed'
    | 'rule_added'
    | 'rule_updated'
    | 'rule_removed';
  title: string;
}

/** Reads retained revisions, rather than reconstructing history from today's KIs. */
export async function readKnowledgeActivity(
  esClient: ElasticsearchClient,
  streams: string[],
  from: string,
  to: string
): Promise<{ activities: KnowledgeActivity[]; total: number }> {
  if (!streams.length) return { activities: [], total: 0 };
  const response = await esClient.search<StoredKnowledgeIndicator>({
    index: KNOWLEDGE_INDICATORS_DATA_STREAM,
    ignore_unavailable: true,
    size: 1000,
    track_total_hits: true,
    sort: [{ '@timestamp': 'desc' }],
    query: {
      bool: {
        filter: [
          { terms: { 'stream.name': streams } },
          { range: { '@timestamp': { gte: from, lte: to } } },
        ],
      },
    },
  });
  const revisions = response.hits.hits.flatMap((hit) =>
    hit._source ? [{ document: hit._source, documentId: hit._id }] : []
  );
  if (!revisions.length) return { activities: [], total: 0 };
  // Find the earliest retained revision for each identity. Use exact identity filters;
  // the same indicator ID may exist in more than one stream.
  const identities = new Map(
    revisions.map(({ document }) => [
      JSON.stringify([document['stream.name'], document.type, document.id]),
      document,
    ])
  );
  const firstSeen = await esClient.search<
    StoredKnowledgeIndicator,
    {
      identities: { buckets: Record<string, { first: { value: number | null } }> };
    }
  >({
    index: KNOWLEDGE_INDICATORS_DATA_STREAM,
    ignore_unavailable: true,
    size: 0,
    query: { terms: { 'stream.name': streams } },
    aggs: {
      identities: {
        filters: {
          filters: Object.fromEntries(
            [...identities].map(([key, document]) => [
              key,
              {
                bool: {
                  filter: [
                    { term: { 'stream.name': document['stream.name'] } },
                    { term: { type: document.type } },
                    { term: { id: document.id } },
                  ],
                },
              },
            ])
          ),
        },
        aggs: { first: { min: { field: '@timestamp' } } },
      },
    },
  });
  const activities = revisions.map(({ document, documentId }): KnowledgeActivity => {
    const key = JSON.stringify([document['stream.name'], document.type, document.id]);
    const isFirst =
      firstSeen.aggregations?.identities.buckets[key]?.first.value ===
      Date.parse(document['@timestamp']);
    const prefix = document.type === 'feature' ? 'knowledge' : 'rule';
    const operation =
      'deleted' in document && document.deleted ? 'removed' : isFirst ? 'added' : 'updated';
    return {
      id: documentId ?? `${key}:${document['@timestamp']}`,
      indicator_id: document.id,
      stream_name: document['stream.name'],
      timestamp: document['@timestamp'],
      kind: `${prefix}_${operation}`,
      title: 'title' in document && document.title ? document.title : document.id,
    };
  });
  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? activities.length;
  return { activities, total };
}
