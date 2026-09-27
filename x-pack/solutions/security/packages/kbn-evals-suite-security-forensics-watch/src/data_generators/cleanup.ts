/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { DEEP_WATCH_EVAL_AGENT_ID_PREFIX } from './forensic_data';
import { isMissingIndexError } from '../gates/marker_count';

const EVAL_SEEDED_INDICES = [
  'logs-endpoint.events.process-default',
  'logs-endpoint.events.network-default',
  'logs-endpoint.events.registry-default',
];

/**
 * Reclaims telemetry seeded by seedForensicTimeline() via the shared
 * `eval-agent-dwf-` prefix. Mirrors the sibling
 * `kbn-evals-suite-endpoint/src/data_generators/cleanup.ts` pattern (no
 * `.fleet-agents`/`internalEsClient` step needed here — Forensics Watch never
 * seeds Fleet-restricted indices, only `logs-endpoint.events.*`).
 *
 * Failures are NOT swallowed. The previous `.catch(() => {})` meant a rejected
 * or unauthorized delete-by-query left stale telemetry in place, and the next
 * seed wrote on top of it — inflating every count the suite asserts (timeline
 * events, IoC matches) with no signal that cleanup had failed. An absent index
 * is the one benign case (nothing was ever seeded into it); everything else
 * rejects.
 */
export async function cleanupSeededData({ esClient }: { esClient: Client }): Promise<void> {
  const deleteQuery = { prefix: { 'agent.id': DEEP_WATCH_EVAL_AGENT_ID_PREFIX } };

  await Promise.all(
    EVAL_SEEDED_INDICES.map(async (index) => {
      try {
        await esClient.deleteByQuery({
          index,
          query: deleteQuery,
          refresh: true,
          ignore_unavailable: true,
        });
      } catch (error) {
        if (isMissingIndexError(error)) return;
        throw new Error(
          `cleanupSeededData: failed to delete seeded telemetry from ${index}: ` +
            `${error instanceof Error ? error.message : JSON.stringify(error)}`
        );
      }
    })
  );
}
