/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * MITRE ATT&CK threat shape mirroring the `ReferenceRule.threat[]` field used
 * across SIEM migrations and detection-rule authoring. Sub-technique is optional.
 */
export const mitreThreatSchema = z.object({
  tactic: z.string(),
  technique: z.string(),
  subtechnique: z.string().optional(),
});

/** Detection-rule severity enum, aligned with security_solution rule schemas. */
export const severitySchema = z.enum(['low', 'medium', 'high', 'critical']);

/** Detection-rule risk score, bounded [0, 100]. */
export const riskScoreSchema = z.number().int().min(0).max(100);

/**
 * Detection-rule schedule interval — `Ns`, `Nm`, `Nh`, or `Nd` (e.g. `5m`, `1h`).
 */
export const intervalSchema = z.string().regex(/^\d+[smhd]$/);

/**
 * UUID identifying a `rule_migrations` saved object. We deliberately keep this
 * as a plain UUID refinement (not a branded type) to avoid call-site friction;
 * upgrade to `.brand('MigrationId')` only if collision risk emerges.
 */
export const migrationIdSchema = z.string().uuid();

/**
 * Consent gate for destructive operations. Tool input schemas must compose this
 * shape (or extend it) so the LLM cannot silently invoke a mutation without an
 * explicit operator confirmation. Use `confirm: z.literal(true)` rather than a
 * prose instruction so the contract is structurally enforceable.
 */
export const confirmDestructiveSchema = z.object({
  confirm: z.literal(true),
});

/**
 * Translated detection rule shape consumed by both the correction and context
 * skills. Mirrors the `ReferenceRule` interface in
 * `@kbn/evals-suite-security-ai-rules` so eval datasets and live runtime
 * payloads share one type vocabulary.
 */
export const translatedRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  query: z.string().optional(),
  esqlQuery: z.string().optional(),
  threat: z.array(mitreThreatSchema).default([]),
  severity: severitySchema,
  riskScore: riskScoreSchema,
  interval: intervalSchema.optional(),
  tags: z.array(z.string()).default([]),
});

export type MitreThreat = z.infer<typeof mitreThreatSchema>;
export type Severity = z.infer<typeof severitySchema>;
export type RiskScore = z.infer<typeof riskScoreSchema>;
export type Interval = z.infer<typeof intervalSchema>;
export type MigrationId = z.infer<typeof migrationIdSchema>;
export type ConfirmDestructive = z.infer<typeof confirmDestructiveSchema>;
export type TranslatedRule = z.infer<typeof translatedRuleSchema>;
