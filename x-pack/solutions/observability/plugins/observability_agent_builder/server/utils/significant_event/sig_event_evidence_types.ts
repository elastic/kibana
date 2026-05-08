/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceTrendLensResult } from './run_sig_event_evidence_trend';

export type SymptomStatus = 'healthy' | 'failing' | 'resolved';

export interface SymptomSignalSummary {
  evidenceRowHits: number;
  eligibleEvidenceCount: number;
  evidenceQueriesWithMatches: number;
}

/** One row per evaluated evidence query (only `result === 'found'` evidences are re-run). */
export interface SigEventEvidenceCheckItem {
  readonly ruleName: string;
  readonly rowCount: number;
  readonly hasMatches: boolean;
  readonly errorMessage?: string;
}

export interface SigEventEvidenceCheckProgress {
  lastSeen: ReadonlyArray<{ symptomKey: string; at: string | null }>;
}

export interface SigEventEvidenceCheckEvaluation {
  status: SymptomStatus;
  recommendation: string;
  signals: SymptomSignalSummary;
  progress: SigEventEvidenceCheckProgress;
  evidenceChecks: ReadonlyArray<SigEventEvidenceCheckItem>;
}

export interface SigEventEvidenceCheckResponse extends SigEventEvidenceCheckEvaluation {
  significantEventId: string;
}

/** Lean trend payload for HTTP (Lens API config). */
export type SigEventEvidenceReviewTrendBody =
  | { success: true; lensVisualization: Record<string, unknown> }
  | { success: false; error: string };

export interface SigEventEvidenceReviewItem {
  readonly ruleName: string;
  readonly lastSeen: string | null;
  readonly trend: SigEventEvidenceReviewTrendBody;
}

export interface SigEventEvidenceTrendRange {
  readonly from: string;
  readonly to: string;
  readonly bucketMinutes: number;
}

/** POST significant_events/evidence_review response (matching rules only; lean trend blobs). */
export interface SigEventEvidenceReviewResponse {
  readonly status: SymptomStatus;
  readonly recommendation: string;
  readonly significantEventId: string;
  readonly trendRange: SigEventEvidenceTrendRange;
  readonly signals: SymptomSignalSummary;
  readonly evidenceItems: ReadonlyArray<SigEventEvidenceReviewItem>;
}

export function toEvidenceReviewTrendPayload(
  result: EvidenceTrendLensResult
): SigEventEvidenceReviewTrendBody {
  if (result.success === false) {
    return result;
  }
  return { success: true, lensVisualization: result.lensConfig };
}
