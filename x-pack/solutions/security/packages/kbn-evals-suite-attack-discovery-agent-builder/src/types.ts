/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';

export interface AttackDiscoveryAgentBuilderInput extends Record<string, unknown> {
  question: string;
  triageType: 'provided-alerts' | 'live-retrieval' | 'status-only' | 'multiple-alert-sets';
  expectedSkills: string[];
  expectedToolPath: string[];
  attachments?: Array<{ type: 'security.alerts'; data: { alertIds: string[] } }>;
  executionUuid?: string;
}

export interface AttackDiscovery {
  title: string;
  summaryMarkdown: string;
  detailsMarkdown: string;
  entitySummaryMarkdown?: string;
  mitreAttackTactics?: string[];
  alertIds: string[];
  timestamp?: string;
}

export interface AttackDiscoveryAgentBuilderExpected extends Record<string, unknown> {
  expectedToolPath: string[];
  expectedWorkflowStages: string[];
  // Count-expectation contract (see workflow_evidence_evaluator.ts): a number
  // asserts equality. `null` means don't-care for retrieved but ASSERTS `null`
  // for passed — so an ABSENT key is the only way to leave the passed count
  // unscored. Dense live-retrieval relies on that: `null` there would be a
  // guaranteed 0 on any run that passes alerts, not an opt-out.
  expectedRetrievedAlertCount?: number | null;
  expectedPassedAlertCount?: number | null;
  attackDiscoveries?: AttackDiscovery[];
  criteria?: string[];
}

export interface AttackDiscoveryAgentBuilderMetadata extends Record<string, unknown> {
  alertCount: number;
  fixture:
    | 'provided-alerts'
    | 'live-retrieval'
    | 'missing-alert-retrieval'
    | 'status-only'
    | 'multiple-alert-sets'
    | 'scenario-registry';
  scenarioKey?: string;
  seedProfile?: 'clean' | 'dense';
}

export type AttackDiscoveryAgentBuilderExample = Example<
  AttackDiscoveryAgentBuilderInput,
  AttackDiscoveryAgentBuilderExpected,
  AttackDiscoveryAgentBuilderMetadata
>;

/**
 * Which observable produced the `retrievedAlertCount` the WorkflowEvidence
 * evaluator scores. Recorded on every task output so a count is never read
 * without its provenance, and a future `N/A` is self-explaining.
 *
 * The `pipeline_*` sources are the product pipeline response's Alert Retrieval
 * phase — a RETRIEVED count. `agent_esql_retrieval` is the row count of the
 * agent's OWN ES|QL retrieval (`platform.core.execute_esql` against the alerts
 * index) — the only observable retrieval source in `provided` mode, where the
 * pipeline skips retrieval by design. `none` means nothing reported a number.
 */
export type RetrievedAlertCountSource =
  | 'pipeline_alert_retrieval'
  | 'pipeline_combined_alerts'
  | 'agent_esql_retrieval'
  | 'none';

/**
 * One `alert_retrieval` entry of the pipeline response, reduced to the counts
 * triage reads. The raw `alerts` payload is deliberately NOT persisted: it is
 * the anonymized alert text (unbounded in size, and duplicated once per
 * evaluator score document) and the alert set the agent itself saw is already
 * recorded in `steps`. `alertsCount` keeps the block's cardinality, so "the
 * response carried 16 supplied alerts" stays checkable.
 */
export interface AttackDiscoveryAlertRetrievalEntryEvidence {
  alertsContextCount: number | null;
  extractionStrategy: string | null;
  alertsCount: number | null;
}

/**
 * The pipeline-response facts whose absence made the dense profile's `N/A`
 * undiagnosable from the record alone: `evaluate_dataset.ts` used to keep only
 * the derived `stages`/counts, so explaining a `null` required reading the
 * product source. Persisted additively on every task output.
 */
export interface AttackDiscoveryRetrievalEvidence {
  /** `diagnostics_context.config.alertRetrievalMode` as the response reported it. */
  alertRetrievalMode: string | null;
  /** Per-entry view of the response's `alert_retrieval` block; `null` when the
   *  response carried no such block (e.g. provided mode: no retrieval phase ran). */
  pipelineAlertRetrieval: AttackDiscoveryAlertRetrievalEntryEvidence[] | null;
  /** The response's `combined_alerts` block, reduced to its counts. */
  pipelineCombinedAlerts: { alertsContextCount: number | null; alertsCount: number | null } | null;
  /** `workflow_executions_tracking` stage -> whether the response reported a
   *  value for it (the same predicate `stages` is derived from, so a stage that
   *  is tracked but not started stays visible as `false`). */
  workflowExecutionsTrackingKeys: Record<string, boolean>;
  /** Row counts of every `platform.core.execute_esql` result the agent received. */
  agentEsqlRowCounts: number[];
}

/** Empty retrieval evidence, for fixtures that do not exercise retrieval. */
export const EMPTY_RETRIEVAL_EVIDENCE: AttackDiscoveryRetrievalEvidence = {
  alertRetrievalMode: null,
  pipelineAlertRetrieval: null,
  pipelineCombinedAlerts: null,
  workflowExecutionsTrackingKeys: {},
  agentEsqlRowCounts: [],
};

export interface AttackDiscoveryAgentBuilderTaskOutput {
  messages: Array<{ message: string }>;
  steps: Array<{ tool_id?: string; results?: unknown[]; [key: string]: unknown }>;
  errors: Array<{ error: { message: string; stack?: string }; type: 'error' }>;
  traceId?: string;
  insights?: AttackDiscovery[] | null;
  adToolResult?: {
    status?: 'completed' | 'pending' | 'error' | null;
    executionUuid?: string;
    alertsContextCount?: number | null;
    discoveryCount?: number | null;
  };
  workflow: {
    stages: string[];
    retrievedAlertCount: number | null;
    /** Provenance of `retrievedAlertCount` (see `RetrievedAlertCountSource`). */
    retrievedAlertCountSource: RetrievedAlertCountSource;
    passedAlertCount: number | null;
    validatedDiscoveryCount: number | null;
    /** The response facts and the agent's own retrieval counts behind the two
     *  numbers above, kept so triage does not need a product-source read. */
    retrievalEvidence: AttackDiscoveryRetrievalEvidence;
  };
}
