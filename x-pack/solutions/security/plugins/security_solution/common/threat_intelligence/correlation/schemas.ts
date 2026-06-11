/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// Shared sub-types
// ---------------------------------------------------------------------------

const correlationVertexSchema = z.enum(['adversary', 'capability', 'infrastructure', 'victim']);

const consolidatedCandidateSchema = z.object({
  id: z.string(),
  title: z.string(),
  reason: z.string(),
});

// ---------------------------------------------------------------------------
// CorrelationFindings — the load-bearing artifact (renderer + evals + context
// handoff all consume this shape).
// ---------------------------------------------------------------------------

export const correlationFindingsLeadSchema = z.object({
  /** The primary candidate plus any members collapsed into this lead. */
  candidate_ids: z.array(z.string()).min(1),
  title: z.string(),
  relationship: z.enum(['same_campaign', 'same_actor', 'shared_tradecraft']),
  confidence: z.enum(['high', 'moderate', 'low']),
  vertices_matched: z.array(correlationVertexSchema),
  /** Short evidence-first narrative (Mustard BLUF voice). */
  bluf: z.string(),
  /** Discrete supporting-evidence items. */
  supporting: z.array(z.string()),
  /** Counter-evidence; empty array / "none found" is valid (do-not-invent rule). */
  counter: z.array(z.string()),
  /** What's missing; required for moderate / low confidence leads. */
  gaps: z.string(),
  /** Reports collapsed under this lead (see synthesize_correlations §6). */
  consolidated_candidates: z.array(consolidatedCandidateSchema),
});

export const correlationFindingsNoMatchSchema = z.object({
  id: z.string(),
  title: z.string(),
  vendor: z.string().optional(),
});

export const correlationFindingsSynthesisSchema = z.object({
  /** Overall cross-report correlation signal strength — NOT an actor identity claim. */
  correlation_signal: z.enum(['high', 'moderate', 'low', 'none']),
  reasoning: z.string(),
  gaps: z.string(),
  next_steps: z.array(z.string()),
});

export const correlationFindingsSchema = z.object({
  leads: z.array(correlationFindingsLeadSchema),
  no_match: z.array(correlationFindingsNoMatchSchema),
  synthesis: correlationFindingsSynthesisSchema,
  // CostTrace shape is extended in §8 (routes/lib/cost_tracker.ts withStageTrace).
  trace: z.record(z.string(), z.unknown()).optional(),
});

export type CorrelationFindingsLead = z.infer<typeof correlationFindingsLeadSchema>;
export type CorrelationFindingsNoMatch = z.infer<typeof correlationFindingsNoMatchSchema>;
export type CorrelationFindingsSynthesis = z.infer<typeof correlationFindingsSynthesisSchema>;
export type CorrelationFindings = z.infer<typeof correlationFindingsSchema>;

// ---------------------------------------------------------------------------
// ClusterDeepSynthesis — seam only; route deferred to Phase 5a.
// Deep dives are REPL / agent-chat for MVP via the Agent Builder tool wrappers.
// ---------------------------------------------------------------------------

export const clusterDeepSynthesisSchema = z.object({
  unique_to_supporting: z.string(),
  divergent_evidence: z.array(z.string()),
  diff_from_initial: z.string(),
});

export type ClusterDeepSynthesis = z.infer<typeof clusterDeepSynthesisSchema>;
