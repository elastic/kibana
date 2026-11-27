/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';

/** The verdicts the `coverage_check` step of the coverage review can return. */
export type CoverageVerdict =
  | 'covered_enabled'
  | 'covered_disabled'
  | 'prebuilt_available'
  | 'no_coverage';

/** A knowledge indicator of type `security.coverage`, as the hunt producer writes it. */
export interface CoverageIndicator {
  type: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  attributes: Record<string, unknown>;
  references: Array<{ uri: string; relation: string; description: string }>;
}

// `Example` requires an index signature on input and metadata.
export interface CoverageInput extends Record<string, unknown> {
  /** Id of the case in the source answer key. Not shown to the model. */
  gapId: string;
  indicator: CoverageIndicator;
}

export interface CoverageExpected {
  verdict: CoverageVerdict;
  /** The rule the check must name. Absent when the expected verdict is no_coverage. */
  primaryRule?: { ruleId: string; name: string };
  /** Other rules that also detect the gap. A match on one of them passes. */
  alternateRuleNames: string[];
  /** Rules that look related but detect another behavior or need another data source. */
  decoyRuleNames: string[];
}

export interface CoverageMetadata extends Record<string, unknown> {
  difficulty: string;
  whatItTests: string;
  passCriteria: string;
}

export interface CoverageExample
  extends Example<CoverageInput, CoverageExpected, CoverageMetadata> {
  input: CoverageInput;
  output: CoverageExpected;
  metadata: CoverageMetadata;
}

/** What one coverage review run produced, read from its `coverage_check` step. */
export interface CoverageCheckResult {
  workflowExecutionId: string;
  executionStatus: string;
  /** True when the check step did not return a structured verdict. */
  checkFailed: boolean;
  /** Connector the check ran on, as the ai.agent step reports it. */
  connectorId?: string;
  checkError?: string;
  verdict?: string;
  ruleId?: string;
  ruleName?: string;
  prebuiltVersion?: number;
  /** Full reasoning. The review writes it into the investigation. */
  rationale?: string;
  /** One or two sentences. The review shows them in the proposal comment. */
  rationaleSummary?: string;
}
