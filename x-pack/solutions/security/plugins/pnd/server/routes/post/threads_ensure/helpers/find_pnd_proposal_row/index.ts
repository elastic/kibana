/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { getGateDefinitionByGateId, type PndProposalRow } from '@kbn/pnd-common';

import { listPendingPndGates } from '../../../../../lib/list_pending_pnd_gates';
import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { buildProposalRows } from '../../../../get/proposals/helpers/build_proposal_rows';
import { dedupeProposals } from '../../../../get/proposals/helpers/dedupe_proposals';

export interface FindPndProposalRowParams {
  /** The discovery the thread is derived from. The caller has already proved it can read it (S3). */
  correlationId: string;
  /**
   * Short gate id. Typed `string` rather than `PndGateId` on purpose — this is a fail-closed
   * boundary and must answer `undefined` for an unregistered gate rather than pick a watch to read,
   * the same reasoning `deriveThreadConversationId` uses.
   */
  gateId: string;
  logger: Logger;
  managementClient: WatchWorkflowsManagementClient;
  /** Space resolved from the request (security finding S9); never a client value, never `'*'`. */
  spaceId: string;
}

/**
 * The pending HITL proposal row for one `(correlationId, gateId)` pair, or `undefined`.
 *
 * Built from exactly the projection `/internal/pnd/proposals` serves — `listPendingPndGates` →
 * `buildProposalRows` → `dedupeProposals` — so the attachments `_ensure` writes and the card the
 * analyst sees can never describe the proposal differently. The read is narrowed to the one watch the gate
 * registry says owns the gate, so seeding a Post-Incident Watch thread never pages the Watch Floor's
 * runs.
 *
 * ⚠️ **`undefined` is the normal case on the eager path, not a failure.** `_ensure` is called from a
 * `kibana.request` step placed *before* the gate's `waitForInput` (D5) — a step after it would only
 * run once the analyst had already answered — and `listPendingPndGates` reads only executions that
 * are already `WAITING_FOR_INPUT`. So at eager-materialisation time the gate's step execution does
 * not exist yet and there is no row to find. The attachments degrade to the gate
 * registry and the Attack Discovery narrative, both of which are real content; the caller must not
 * treat the absence as an error. A row *is* found when `_ensure` is retried after the gate parked,
 * or called for an already-parked proposal.
 *
 * S3 is inherited rather than re-implemented: `readableAttackDiscoveryAlertIds` is the single
 * requested discovery, which the route has already resolved as the calling user, so a row belonging
 * to any other discovery is dropped by `buildProposalRows` before it can be read here.
 */
export const findPndProposalRow = async ({
  correlationId,
  gateId,
  logger,
  managementClient,
  spaceId,
}: FindPndProposalRowParams): Promise<PndProposalRow | undefined> => {
  const gate = getGateDefinitionByGateId(gateId);
  if (gate == null) {
    return undefined;
  }

  const { attackDiscoveryIdByRunId, reasoningByStepId, results } = await listPendingPndGates({
    includeReasoning: true,
    logger,
    managementClient,
    spaceId,
    watchIds: [gate.workflowId],
  });

  const rows = buildProposalRows({
    attackDiscoveryIdByRunId,
    readableAttackDiscoveryAlertIds: new Set([correlationId]),
    reasoningByStepId,
    spaceId,
    steps: results,
  });

  // S10: one row per `(correlationId, gateId)`, newest-first — the same key the thread id
  // is derived from, which is what makes "one row per proposal" and "one thread per proposal" one
  // guarantee rather than two that could drift.
  return dedupeProposals(rows).find(
    (row) => row.correlationId === correlationId && row.gateId === gateId
  );
};
