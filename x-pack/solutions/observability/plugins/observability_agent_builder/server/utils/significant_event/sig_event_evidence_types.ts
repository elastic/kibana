/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationResultData } from '@kbn/agent-builder-common/tools/tool_result';

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

/** Result of Agent Builder `create_visualization` for an evidence time trend (full tool payload). */
export type SigEventEvidenceTrendBody =
  | { success: true; visualization: VisualizationResultData }
  | { success: false; error: string };

/** Lean trend payload for HTTP (Lens spec only). */
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
  body: SigEventEvidenceTrendBody
): SigEventEvidenceReviewTrendBody {
  if (body.success === false) {
    return body;
  }
  return { success: true, lensVisualization: body.visualization.visualization };
}
