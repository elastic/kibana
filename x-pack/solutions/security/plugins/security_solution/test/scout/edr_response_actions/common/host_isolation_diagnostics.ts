/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import type { EsClient } from '@kbn/scout-security';
import {
  METADATA_TRANSFORMS_PATTERN,
  METADATA_TRANSFORMS_PATTERN_V2,
  METADATA_UNITED_INDEX,
  metadataCurrentIndexPattern,
  metadataIndexPattern,
} from '../../../../common/endpoint/constants';

/*
 * These diagnostics are kept on purpose. Remove them together with the lock in
 * `with_metadata_transform_lock.ts`, under the same condition: current-time seeds no longer call
 * stopMetadataTransforms, and the endpoint package's `metadata_current` transform no longer skips
 * metadata docs that become searchable late (https://github.com/elastic/kibana/issues/306353).
 */

const PROBE_OPTIONS = { requestTimeout: 5_000, maxRetries: 0 } as const;
const MAX_PROBE_CHARS = 1_500;
const MAX_REPORT_CHARS = 8_000;

const ENDPOINT_METADATA_FIELDS = [
  'agent.id',
  '@timestamp',
  'event.created',
  'event.ingested',
  'Endpoint.state.isolation',
  'Endpoint.configuration.isolation',
];

const UNITED_METADATA_FIELDS = [
  'agent.id',
  'united.endpoint.@timestamp',
  'united.endpoint.event.created',
  'united.endpoint.event.ingested',
  'united.endpoint.Endpoint.state.isolation',
  'united.endpoint.Endpoint.configuration.isolation',
  'united.agent.updated_at',
  'united.agent.last_checkin',
];

const FLEET_AGENT_SOURCE_FIELDS = [
  'agent.id',
  'namespaces',
  'active',
  'enrolled_at',
  'updated_at',
  'last_checkin',
  'last_checkin_status',
];

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}...[truncated]` : text;

const runProbe = async (label: string, probe: () => Promise<unknown>): Promise<string> => {
  try {
    return `${label}: ${truncate(JSON.stringify(await probe()), MAX_PROBE_CHARS)}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `${label}: probe failed: ${truncate(message, 300)}`;
  }
};

// The isolation update gets a generated `@timestamp`, so newest-first goes by ingest time.
const LATEST_FIRST: estypes.Sort = [
  { 'event.ingested': { order: 'desc', unmapped_type: 'date' } },
  { '@timestamp': { order: 'desc', unmapped_type: 'date' } },
];

const latestAgentDocs = async (
  esClient: EsClient,
  index: string,
  agentQuery: estypes.QueryDslQueryContainer,
  sourceFields: string[],
  size = 1
): Promise<unknown> => {
  const response = await esClient.search(
    {
      index,
      ignore_unavailable: true,
      allow_no_indices: true,
      size,
      query: agentQuery,
      sort: LATEST_FIRST,
      _source: { includes: sourceFields },
    },
    PROBE_OPTIONS
  );
  const docs = response.hits.hits.map(({ _index, _id, _source }) => ({ _index, _id, _source }));
  return docs.length > 0 ? docs : 'no document';
};

/**
 * Best-effort ES-side evidence for a host-isolation wait that timed out. Every probe is
 * bounded and catches its own error, so this never throws and never hides the timeout.
 */
export const collectHostIsolationDiagnostics = async ({
  esClient,
  agentId,
  lastAgentStatus,
}: {
  esClient: EsClient;
  agentId: string;
  lastAgentStatus: unknown;
}): Promise<string> => {
  const byAgentId: estypes.QueryDslQueryContainer = {
    bool: {
      should: [
        { term: { 'agent.id': agentId } },
        { term: { 'united.agent.agent.id': agentId } },
        { term: { 'united.endpoint.agent.id': agentId } },
      ],
      minimum_should_match: 1,
    },
  };

  const probes = await Promise.all([
    runProbe('metadata transforms', async () => {
      const { transforms } = await esClient.transform.getTransformStats(
        {
          transform_id: [METADATA_TRANSFORMS_PATTERN, METADATA_TRANSFORMS_PATTERN_V2].join(','),
          allow_no_match: true,
        },
        PROBE_OPTIONS
      );
      return transforms.map(({ id, state, reason, health, checkpointing, stats }) => ({
        id,
        state,
        reason,
        health: health?.status,
        checkpointing,
        documents_processed: stats.documents_processed,
        documents_indexed: stats.documents_indexed,
        trigger_count: stats.trigger_count,
        search_failures: stats.search_failures,
        index_failures: stats.index_failures,
      }));
    }),
    runProbe('metadata source docs (latest 2)', () =>
      latestAgentDocs(esClient, metadataIndexPattern, byAgentId, ENDPOINT_METADATA_FIELDS, 2)
    ),
    runProbe('metadata_current doc', () =>
      latestAgentDocs(esClient, metadataCurrentIndexPattern, byAgentId, ENDPOINT_METADATA_FIELDS)
    ),
    runProbe('metadata_united doc', () =>
      latestAgentDocs(esClient, METADATA_UNITED_INDEX, byAgentId, UNITED_METADATA_FIELDS)
    ),
    runProbe('fleet agent doc', () =>
      latestAgentDocs(
        esClient,
        AGENTS_INDEX,
        { bool: { should: [{ ids: { values: [agentId] } }, { term: { 'agent.id': agentId } }] } },
        FLEET_AGENT_SOURCE_FIELDS
      )
    ),
    runProbe('last agent status response', async () => lastAgentStatus ?? 'none'),
  ]);

  return truncate(
    [`diagnostics at ${new Date().toISOString()}`, ...probes].join('\n'),
    MAX_REPORT_CHARS
  );
};
