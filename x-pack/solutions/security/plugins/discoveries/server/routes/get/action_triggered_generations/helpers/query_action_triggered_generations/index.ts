/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ATTACK_DISCOVERY_EVENT_PROVIDER } from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';

import type { GenerationStatus } from '../get_generation_status';
import { getGenerationStatus } from '../get_generation_status';
import { parseSourceMetadata, type SourceMetadataResponse } from '../parse_source_metadata';

export interface ActionTriggeredGeneration {
  connector_id: string;
  execution_uuid: string;
  source_metadata: SourceMetadataResponse | null;
  status: GenerationStatus;
  timestamp: string;
}

export interface QueryActionTriggeredGenerationsResult {
  data: ActionTriggeredGeneration[];
  total: number;
}

const GENERATION_ACTIONS = [
  'generation-failed',
  'generation-started',
  'generation-succeeded',
] as const;

const STATUS_TO_ACTION: Readonly<Record<string, string>> = {
  failed: 'generation-failed',
  running: 'generation-started',
  succeeded: 'generation-succeeded',
};

interface EventLogHitSource {
  '@timestamp'?: string;
  event?: {
    action?: string;
    dataset?: string;
    reference?: string;
  };
  kibana?: {
    alert?: {
      rule?: {
        execution?: {
          uuid?: string;
        };
      };
    };
  };
}

const transformHit = (hit: { _source?: EventLogHitSource }): ActionTriggeredGeneration => {
  const source = hit._source;

  return {
    connector_id: source?.event?.dataset ?? '',
    execution_uuid: source?.kibana?.alert?.rule?.execution?.uuid ?? '',
    source_metadata: parseSourceMetadata(source?.event?.reference),
    status: getGenerationStatus(source?.event?.action),
    timestamp: source?.['@timestamp'] ?? '',
  };
};

export const queryActionTriggeredGenerations = async ({
  end,
  esClient,
  eventLogIndex,
  from,
  search,
  size,
  spaceId,
  start,
  status,
}: {
  end?: string;
  esClient: ElasticsearchClient;
  eventLogIndex: string;
  from: number;
  search?: string;
  size: number;
  spaceId: string;
  start?: string;
  status?: string[];
}): Promise<QueryActionTriggeredGenerationsResult> => {
  const actionTerms =
    status != null && status.length > 0
      ? status.map((s) => STATUS_TO_ACTION[s]).filter(Boolean)
      : [...GENERATION_ACTIONS];

  const rangeFilter =
    start != null || end != null
      ? [
          {
            range: {
              '@timestamp': {
                ...(end != null ? { lte: end } : {}),
                ...(start != null ? { gte: start } : {}),
              },
            },
          },
        ]
      : [];

  const filter: Array<Record<string, unknown>> = [
    { term: { 'event.provider': ATTACK_DISCOVERY_EVENT_PROVIDER } },
    { term: { 'event.category': 'action' } },
    { terms: { 'kibana.space_ids': [spaceId] } },
    { terms: { 'event.action': actionTerms } },
    ...rangeFilter,
  ];

  const searchFilter =
    search != null && search.length > 0
      ? {
          minimum_should_match: 1,
          should: [
            { wildcard: { 'event.dataset': { case_insensitive: true, value: `*${search}*` } } },
            { wildcard: { 'event.reference': { case_insensitive: true, value: `*${search}*` } } },
          ],
        }
      : {};

  const boolQuery: Record<string, unknown> = { filter, ...searchFilter };

  const searchResult = await esClient.search<EventLogHitSource>({
    aggs: {
      total_executions: {
        cardinality: {
          field: 'kibana.alert.rule.execution.uuid',
        },
      },
    },
    collapse: {
      field: 'kibana.alert.rule.execution.uuid',
    },
    from,
    index: eventLogIndex,
    query: {
      bool: boolQuery,
    },
    size,
    sort: [{ '@timestamp': { order: 'desc' as const } }],
  });

  const hits = searchResult.hits.hits;

  const total =
    (searchResult.aggregations?.total_executions as { value: number } | undefined)?.value ?? 0;

  return {
    data: hits.map(transformHit),
    total,
  };
};
