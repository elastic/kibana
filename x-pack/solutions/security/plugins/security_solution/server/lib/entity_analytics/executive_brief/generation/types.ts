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
} from '../../../../../common/entity_analytics/executive_brief/types';

export interface BriefGenerationInput {
  snapshot: BriefSnapshot;
  mode: BriefNarrationMode;
  abortSignal?: AbortSignal;
}

export interface BriefGenerationResult {
  brief: ExecutiveBrief;
  model?: string;
  tokens?: { prompt: number; completion: number };
}

/** Turns a deterministic snapshot into an `ExecutiveBrief`. The output is always validated after. */
export interface BriefGenerator {
  readonly kind: BriefGeneratorKind;
  generate: (input: BriefGenerationInput) => Promise<BriefGenerationResult>;
}
