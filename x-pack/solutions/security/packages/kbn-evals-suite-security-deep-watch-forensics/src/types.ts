/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Task output for one Deep Watch forensic analysis.
 *
 * Mirrors the shape returned by the `produce_draft_forensic_report` tool
 * so evaluators can inspect timeline depth, IoC validation results,
 * and guardrail compliance (FR-082, FR-007, FR-DP-04, FR-DP-06).
 */
export interface ForensicTaskOutput {
  // ── Routing ────────────────────────────────────────────────────────────────
  skillInvoked?: boolean;
  toolCalled?: string;

  // ── Report structure ───────────────────────────────────────────────────────
  reportStatus?: string;
  scope?: {
    hosts: string[];
    time_window_hours: number;
    mitre_techniques: string[];
  };
  timelineEventCount: number;
  validatedIocs: Array<{
    type: string;
    value: string;
    status: 'confirmed' | 'not_found' | 'unable_to_validate';
    source_event?: string;
  }>;
  persistenceFindings?: string;
  remediationRecommendations?: string[];
  unresolvedQuestions?: string[];
  confidenceAssessment?: {
    overall: 'high' | 'medium' | 'low' | 'insufficient';
    rationale: string;
    note?: string;
  };

  // ── Guardrails ─────────────────────────────────────────────────────────────
  draftLabelPresent?: boolean;
  noExecutionClaimed?: boolean;
  fabricationDisclaimed?: boolean;
  unresolvedQuestionsNamed?: boolean;
  confidenceSeparateFromSeverity?: boolean;

  // ── Trace / telemetry ──────────────────────────────────────────────────────
  traceId?: string;
}

/**
 * One labeled forensic scenario.
 */
export interface ForensicExample {
  id: string;
  input: {
    /** Escalation context passed from Dark Watch / Watch Floor / analyst. */
    escalation_context: string;
    /** Hosts in scope for the forensic investigation. */
    hosts: string[];
    /** Time window (hours) to look back for telemetry. */
    time_window_hours: number;
    /** IoCs extracted by upstream Dark Watch. */
    iocs: Array<{ type: string; value: string }>;
    /** MITRE techniques flagged by upstream Dark Watch. */
    mitre_techniques: string[];
  };
  output: {
    /** Minimum expected timeline events (logged if telemetry is seeded). */
    minTimelineEvents: number;
    /** Expected IoC validation results. */
    expectedIocs: Array<{
      type: string;
      value: string;
      status: 'confirmed' | 'not_found' | 'unable_to_validate';
    }>;
    /** Expected unresolved questions (at least one must be present). */
    minUnresolvedQuestions: number;
    /** Draft label must be present. */
    draftLabelRequired: boolean;
    /** No execution claim must be present. */
    noExecutionRequired: boolean;
  };
}
