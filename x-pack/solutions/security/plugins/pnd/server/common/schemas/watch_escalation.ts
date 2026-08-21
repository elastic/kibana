/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Cross-Watch escalation payload (Floor -> Dark -> Deep seam).
//
// This is the exact object a Watch orchestrator's `escalate_to_*` step produces
// and passes as `inputs.escalation` to the next tier's `workflow.execute` child.
//
// Historically this handoff was an UNTYPED ad-hoc object literal, which is the
// direct root cause of bug #9: a bare `{{ escalation }}` Handlebars template
// stringified the object into the literal "[object Object]" wherever
// `investigationId` should have threaded through Dark/Deep. Giving the handoff a
// real contract makes that failure mode a parse error at the seam instead of a
// silent data-corruption downstream, and lets the escalation-chain eval suite
// assert its synthetic fixture matches the shape the product actually emits.

import { z } from '@kbn/zod/v4';

/** Watches that participate in the escalation chain (Floor -> Dark -> Deep). */
export const watchEscalationTierSchema = z.enum([
  'watch-floor',
  'watch-dark',
  'watch-deep',
  'watch-detection',
]);
export type WatchEscalationTier = z.infer<typeof watchEscalationTierSchema>;

/**
 * Structured escalation payload threaded between Watch tiers. `investigationId`
 * is the single most important field: every downstream proposal must carry it
 * unchanged (bug #9 corrupted exactly this value).
 */
export const watchEscalationSchema = z.object({
  fromWatch: watchEscalationTierSchema,
  toWatch: watchEscalationTierSchema,
  /** Human-readable escalation rationale surfaced to the analyst. */
  reason: z.string().min(1),
  /** Escalating tier's confidence in the hand-off (0..1). */
  confidence: z.number().min(0).max(1),
  /** MUST thread unchanged through every downstream tier and proposal. */
  investigationId: z.string().min(1),
  /** MITRE technique IDs (or other indicators) motivating the escalation. */
  indicators: z.array(z.string().min(1)).min(1),
});
export type WatchEscalation = z.infer<typeof watchEscalationSchema>;
