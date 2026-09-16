/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public detection rule response schema.
 *
 * The shape every Detections API endpoint returns. Fields are composed from
 * the `@kbn/security-detection-rule-schema` package wherever that package
 * owns the bounds, so the public bound and the stored bound cannot drift.
 *
 * Key invariants from the design:
 *   - Defaultable fields are always present (never optional in the response).
 *   - Genuinely optional fields may be absent: `note`, `license`,
 *     `schedule.lookback`, `source.id`.
 *   - `rule_id` is the public name of `metadata.signature_id`.
 *   - `version` is `metadata.source.version`; `revision` is `metadata.revision`.
 *
 * Ref: rule-domain-model.md "The public rule object"
 *      rule-domain-model.md "Identity and versions in the public model"
 */

import { z } from '@kbn/zod/v4';
import {
  detectionRuleCommonFields,
  customQueryBuilderFieldsSchema,
  thresholdBuilderFieldsSchema,
} from '@kbn/security-detection-rule-schema';
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from '@kbn/alerting-v2-schemas';
import { MAX_TAG_LENGTH, MAX_TAGS } from '@kbn/alerting-v2-constants';

// ---------------------------------------------------------------------------
// Nested object sub-schemas
// ---------------------------------------------------------------------------

/**
 * The three-variant source object.  Only `type` is always present; `id` is
 * absent for internal rules and may be absent for external ones too.
 *
 * Ref: rule-domain-model.md "The public rule object"
 *      rule-source.md "The v2 source object"
 */
export const detectionRuleSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('internal') }).strict(),
  z.object({ type: z.literal('template'), id: z.string() }).strict(),
  z.object({ type: z.literal('external') }).merge(z.object({ id: z.string().optional() })),
]);
export type DetectionRuleSource = z.infer<typeof detectionRuleSourceSchema>;

/** `{ interval, lookback? }` — lookback may be absent if not set. */
export const detectionRuleScheduleSchema = z
  .object({
    interval: z.string().min(1),
    lookback: z.string().min(1).optional(),
  })
  .strict();
export type DetectionRuleSchedule = z.infer<typeof detectionRuleScheduleSchema>;

// ---------------------------------------------------------------------------
// Base response fields — present on all detection rule responses
//
// Defaultable fields are required here (no .optional()), matching the design's
// invariant that a consumer never branches on absence for `tags`, `max_signals`,
// etc.  The package's optional wrappers are stripped via ZodOptional.unwrap().
//
// Ref: rule-domain-model.md "The public rule object"
//      rule-domain-model.md (example response)
// ---------------------------------------------------------------------------

export const detectionRuleResponseBaseSchema = z.object({
  // --- Identity and audit — server-set, never writable ---
  id: z.string(),
  /** Public name of metadata.signature_id. */
  rule_id: z.string(),
  /** Meaningful-edit counter (framework-moved). Read-only. */
  revision: z.number().int().min(0),
  /** Rule origin — type + optional lineage id. Response-only. */
  source: detectionRuleSourceSchema,
  created_at: z.string(),
  created_by: z.string().nullable(),
  updated_at: z.string(),
  updated_by: z.string().nullable(),
  /** Initial state set at create; toggled via the enable/disable endpoints. */
  enabled: z.boolean(),

  // --- Content version — caller-writable, never framework-moved ---
  /** Maps to metadata.source.version. */
  version: z.number().int().min(1),

  // --- Common detection fields — v1 names, v1 semantics ---
  //
  // Framework metadata caps use the exported constants so the public bound and
  // the framework bound cannot silently diverge.  Builder-field bounds are
  // composed from detectionRuleCommonFields so the response and the stored
  // schema share the same constraint objects.
  //
  // Ref: rule-domain-model.md "Where the schemas live"
  //      rule-crud-api.md "Validation layering"
  name: z.string().max(MAX_NAME_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH),
  /** Always present; stored absence is read back as []. */
  tags: z.array(z.string().min(1).max(MAX_TAG_LENGTH)).max(MAX_TAGS),

  // severity and risk_score: imported directly from the package — same bounds
  // as the stored builder schema, so they cannot drift.
  severity: detectionRuleCommonFields.severity,
  risk_score: detectionRuleCommonFields.risk_score,

  // Defaultable fields: strip the package's .optional() wrapper so they are
  // required in the response.  ZodOptional.unwrap() returns the inner schema
  // with all constraints intact.
  max_signals: detectionRuleCommonFields.max_signals.unwrap(),
  threat: detectionRuleCommonFields.threat.unwrap(),
  setup: detectionRuleCommonFields.setup.unwrap(),
  /** Absent when not set. */
  note: detectionRuleCommonFields.note,
  references: detectionRuleCommonFields.references.unwrap(),
  false_positives: detectionRuleCommonFields.false_positives.unwrap(),
  author: detectionRuleCommonFields.author.unwrap(),
  /** Absent when not set. */
  license: detectionRuleCommonFields.license,
  related_integrations: detectionRuleCommonFields.related_integrations.unwrap(),
  required_fields: detectionRuleCommonFields.required_fields.unwrap(),
  schedule: detectionRuleScheduleSchema,
});

export type DetectionRuleResponseBase = z.infer<typeof detectionRuleResponseBaseSchema>;

// ---------------------------------------------------------------------------
// Type-discriminated fields
// ---------------------------------------------------------------------------

/**
 * Custom Query rule — the two types share `index`, `query`, `language`.
 *
 * Field bounds are composed from `customQueryBuilderFieldsSchema.shape.*` so
 * the public schema and the stored builder schema share the same constraints.
 */
export const customQueryRuleTypeFieldsSchema = z.object({
  type: z.literal('query'),
  index: customQueryBuilderFieldsSchema.shape.index,
  /** Non-empty: the design forbids an empty `query` for this type. */
  query: customQueryBuilderFieldsSchema.shape.query,
  language: customQueryBuilderFieldsSchema.shape.language,
});
export type CustomQueryRuleTypeFields = z.infer<typeof customQueryRuleTypeFieldsSchema>;

/**
 * Threshold rule — adds the normalized threshold object.
 *
 * Field bounds are composed from `thresholdBuilderFieldsSchema.shape.*` so
 * the public schema and the stored builder schema share the same constraints.
 */
export const thresholdRuleTypeFieldsSchema = z.object({
  type: z.literal('threshold'),
  index: thresholdBuilderFieldsSchema.shape.index,
  /** May be empty (match-all pre-filter). */
  query: thresholdBuilderFieldsSchema.shape.query,
  language: thresholdBuilderFieldsSchema.shape.language,
  threshold: thresholdBuilderFieldsSchema.shape.threshold,
});
export type ThresholdRuleTypeFields = z.infer<typeof thresholdRuleTypeFieldsSchema>;

// ---------------------------------------------------------------------------
// Full response schema — discriminated union on `type`
// ---------------------------------------------------------------------------

const customQueryResponseSchema = detectionRuleResponseBaseSchema.merge(
  customQueryRuleTypeFieldsSchema
);
const thresholdResponseSchema = detectionRuleResponseBaseSchema.merge(
  thresholdRuleTypeFieldsSchema
);

/**
 * Full Zod schema for `DetectionRuleResponse`.
 *
 * Discriminated on `type` — the short alias (`'query'`, `'threshold'`), NOT
 * the namespaced builder type id.  The alias map in `rule_alias_map.ts`
 * translates between them.
 */
export const detectionRuleResponseSchema = z.discriminatedUnion('type', [
  customQueryResponseSchema,
  thresholdResponseSchema,
]);

/**
 * The shape every Detections API endpoint returns.
 *
 * A discriminated union on `type` with two members.  Fields follow v1 names
 * and semantics wherever the concept survived the move to v2.
 *
 * Ref: rule-domain-model.md "The public rule object"
 */
export type DetectionRuleResponse = DetectionRuleResponseBase &
  (CustomQueryRuleTypeFields | ThresholdRuleTypeFields);
