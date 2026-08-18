/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Detection Change Signal + Rule-Tuning trigger (Watch -> Detection Watch seam).
// Decided in #watch-floor (2026-07-23): AD/Dark/Deep workers ATTACH a coverage-gap
// signal to the Investigation; they never create or tune rules themselves. Detection
// Watch (the 5th tier) consumes these. Both shapes are CONDITIONAL/optional: absence
// is a valid, first-class outcome (James Spiteri: "don't assume the detection watch
// will always be needed").

import { z } from '@kbn/zod/v4';

/** One detection coverage gap the worker observed. */
export const detectionGapSchema = z.object({
  technique: z.string(),
  ruleRef: z.string().optional(),
  evidence: z.string(),
  confidence: z.number().min(0).max(1),
});
export type DetectionGap = z.infer<typeof detectionGapSchema>;

/**
 * Structured Detection Change Signal attached to an Investigation. Emitted by the
 * Dark/Deep Workers only when a real coverage gap exists.
 */
export const detectionChangeSignalSchema = z.object({
  sourceWatch: z.enum(['watch-dark', 'watch-deep', 'watch-ad']),
  runId: z.string(),
  investigationId: z.string(),
  gaps: z.array(detectionGapSchema).min(1),
});
export type DetectionChangeSignal = z.infer<typeof detectionChangeSignalSchema>;

/**
 * Rule-Tuning trigger surfaced on a Proposal when the Floor Worker dispositions an
 * alert as a false positive. Detection Watch's Rule Tuning worker subscribes to this.
 */
export const ruleTuningTriggerSchema = z.object({
  reason: z.literal('false_positive'),
  alertId: z.string(),
  ruleRef: z.string().optional(),
  confidence: z.number().min(0).max(1),
  investigationId: z.string(),
});
export type RuleTuningTrigger = z.infer<typeof ruleTuningTriggerSchema>;

/**
 * Validate a Detection Change Signal at the boundary. Throws on missing
 * required fields or invalid enum values.
 *
 * Wire this into emit_proposal.ts detection-change handling path to reject
 * malformed signals before they reach the Detection Watch.
 */
export const validateDetectionChangeSignal = (input: unknown): DetectionChangeSignal => {
  return detectionChangeSignalSchema.parse(input);
};
