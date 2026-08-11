/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowExecutionDto } from '@kbn/workflows';

import { AttackDiscoveryError } from '../../../lib/errors/attack_discovery_error';
import { isContextLengthExceededError } from '../../../lib/errors/is_context_length_exceeded_error';

/** Step type identifier emitted by the gate workflow's `ai.agent` step. */
export const AI_AGENT_STEP_TYPE = 'ai.agent';

/**
 * The always-on ground-truthing gate's DECISION (not data), extracted from the
 * gate workflow's `ai.agent` step output.
 *
 * The gate is the final arbiter of the candidate alert set: it returns a
 * removal set of candidate `_id`s to drop, any net-new alerts it retrieved
 * itself (Skill toggle on), and corroboration context — but never the candidate
 * bytes it received (Constraint B). The orchestration (B6) keeps every candidate
 * NOT listed in `removeAlertIds` and forwards its original bytes; an omitted or
 * empty removal set therefore keeps every candidate (recall-first).
 */
export interface GateDecision {
  /**
   * Corroboration findings the gate gathered (entity risk, telemetry pivots,
   * false-positive triage, threat-intel hits), when present. Threaded
   * downstream into the generation step's `additional_context`.
   */
  additionalContext?: string;
  /**
   * The backing document `_id` values of the NET-NEW alerts the gate retrieved
   * itself when the Skill toggle is on. A positive list (net-new alerts have no
   * candidate universe to subtract from); the orchestration re-fetches +
   * anonymizes the matching alerts by `_id` (Data fidelity principle 6). Empty
   * when the gate added none.
   */
  addedAlertIds: string[];
  /** Persisted Agent Builder conversation id, when present in the step output. */
  conversationId?: string;
  /**
   * The candidate alert `_id` values the gate decided to REMOVE (a subset of the
   * candidate `_id`s it received). The orchestration keeps every candidate NOT
   * listed here and forwards its original bytes — the gate returns ids only,
   * never the bytes. Empty (or omitted) keeps every candidate.
   */
  removeAlertIds: string[];
}

/**
 * Shape of the `ai.agent` step structured output produced by the gate
 * (the skill's ground-truth mode). Decision only — never echoes candidate bytes.
 */
interface GateStructuredOutput {
  added_alert_ids?: string[];
  additional_context?: string;
  remove_alert_ids?: string[];
}

/**
 * Normalizes the `ai.agent` step's `structured_output`, which may arrive either
 * as a parsed object or as a JSON-encoded string, into a typed object.
 */
const parseStructuredOutput = (value: unknown): GateStructuredOutput => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as GateStructuredOutput;
    } catch {
      return {};
    }
  }

  if (value != null && typeof value === 'object') {
    return value as GateStructuredOutput;
  }

  return {};
};

/**
 * Extracts the gate's decision and persisted conversation id from the gate
 * workflow's `ai.agent` step output.
 *
 * Throws an `AttackDiscoveryError` when the execution failed, was cancelled,
 * timed out, has no `ai.agent` step, or that step produced no output — so the
 * orchestration can fail the run closed (no silent pass-through) per the
 * fail-closed gate contract.
 */
export const extractGateDecision = ({
  execution,
  logger,
}: {
  execution: WorkflowExecutionDto;
  logger?: Logger;
}): GateDecision => {
  if (execution.status === 'failed') {
    const errorMessage = execution.error?.message ?? 'Unknown error';

    if (isContextLengthExceededError(errorMessage)) {
      throw new AttackDiscoveryError({
        errorCategory: 'context_length_exceeded',
        message: `The ground-truthing gate failed because the candidate alerts exceeded the model's context length. Reduce the alert \`size\` or narrow the time range, or use a connector with a larger context window. (${errorMessage})`,
        workflowId: execution.workflowId,
      });
    }

    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message: `Gate workflow failed: ${errorMessage}`,
      workflowId: execution.workflowId,
    });
  }

  if (execution.status === 'cancelled') {
    throw new AttackDiscoveryError({
      errorCategory: 'concurrent_conflict',
      message:
        'Gate workflow was cancelled. This may indicate a concurrent execution or manual cancellation. Retry generation.',
      workflowId: execution.workflowId,
    });
  }

  if (execution.status === 'timed_out') {
    throw new AttackDiscoveryError({
      errorCategory: 'timeout',
      message:
        'Gate workflow timed out. Consider increasing the workflow timeout or reducing the candidate alert count.',
      workflowId: execution.workflowId,
    });
  }

  const agentStep = execution.stepExecutions.find((step) => step.stepType === AI_AGENT_STEP_TYPE);

  if (!agentStep) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message: 'Gate agent step not found in gate workflow execution',
      workflowId: execution.workflowId,
    });
  }

  if (!agentStep.output) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message: 'Gate agent step completed but returned no decision output',
      workflowId: execution.workflowId,
    });
  }

  const output = agentStep.output as {
    conversation_id?: string;
    structured_output?: unknown;
  };

  const structuredOutput = parseStructuredOutput(output.structured_output);

  logger?.debug(
    () =>
      `extractGateDecision: remove=${structuredOutput.remove_alert_ids?.length ?? 0} added=${
        structuredOutput.added_alert_ids?.length ?? 0
      }`
  );

  // Treat an empty/whitespace-only `additional_context` (e.g. the workflow
  // output's `default: ''`) as "no corroboration context" so it is omitted
  // rather than threaded downstream as an empty string.
  const additionalContext =
    typeof structuredOutput.additional_context === 'string' &&
    structuredOutput.additional_context.trim().length > 0
      ? structuredOutput.additional_context
      : undefined;

  return {
    ...(additionalContext != null ? { additionalContext } : {}),
    addedAlertIds: structuredOutput.added_alert_ids ?? [],
    ...(output.conversation_id != null ? { conversationId: output.conversation_id } : {}),
    removeAlertIds: structuredOutput.remove_alert_ids ?? [],
  };
};
