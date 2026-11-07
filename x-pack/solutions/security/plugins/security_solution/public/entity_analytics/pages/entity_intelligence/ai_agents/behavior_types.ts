/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentEvidenceSource, AgentOperationOutcome } from './types';

export type BehaviorUnitKind = 'session' | 'invocation';
export type BehaviorCoverage = 'complete' | 'partial';
export type BehaviorFindingKind =
  | 'new_tool'
  | 'failure_rate_increase'
  | 'repeated_tool_failures'
  | 'tool_volume_increase'
  | 'duration_increase';

export interface BehaviorToolCall {
  id: string;
  toolName?: string;
  nameRedacted?: boolean;
  timestamp: string;
  outcome: AgentOperationOutcome;
  source: AgentEvidenceSource;
}

export interface BehaviorToolSummary {
  toolName?: string;
  nameRedacted?: boolean;
  count: number;
  successCount: number;
  failureCount: number;
  unknownCount: number;
}

export interface BehaviorUnit {
  id: string;
  agentId: string;
  startedAt: string;
  observedThrough?: string;
  durationMs?: number;
  toolsComplete: boolean;
  toolCallsComplete?: boolean;
  toolCalls: BehaviorToolCall[];
  toolSummary?: { tools: BehaviorToolSummary[] };
  source: AgentEvidenceSource;
}

export interface BehaviorWindow {
  start: string;
  end: string;
  coverage: BehaviorCoverage;
  units: BehaviorUnit[];
}

export interface BehaviorRules {
  minimumBaselineUnits: number;
  minimumBaselineKnownOutcomes: number;
  minimumCurrentKnownOutcomes: number;
  minimumCurrentFailures: number;
  failureRateIncrease: number;
  failureRateRatio: number;
  repeatedFailures: number;
  repeatedFailureWindowMs: number;
  volumeRatio: number;
  minimumCurrentToolCalls: number;
  durationRatio: number;
  minimumDurationMs: number;
  maximumEvidence: number;
}

export interface AgentBehaviorInput {
  agentId: string;
  unitKind: BehaviorUnitKind;
  baseline: BehaviorWindow;
  current: BehaviorWindow;
  rules?: Partial<BehaviorRules>;
}

export interface BehaviorWindowSummary {
  start: string;
  end: string;
  coverage: BehaviorCoverage;
  unitCount: number;
  toolCallCount: number;
  knownOutcomeCount: number;
  failureCount: number;
  unknownOutcomeCount: number;
  unnamedToolCallCount: number;
  observedDurationCount: number;
  detailedToolCallCount: number;
}

export interface BehaviorEvidence {
  unitId: string;
  callId?: string;
  timestamp: string;
  source: AgentEvidenceSource;
}

export interface BehaviorFinding {
  id: string;
  kind: BehaviorFindingKind;
  unitId?: string;
  toolName?: string;
  metric: 'tool_calls' | 'failure_rate' | 'milliseconds';
  observed: number;
  baseline?: number;
  threshold: number;
  baselineSampleSize: number;
  currentSampleSize: number;
  sampleBased: boolean;
  evidence: BehaviorEvidence[];
  evidenceTruncated: boolean;
}

export type BehaviorComparisonStatus =
  | 'evaluated'
  | 'insufficient_baseline'
  | 'insufficient_current_data'
  | 'incomplete_coverage'
  | 'no_current_data'
  | 'unavailable_metadata'
  | 'invalid_windows';

export interface BehaviorComparison {
  status: BehaviorComparisonStatus;
  baselineSampleSize: number;
  currentSampleSize: number;
}

export interface BehaviorToolProfile {
  name: string;
  baselineCount: number;
  currentCount: number;
  currentFailures: number;
  baselineShare: number;
  currentShare: number;
}

export interface AgentBehaviorAnalysis {
  agentId: string;
  unitKind: BehaviorUnitKind;
  status: 'evaluated' | 'insufficient_baseline' | 'partial' | 'no_current_data' | 'invalid_windows';
  baseline: BehaviorWindowSummary;
  current: BehaviorWindowSummary;
  comparisons: Record<BehaviorFindingKind, BehaviorComparison>;
  findings: BehaviorFinding[];
  toolProfiles: BehaviorToolProfile[];
  rules: BehaviorRules;
}
