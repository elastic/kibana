/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PndProposalRow } from '@kbn/pnd-common';

import type {
  PndStartServicesAccessor,
  PndWorkflowsManagementClientAccessor,
} from '../../../../../types';
import { isAttackDiscoveryWorkflowsEnabledForSpace } from '../../../../../lib/attack_discovery_workflows_signal';
import {
  listPendingPndGates,
  PND_PENDING_GATES_MAX_RUNS,
} from '../../../../../lib/list_pending_pnd_gates';
import { listAgentBuilderConversations } from '../../../conversations/helpers/list_agent_builder_conversations';
import { resolveReadableAttackDiscoveryAlertIds } from '../../../conversations/helpers/resolve_readable_attack_discovery_alert_ids';
import { buildProposalRows } from '../build_proposal_rows';
import { dedupeProposals } from '../dedupe_proposals';
import { resolveThreadTitles } from '../resolve_thread_titles';

export interface ReadPendingProposalRowsParams {
  getStartServices: PndStartServicesAccessor;
  getWorkflowsManagementClient: PndWorkflowsManagementClientAccessor;
  logger: Logger;
  /** The caller's request. Every enrichment read is made as the calling user (S3/D3). */
  request: KibanaRequest;
  /** Upper bound on parked runs read; defaults to {@link PND_PENDING_GATES_MAX_RUNS}. */
  size?: number;
  /** Space resolved from the request (security finding S9); never a client value, never `'*'`. */
  spaceId: string;
}

/**
 * Why the read failed to produce rows, or the rows themselves. The two failures are distinct
 * because the HTTP shaping differs — AD 2.0 being off in the space is a `200` with an explanatory
 * header, an absent Workflows client is a `503` — and shaping belongs to each route, not here.
 */
export type ReadPendingProposalRowsResult =
  | { outcome: 'ad_workflows_disabled' }
  | { outcome: 'workflows_unavailable' }
  | { outcome: 'ok'; rows: PndProposalRow[] };

/**
 * Read the space's pending HITL gates as {@link PndProposalRow}s — **the** parked-gate projection.
 *
 * Extracted so the two surfaces that answer "which proposals are awaiting a decision" cannot drift:
 * `GET /internal/pnd/proposals` (the grouped queue) and
 * `GET /internal/pnd/investigations/{id}/proposals` (the same rows, filtered to one investigation
 * and projected onto the `Proposal` contract). Before `kibana-phf4.29` the second returned `[]` in
 * live mode; making it true by calling this rather than by growing a second reader is what keeps the
 * epic's "never build two pipes" rule honest.
 *
 * Everything that makes a row safe to return travels with it, in one place rather than per caller:
 *
 * - the space is taken from the caller's request and never from a parameter (S9);
 * - gates are restricted to registered `PND_GATE_REGISTRY` entries (D4), then to discoveries the
 *   **calling user** can read via the shared `_find?ids=` check (S3/D3);
 * - rows are de-duplicated by `(correlationId, gateId)` newest-first (S10), which is the
 *   same key a `[Thread]` conversation is derived from (D1);
 * - each row carries its thread's title, resolved server-side from one read of the caller's
 *   conversations (D9), so no surface repeats the join.
 *
 * The title enrichment is cosmetic, so a failed read degrades to the gate prompt title rather than
 * taking the queue down with it.
 */
export const readPendingProposalRows = async ({
  getStartServices,
  getWorkflowsManagementClient,
  logger,
  request,
  size = PND_PENDING_GATES_MAX_RUNS,
  spaceId,
}: ReadPendingProposalRowsParams): Promise<ReadPendingProposalRowsResult> => {
  // When AD 2.0 is disabled in this space there is nothing parked by design. Answered before the
  // Workflows client is even resolved, so a disabled space costs no queue read.
  const adWorkflowsEnabled = await isAttackDiscoveryWorkflowsEnabledForSpace({
    getStartServices,
    logger,
    request,
    spaceId,
  });
  if (!adWorkflowsEnabled) {
    return { outcome: 'ad_workflows_disabled' };
  }

  const managementClient = getWorkflowsManagementClient();
  if (managementClient == null) {
    return { outcome: 'workflows_unavailable' };
  }

  const { attackDiscoveryIdByRunId, reasoningByStepId, results } = await listPendingPndGates({
    includeReasoning: true,
    logger,
    managementClient,
    size,
    spaceId,
  });

  const [{ http }] = await getStartServices();
  const correlationIds = results.map(
    (step) => attackDiscoveryIdByRunId.get(step.workflowRunId) ?? ''
  );

  const [readableAttackDiscoveryAlertIds, conversations] = await Promise.all([
    // S3: resolve which correlated discoveries the caller can read, as the calling user — the same
    // shared primitive the runs list uses, never a second copy.
    resolveReadableAttackDiscoveryAlertIds({
      correlationIds,
      http,
      request,
      spaceId,
    }),
    // D9: the row titles, read once for the whole queue. Only an uncorrelated queue can be skipped
    // outright — a thread id is derived from an alert id, so a queue with no correlation has no
    // thread to title.
    correlationIds.some((id) => id !== '')
      ? listAgentBuilderConversations({ http, request, spaceId }).catch((error) => {
          logger.warn(`Failed to resolve PND thread titles: ${error}`);
          return [];
        })
      : [],
  ]);

  const rows = buildProposalRows({
    attackDiscoveryIdByRunId,
    readableAttackDiscoveryAlertIds,
    reasoningByStepId,
    spaceId,
    steps: results,
  });

  return {
    outcome: 'ok',
    rows: resolveThreadTitles({ conversations, rows: dedupeProposals(rows) }),
  };
};
