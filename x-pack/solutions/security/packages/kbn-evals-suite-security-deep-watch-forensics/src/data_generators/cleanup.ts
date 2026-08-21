/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { DEEP_WATCH_EVAL_AGENT_ID_PREFIX } from './forensic_data';

const EVAL_SEEDED_INDICES = [
  'logs-endpoint.events.process-default',
  'logs-endpoint.events.network-default',
  'logs-endpoint.events.registry-default',
];

/**
 * Reclaims telemetry seeded by seedForensicTimeline() via the shared
 * `eval-agent-dwf-` prefix. Mirrors the sibling
 * `kbn-evals-suite-endpoint/src/data_generators/cleanup.ts` pattern (no
 * `.fleet-agents`/`internalEsClient` step needed here — Deep Watch never
 * seeds Fleet-restricted indices, only `logs-endpoint.events.*`).
 */
export async function cleanupSeededData({ esClient }: { esClient: Client }): Promise<void> {
  const deleteQuery = { prefix: { 'agent.id': DEEP_WATCH_EVAL_AGENT_ID_PREFIX } };

  await Promise.all(
    EVAL_SEEDED_INDICES.map((index) =>
      esClient
        .deleteByQuery({ index, query: deleteQuery, refresh: true, ignore_unavailable: true })
        .catch(() => {})
    )
  );
}
