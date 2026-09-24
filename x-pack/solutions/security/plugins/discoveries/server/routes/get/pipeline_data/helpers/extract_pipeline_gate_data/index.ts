/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { extractGateDecision } from '@kbn/discoveries/impl/attack_discovery/generation/extract_gate_decision';

/** Gate-aware alert retrieval data surfaced under the Generation phase. */
export interface PipelineGateData {
  alerts: string[];
  alerts_context_count: number;
  extraction_strategy: 'skill';
}

/**
 * Extracts the badge/inspect data for a generation-phase gate (skill) run.
 *
 * The gate returns a DECISION (ids only): `remove_alert_ids` for the candidates
 * it dropped and `added_alert_ids` for the net-new alerts it retrieved itself.
 * Keep is `candidates − removed`, but the candidate count is not recoverable from
 * the gate decision alone, so this interim count reports only the net-new
 * additions the gate can positively enumerate. The authoritative count is
 * resolved by the caller (`get_pipeline_data`), which attaches the real alerts
 * passed to generation — the generate step's `input.alerts` — and overrides both
 * `alerts` and `alerts_context_count` on this entry. The gate never emits raw
 * alert strings, so `alerts` is empty here.
 *
 * Returns `null` when the execution is not a gate decision or when the gate has
 * not completed yet — callers fall back to standard alert extraction in that case.
 */
export const extractPipelineGateData = ({
  execution,
  logger,
}: {
  execution: WorkflowExecutionDto;
  logger?: Logger;
}): PipelineGateData | null => {
  try {
    const decision = extractGateDecision({ execution, logger });

    return {
      alerts: [],
      alerts_context_count: decision.addedAlertIds.length,
      extraction_strategy: 'skill',
    };
  } catch {
    return null;
  }
};
