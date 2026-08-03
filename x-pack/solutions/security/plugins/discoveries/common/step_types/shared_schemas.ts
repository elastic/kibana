/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Reusable schema for anonymized alert documents passed between workflow steps.
 */
export const AnonymizedAlertSchema = z.object({
  id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()),
  page_content: z.string(),
});

export type AnonymizedAlert = z.infer<typeof AnonymizedAlertSchema>;

/**
 * Reusable schema for connector / LLM configuration passed between workflow steps.
 */
export const ApiConfigSchema = z.object({
  action_type_id: z.string().optional(),
  connector_id: z.string(),
  default_system_prompt_id: z.string().optional(),
  model: z.string().optional(),
  provider: z.enum(['OpenAI', 'Azure OpenAI', 'Other']).optional(),
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;

/**
 * A single contributing factor behind a confidence score. `weight` is a signed
 * normalized contribution in [-1, 1] (negative for counter-evidence). Kept
 * human-readable so the score stays auditable rather than a black-box number.
 *
 * NOTE: mirrors the reusable core in `@kbn/discoveries/impl/confidence` — that
 * package is server-scoped, so this browser-safe `common` copy cannot import it.
 * The two are consolidated when confidence is removed from the AD document.
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
 * Reusable schema for a single generated attack discovery.
 */
export const AttackDiscoverySchema = z.object({
  alert_ids: z.array(z.string()),
  confidence: ConfidenceSchema.optional(),
  details_markdown: z.string(),
  entity_summary_markdown: z.string().optional(),
  id: z.string().optional(),
  mitre_attack_tactics: z.array(z.string()).optional(),
  summary_markdown: z.string(),
  timestamp: z.string().optional(),
  title: z.string(),
});

export type AttackDiscovery = z.infer<typeof AttackDiscoverySchema>;
