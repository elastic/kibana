/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: the real manual-orchestration implementation is added by a later PR in
// the stack (PR4 — Orchestration), which replaces this flat module with a
// `run_manual_orchestration/` directory. Earlier PRs need the
// `ManualOrchestrationOutcome` shape exported here so the schedule
// workflow_executor and route handlers can type-check FF-off. None of this is
// reached at runtime when the FF is OFF — the discoveries plugin is FF-gated
// upstream.

import type { Replacements } from '@kbn/elastic-assistant-common';

// Minimal nested shapes used by earlier-PR consumers (workflow_executor).
// Kept permissive so downstream PRs can refine without breaking the stub contract.
export interface ManualOrchestrationAlertRetrievalResult {
  alertsContextCount: number;
  // The `metadata` shape matches the Zod-inferred schema for
  // create_attack_discovery_alerts_params.anonymized_alerts[].metadata
  // (`z.object({}).catchall(z.unknown())`), which TS surfaces as
  // `Record<string, never>` on the consumer side. Using this exact type
  // keeps `transformToBaseAlertDocument({ alertsParams })` compatible.
  anonymizedAlerts: Array<{
    id?: string;
    metadata: Record<string, never>;
    page_content: string;
  }>;
}

export interface ManualOrchestrationGenerationResult {
  attackDiscoveries: Array<Record<string, unknown>>;
  replacements: Replacements;
}

// The validation step's result, as consumed by workflow_executor. Kept
// permissive: only `discoveriesToPersist` is read by earlier-PR consumers.
export interface ManualOrchestrationValidationResult {
  discoveriesToPersist?: unknown[];
}

export type ManualOrchestrationOutcome =
  | {
      outcome: 'validation_succeeded';
      alertRetrievalResult: ManualOrchestrationAlertRetrievalResult;
      generationResult: ManualOrchestrationGenerationResult;
      validationResult: ManualOrchestrationValidationResult;
    }
  | {
      outcome: 'validation_failed';
    };
