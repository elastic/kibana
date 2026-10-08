/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared constants for the AlertZero L4 worker-chain eval harness.
 *
 * Route paths and API versions are inlined rather than imported from the
 * owning plugins (same convention as the fp-tp suite) so this package takes no
 * runtime dependency on them. They mirror:
 *   - the managed AlertZero workflow ids (@kbn/workflows/managed)
 *   - ALERTZERO_WORKERS_URL / ALERTZERO_API_VERSION (@kbn/alertzero-common)
 *   - PROPOSALS_INTERNAL_URL / PROPOSALS_API_VERSION (@kbn/proposals-common)
 *   - the workflows_management and agent_builder public API versions
 */

export const WORKFLOW_IDS = {
  alertTriage: 'system-security-floor-alert-triage',
  alertTriageReview: 'system-security-floor-alert-triage-review',
  attackDiscoveryRunner: 'system-security-attack-discovery-runner',
  attackDiscoveryReview: 'system-security-attack-discovery-review',
  forensicsSweep: 'system-alertzero-forensics-endpoint-analysis',
  forensicsRun: 'system-alertzero-forensics-run-endpoint-analysis',
} as const;

export const ACTION_IDS = {
  closeAlertsFp: 'system-alertzero-action-close-alerts-false-positive',
  handoffToForensics: 'system-alertzero-action-handoff-to-forensics',
  isolateHost: 'system-alertzero-action-isolate-host',
  killProcess: 'system-alertzero-action-kill-process',
  suspendProcess: 'system-alertzero-action-suspend-process',
  addRuleException: 'system-alertzero-action-add-rule-exception',
} as const;

export const PUBLIC_API_VERSION = '2023-10-31';
export const ALERTZERO_API_VERSION = '1';
export const PROPOSALS_API_VERSION = '1';

export const ALERTZERO_WORKERS_URL = '/internal/alertzero/workers';
export const PROPOSALS_URL = '/internal/proposals';

export const INFERENCE_SETTINGS_ROUTE = '/internal/search_inference_endpoints/settings';
export const INFERENCE_SETTINGS_API_VERSION = '1';
export const ALERTZERO_REASONING_FEATURE_ID = 'alertzero_reasoning';

/**
 * Per-hop timeouts (design Rev 3 §4). Supervised terminal = every hop reaches
 * a final state or its per-hop timeout fires; an overrun names the hop.
 */
export const HOP_TIMEOUTS_MS = {
  alertTriage: 15 * 60_000,
  alertTriageReview: 10 * 60_000,
  attackDiscoveryRunner: 20 * 60_000,
  kiAnalysisIndicator: 5 * 60_000,
  forensicsSweepTick: 3 * 60_000,
  forensicsRun: 20 * 60_000,
  perActionProposal: 5 * 60_000,
} as const;

export const DEFAULT_POLL_INTERVAL_MS = 3_000;

/** The forensics sweep's schedule interval, from forensics_endpoint_analysis.yaml. */
export const FORENSICS_SWEEP_INTERVAL_MS = 60_000;
