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
  /**
   * The fixture marker this example's alert retrieval must carry, when the
   * example asserts a retrieved population (`expectedRetrievedAlertCount`).
   *
   * `.alerts-security.alerts-default` is a SHARED index: the golden-path spec
   * seeds its own alerts into the same index the dense profile seeds 95 into,
   * so a query that reads the index without the fixture's marker observes a
   * population that is not this fixture's. `FROM
   * .alerts-security.alerts-default | LIMIT 95` returns 95 rows and would
   * otherwise be scored as a complete retrieval of the dense fixture without
   * touching a single seeded alert. A retrieval is therefore counted for this
   * example only when its query carries this string
   * (`extractAgentAlertRetrievalPopulation` in `evaluate_dataset.ts`); the query
   * is the observable that proves the scope, because the AD default query's
   * `KEEP` list returns no marker-bearing field.
   *
   * Enforced on BOTH observables: the agent's own ES|QL results and the
   * `esql_query` the agent hands `security.attack-discovery.run` (the pipeline's
   * Alert Retrieval phase runs that query). Declaring this string means the
   * example asserts a retrieval, so a run that observed none of the example's
   * population reports a retrieved count of 0 — a failed retrieval, scored —
   * rather than `null` (unobservable, and therefore excluded from the
   * aggregate). Both ways of observing none score 0: omitting this string in
   * every retrieval, and making no alerts retrieval at all. `null` is reserved
   * for the examples that omit this field, which ask no retrieval question.
   *
   * Omitted on examples that do not assert a retrieved population.
   */
  retrievalScope?: string;
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
 * phase — a RETRIEVED count. `agent_esql_retrieval` is the observed population
 * of the agent's OWN ES|QL retrievals (`platform.core.execute_esql` against the
 * alerts index) — the only observable retrieval source in `provided` mode,
 * where the pipeline skips retrieval by design.
 *
 * `unscoped_retrieval` and `none` are the two ways a scoped example observes
 * none of this fixture's population, and both score 0 rather than `N/A` (which
 * the aggregate drops, so `N/A` would make skipping the retrieval the way to
 * avoid the assertion): `unscoped_retrieval` means a retrieval DID happen but
 * none of it carried the example's declared scope, `none` means no alerts
 * retrieval happened at all. `none` is also what an example that declares no
 * scope reports — it asks no retrieval question, so its count stays `null` and
 * the evaluator leaves the evidence incomplete.
 */
export type RetrievedAlertCountSource =
  | 'pipeline_alert_retrieval'
  | 'pipeline_combined_alerts'
  | 'agent_esql_retrieval'
  | 'unscoped_retrieval'
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
  /** The marker the example's retrieval had to carry (`input.retrievalScope`);
   *  `null` when the example declares no scope. */
  retrievalScope: string | null;
  /** Row counts of the agent's alerts-index retrievals that did NOT carry
   *  `retrievalScope`, and therefore contributed no observed population.
   *  Non-empty means the agent retrieved alerts unscoped: none of what it
   *  observed is attributable to this fixture, which is a different finding
   *  from "no retrieval happened" (the count is 0 in the first case, `null` in
   *  the second). */
  unscopedAgentAlertRetrievalRowCounts: number[];
  /** Pipeline-derived counts excluded for the same reason: the query the agent
   *  handed `security.attack-discovery.run` (`params.esql_query`) is what the
   *  pipeline's Alert Retrieval phase ran, so a pipeline count is admitted only
   *  when that query carries `retrievalScope`. Non-empty means the pipeline
   *  reported a retrieval this fixture's marker does not cover. */
  unscopedPipelineAlertRetrievalCounts: number[];
}

/** Empty retrieval evidence, for fixtures that do not exercise retrieval. */
export const EMPTY_RETRIEVAL_EVIDENCE: AttackDiscoveryRetrievalEvidence = {
  alertRetrievalMode: null,
  pipelineAlertRetrieval: null,
  pipelineCombinedAlerts: null,
  workflowExecutionsTrackingKeys: {},
  agentEsqlRowCounts: [],
  retrievalScope: null,
  unscopedAgentAlertRetrievalRowCounts: [],
  unscopedPipelineAlertRetrievalCounts: [],
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
