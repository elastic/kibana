/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  deriveThreadConversationId,
  getGateDefinition,
  type PndProposalRow,
} from '@kbn/pnd-common';

import { buildProposalSourceIdFromStep } from '../../../../../lib/proposal_source_id';
import { extractGatePrompt } from '../../../../../lib/extract_gate_prompt';
import { extractReasoningSummary } from '../../../../../lib/extract_reasoning_summary';

export interface BuildProposalRowsParams {
  /** `runId → correlationId` from `listPendingPndGates`. */
  attackDiscoveryIdByRunId: Map<string, string>;
  /**
   * Attack Discovery alert ids the calling user can read, resolved via the `_find?ids=` check
   * (security finding S3). A gate whose correlated discovery is **not** in this set is dropped, so a
   * caller can never see a proposal — or its reasoning — assembled from a discovery they cannot
   * read. Uncorrelated gates are kept: they expose no Attack Discovery content.
   */
  readableAttackDiscoveryAlertIds: Set<string>;
  /** `stepExecutionId → output.reasoning` from `listPendingPndGates`. */
  reasoningByStepId: Map<string, Record<string, unknown>>;
  /** Pending `waitForInput` step executions in the space. */
  steps: WorkflowStepExecutionDto[];
}

/**
 * Project pending `waitForInput` steps into {@link PndProposalRow}s.
 *
 * `waitForInput` carries no proposal metadata (its `with.schema` is a closed zod
 * object that strips unknown keys), so each row is assembled from three carriers:
 * the paused step (prompt, ids, timestamp), the gate registry keyed by
 * `(workflowId, stepId)` (bucket, reversibility, `alwaysGate`, gate id), and the
 * per-run attack-discovery correlation. A step whose `(workflowId, stepId)` is not a
 * registered PND gate is dropped: the space may hold unrelated `waitForInput` steps,
 * and only PND gates belong in this queue (fail-closed by construction). That check is
 * kept even though `listPendingPndGates` now filters to registered gates too (D4) —
 * defense in depth, not redundancy.
 *
 * Each row also carries its `[Thread]` conversation id (D1), derived from
 * `(correlationId, gateId)` — the same pair `dedupeProposals` dedupes on, which is what
 * makes "one row per Proposal" and "one thread per Proposal" one guarantee rather than two that
 * could drift. Deriving it here rather than in each caller is deliberate: `/proposals` and
 * `/proposals/history` share this projection, so both carry the field from a single edit.
 *
 * Security finding S3/D3: rows also carry the same IDOR filter the runs list applies. A
 * proposal row exposes a discovery id, the gate prompt and the model's reasoning, so a
 * gate correlated to a discovery the caller cannot read is dropped here rather than
 * rendered. Before D3 the queue had no such filter at all, despite the architecture doc
 * claiming one.
 */
export const buildProposalRows = ({
  attackDiscoveryIdByRunId,
  readableAttackDiscoveryAlertIds,
  reasoningByStepId,
  steps,
}: BuildProposalRowsParams): PndProposalRow[] =>
  steps.flatMap((step): PndProposalRow[] => {
    const gate = getGateDefinition(step.workflowId, step.stepId);
    if (gate == null) {
      return [];
    }

    const correlationId = attackDiscoveryIdByRunId.get(step.workflowRunId) ?? '';

    // S3: never surface a proposal for a discovery the caller cannot read.
    if (correlationId !== '' && !readableAttackDiscoveryAlertIds.has(correlationId)) {
      return [];
    }

    const { inputSchema, message, title } = extractGatePrompt(step);

    return [
      {
        alwaysGate: gate.alwaysGate,
        correlationId,
        createdAt: step.startedAt,
        gateId: gate.gateId,
        inputSchema,
        message,
        reasoning: extractReasoningSummary(reasoningByStepId.get(step.id)),
        recommendedAction: gate.recommendedAction,
        reversible: gate.reversible,
        sourceId: buildProposalSourceIdFromStep(step),
        stepExecutionId: step.id,
        stepId: step.stepId,
        // D1: the thread paired 1:1 with this proposal. Derived here, on the one projection both
        // `/proposals` and `/proposals/history` share, so every surface reads the same id and no
        // client re-implements the UUIDv5. Fail-closed and therefore `undefined` for an
        // uncorrelated gate — propagated rather than defaulted, because a blank alert id must never
        // mint an id other surfaces would treat as PND-owned.
        threadConversationId: deriveThreadConversationId({
          correlationId,
          gateId: gate.gateId,
        }),
        title,
        workflowId: step.workflowId,
        workflowRunId: step.workflowRunId,
      },
    ];
  });
