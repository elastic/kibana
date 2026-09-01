/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowExecutionDto } from '@kbn/workflows';

import { AttackDiscoveryError } from '../../../lib/errors/attack_discovery_error';
import { enforceEmbeddedAlertIds } from './helpers/enforce_embedded_alert_ids';

/** Step type identifier emitted by the skill workflow's `ai.agent` step. */
export const AI_AGENT_STEP_TYPE = 'ai.agent';

/**
 * The curated alert set and persisted conversation id extracted from the skill
 * alert retrieval workflow's `ai.agent` step output.
 */
export interface SkillAlertRetrievalExtraction {
  /**
   * Corroboration findings the skill gathered via its Cross-Skill Corroboration
   * loop, when present. Threaded downstream into the generation step's
   * `additional_context` — the same insight `provided` mode passed to the run
   * step.
   */
  additionalContext?: string;
  /**
   * The backing alert document `_id` values the skill curated. In `alert_retrieval`
   * mode (Mode C) the skill returns only these ids (not full alert strings); the
   * downstream pipeline retrieves and anonymizes the matching alerts by `_id`,
   * which keeps the skill's `ai.agent` payload tiny and avoids token-limit /
   * truncation failures from round-tripping wide alert documents through the LLM.
   */
  alertIds: string[];
  /**
   * Curated, anonymized alert strings produced by the skill. Retained for
   * backward compatibility and display; empty in the `alert_ids`-only contract.
   */
  alerts: string[];
  /**
   * Number of curated alerts the skill reported (the count of `alertIds`, falling
   * back to `alert_count` or `alerts.length`).
   */
  alertsContextCount: number;
  /** Persisted Agent Builder conversation id, when present in the step output. */
  conversationId?: string;
}

/**
 * Shape of the `ai.agent` step structured output produced by the skill in
 * its alerts-only `alert_retrieval` mode (Mode C).
 */
interface SkillStructuredOutput {
  additional_context?: string;
  alert_count?: number;
  alert_ids?: string[];
  alerts?: string[];
}

/**
 * Normalizes the `ai.agent` step's `structured_output`, which may arrive either
 * as a parsed object or as a JSON-encoded string, into a typed object.
 */
const parseStructuredOutput = (value: unknown): SkillStructuredOutput => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as SkillStructuredOutput;
    } catch {
      return {};
    }
  }

  if (value != null && typeof value === 'object') {
    return value as SkillStructuredOutput;
  }

  return {};
};

/**
 * Extracts the curated alert set and persisted conversation id from the skill
 * alert retrieval workflow's `ai.agent` step output.
 *
 * Used by the pipeline data route (the display path) to read the curated
 * `alerts` array from `structured_output` rather than the raw step output
 * object.
 *
 * The curated `alerts` are passed through `enforceEmbeddedAlertIds`, which
 * deterministically embeds each backing `_id` (from the parallel `alert_ids`)
 * rather than trusting the skill prompt alone to do so.
 *
 * Throws an `AttackDiscoveryError` when the execution failed, was cancelled,
 * timed out, has no `ai.agent` step, or that step produced no output.
 */
export const extractSkillAlertRetrievalResult = ({
  execution,
  logger,
}: {
  execution: WorkflowExecutionDto;
  logger?: Logger;
}): SkillAlertRetrievalExtraction => {
  if (execution.status === 'failed') {
    const errorMessage = execution.error?.message ?? 'Unknown error';
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message: `Skill alert retrieval workflow failed: ${errorMessage}`,
      workflowId: execution.workflowId,
    });
  }

  if (execution.status === 'cancelled') {
    throw new AttackDiscoveryError({
      errorCategory: 'concurrent_conflict',
      message:
        'Skill alert retrieval workflow was cancelled. This may indicate a concurrent execution or manual cancellation. Retry generation.',
      workflowId: execution.workflowId,
    });
  }

  if (execution.status === 'timed_out') {
    throw new AttackDiscoveryError({
      errorCategory: 'timeout',
      message:
        'Skill alert retrieval workflow timed out. Consider increasing the workflow timeout or reducing the alert count.',
      workflowId: execution.workflowId,
    });
  }

  const agentStep = execution.stepExecutions.find((step) => step.stepType === AI_AGENT_STEP_TYPE);

  if (!agentStep) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message: 'Skill agent step not found in skill alert retrieval workflow execution',
      workflowId: execution.workflowId,
    });
  }

  if (!agentStep.output) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message:
        'Skill agent step completed but returned no alerts. Check the time range and alerts index configuration.',
      workflowId: execution.workflowId,
    });
  }

  const output = agentStep.output as {
    conversation_id?: string;
    structured_output?: unknown;
  };

  const structuredOutput = parseStructuredOutput(output.structured_output);
  const rawAlerts = structuredOutput.alerts ?? [];
  const alertIds = structuredOutput.alert_ids ?? [];

  const alerts = enforceEmbeddedAlertIds({ alertIds, alerts: rawAlerts, logger });

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
    alertIds,
    alerts,
    alertsContextCount:
      structuredOutput.alert_count ?? (alertIds.length > 0 ? alertIds.length : alerts.length),
    conversationId: output.conversation_id,
  };
};
