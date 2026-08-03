/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * A single contributing factor behind a confidence score. `weight` is a signed
 * normalized contribution in [-1, 1] (negative for counter-evidence). Kept
 * human-readable so the score stays auditable rather than a black-box number.
 */
export const ConfidenceFactorSchema = z.object({
  assessment: z.string(),
  evidence: z.string().optional(),
  name: z.string(),
  weight: z.number().optional(),
});

export type ConfidenceFactor = z.infer<typeof ConfidenceFactorSchema>;

/**
 * Calibrated confidence for a security finding (an attack discovery or a bundle
 * of related detection alerts). Orthogonal to severity / risk score: `score`
 * (0.0-1.0) answers "how sure it's real", never "how bad".
 */
export const ConfidenceSchema = z.object({
  band: z.enum(['high', 'medium', 'low']).optional(),
  factors: z.array(ConfidenceFactorSchema),
  rationale: z.string(),
  score: z.number(),
});

export type Confidence = z.infer<typeof ConfidenceSchema>;

/**
 * Field name -> raw value (everything after the first comma on the line).
 * Multi-value fields (e.g. `event.category`, `threat.tactic.id`) keep their
 * comma-joined form; use `splitMultiValue` to expand them.
 */
export type ParsedAlertFields = Record<string, string>;

export interface DeterministicFactors {
  /** Positive-signal base score in [0, 1], before counter-evidence penalty. */
  baseScore: number;
  /** Strength of benign/counter evidence in [0, 1]; higher lowers confidence. */
  counterStrength: number;
  factors: ConfidenceFactor[];
  /** Number of alerts in the bundle that carried scoreable fields. */
  matchedAlertCount: number;
}
