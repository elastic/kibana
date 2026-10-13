/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type {
  Brief,
  VerificationSummary,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { Evidence, SignalOutcome } from '../signals/types';

export interface ComposeVerifiedBriefParams {
  /** Bound to the resolved connector. */
  inferenceClient: BoundInferenceClient;
  evidence: Evidence;
  /** How each signal's run went, for the prompt's "Signals" section. */
  signals: readonly SignalOutcome[];
  timeRange: { from: string; to: string; range: string };
  abortSignal: AbortSignal;
  logger: Logger;
  /** Called when moving from compose to verify, so the job doc can show the stage. */
  onStage?: (stage: 'compose' | 'verify') => Promise<void>;
}

export interface ComposeVerifiedBriefResult {
  brief: Brief;
  verification: VerificationSummary;
  model?: string;
  tokens: { prompt: number; completion: number; total: number };
}

/** Thrown when the AI output can't be turned into a valid brief, even after one repair. */
export class BriefCompositionError extends Error {
  constructor(
    public readonly code: 'llm_error' | 'llm_output',
    message: string,
    /** Usage of the attempts made before failing, so failed runs still report tokens. */
    public readonly tokens?: ComposeVerifiedBriefResult['tokens']
  ) {
    super(message);
    this.name = 'BriefCompositionError';
  }
}

/** Compose → verify → (one repair) → verified brief. Implemented in composition/compose_verified_brief.ts. */
export type ComposeVerifiedBrief = (
  params: ComposeVerifiedBriefParams
) => Promise<ComposeVerifiedBriefResult>;
