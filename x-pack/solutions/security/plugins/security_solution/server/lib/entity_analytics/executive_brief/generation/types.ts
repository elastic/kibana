/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefGeneratorKind,
  BriefNarrationMode,
  BriefSnapshot,
  ExecutiveBrief,
  ExecutiveBriefJob,
} from '../../../../../common/entity_analytics/executive_brief/types';

export interface BriefGenerationInput {
  snapshot: BriefSnapshot;
  mode: BriefNarrationMode;
  abortSignal?: AbortSignal;
}

export interface BriefGenerationResult {
  brief: ExecutiveBrief;
  model?: string;
  /** Actual usage summed over attempts; fields the provider did not report stay undefined. */
  tokens?: ExecutiveBriefJob['tokens'];
  /** LLM calls made (1 + validation retries). */
  attempts?: number;
}

/** Turns a deterministic snapshot into an `ExecutiveBrief`. The output is always validated after. */
export interface BriefGenerator {
  readonly kind: BriefGeneratorKind;
  generate: (input: BriefGenerationInput) => Promise<BriefGenerationResult>;
  /** Pre-call estimate of what an LLM run would send for this input. */
  estimate?: (input: BriefGenerationInput) => ExecutiveBriefJob['estimate'];
}
