/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection rule request schemas — create, update (PUT), and patch (PATCH).
 *
 * Three request types mirror v1's RuleCreateProps, RuleUpdateProps, and
 * RulePatchProps.  Fields follow v1's three-group split: required, optional
 * (no default), and defaultable.
 *
 * Defaults are NOT encoded in Zod `.default()` calls.  They are applied
 * externally by `applyRuleDefaults` before the framework sees the payload,
 * following v1's `applyRuleDefaults` / `RULE_DEFAULTS` pattern.
 *
 * Ref: rule-domain-model.md "The request shapes"
 *      rule-domain-model.md (defaults table)
 *      rule-validation.md "No defaults, no transforms"
 */

import { z } from '@kbn/zod/v4';
import {
  detectionRuleCommonFields,
  customQueryBuilderFieldsSchema,
  thresholdBuilderFieldsSchema,
} from '@kbn/security-detection-rule-schema';
import {
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_SIGNATURE_ID_LENGTH,
} from '@kbn/alerting-v2-schemas';
import { MAX_TAG_LENGTH, MAX_TAGS } from '@kbn/alerting-v2-constants';
import { detectionRuleScheduleSchema } from './detection_rule_response_schema';

// ---------------------------------------------------------------------------
// Field groups following v1's BaseRequiredFields / BaseOptionalFields /
// BaseDefaultableFields split.
//
// Required on create: type, name, description, severity, risk_score, index, query.
// Optional with no default: note, license, rule_id, schedule.lookback,
//   threshold.cardinality.
// Defaultable: everything else.
//
// Ref: rule-domain-model.md "The request shapes"
// ---------------------------------------------------------------------------

/**
 * Base required fields on every create request (both types).
 * `type`, `index`, and `query` are in the per-type schemas instead.
 */
const baseRequiredFieldsSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH),
  severity: detectionRuleCommonFields.severity,
  risk_score: detectionRuleCommonFields.risk_score,
});

/**
 * Base optional fields — genuinely optional, no default value.
 * PATCH makes these nullable so `null` clears the stored value.
 *
 * `note` and `license` are imported from the schema package so bounds cannot
 * diverge from the stored model.
 */
const baseOptionalFieldsSchema = z.object({
  note: detectionRuleCommonFields.note,
  license: detectionRuleCommonFields.license,
  /**
   * Client-assignable stable identifier at create time.  On UPDATE/PATCH it is
   * optional but must match the stored value if provided (validation at the
   * application layer, not the schema layer).
   */
  rule_id: z.string().min(1).max(MAX_SIGNATURE_ID_LENGTH).optional(),
});

/**
 * Base defaultable fields — optional in create/update/patch; `applyRuleDefaults`
 * fills them before the framework sees the payload.  No `.default()` here per
 * the no-defaults rule.
 *
 * All array/string fields that the schema package already bounds are imported
 * directly so the public bound and the stored bound cannot drift.
 *
 * Ref: rule-validation.md "No defaults, no transforms"
 */
const baseDefaultableFieldsSchema = z.object({
  version: z.number().int().min(1).optional(),
  tags: z.array(z.string().min(1).max(MAX_TAG_LENGTH)).max(MAX_TAGS).optional(),
  max_signals: detectionRuleCommonFields.max_signals,
  setup: detectionRuleCommonFields.setup,
  references: detectionRuleCommonFields.references,
  false_positives: detectionRuleCommonFields.false_positives,
  author: detectionRuleCommonFields.author,
  threat: detectionRuleCommonFields.threat,
  related_integrations: detectionRuleCommonFields.related_integrations,
  required_fields: detectionRuleCommonFields.required_fields,
  /**
   * Schedule with optional lookback.  Default: { interval: '5m' }.
   * No `from: now-6m` overlap — a deliberate departure from v1.
   * A caller who wants v1's overlap sends `lookback: '6m'`.
   *
   * Ref: rule-domain-model.md "The request shapes" (defaults table)
   */
  schedule: detectionRuleScheduleSchema.optional(),
  language: customQueryBuilderFieldsSchema.shape.language.optional(),
});

// ---------------------------------------------------------------------------
// Per-type writable fields
// ---------------------------------------------------------------------------

/**
 * Writable fields specific to the Custom Query rule type.
 *
 * `index` and `query` shapes are imported from the builder schema package so
 * the public bounds cannot diverge from the stored model.  `language` is in
 * `baseDefaultableFieldsSchema` (shared across types) and is likewise imported
 * from the builder schema package there.
 */
const customQueryWritableFieldsSchema = z.object({
  type: z.literal('query'),
  index: customQueryBuilderFieldsSchema.shape.index,
  query: customQueryBuilderFieldsSchema.shape.query,
});

/**
 * Writable fields specific to the Threshold rule type.
 *
 * All type-specific field shapes are imported from the builder schema package.
 * `query` may be empty (match-all pre-filter).
 */
const thresholdWritableFieldsSchema = z.object({
  type: z.literal('threshold'),
  index: thresholdBuilderFieldsSchema.shape.index,
  /** Empty string is valid as a match-all pre-filter. */
  query: thresholdBuilderFieldsSchema.shape.query,
  threshold: thresholdBuilderFieldsSchema.shape.threshold,
});

// ---------------------------------------------------------------------------
// Create schema (POST)
//
// A discriminated union on `type`.  Accepts an optional `rule_id` and an
// initial `enabled`.  Does NOT accept `id`, `revision`, or `source`.
//
// Ref: rule-domain-model.md "The request shapes"
// ---------------------------------------------------------------------------

const customQueryCreateBaseSchema = baseRequiredFieldsSchema
  .merge(baseOptionalFieldsSchema)
  .merge(baseDefaultableFieldsSchema)
  .merge(z.object({ enabled: z.boolean().optional() }));

const thresholdCreateBaseSchema = baseRequiredFieldsSchema
  .merge(baseOptionalFieldsSchema)
  .merge(baseDefaultableFieldsSchema)
  .merge(z.object({ enabled: z.boolean().optional() }));

/**
 * Create schema for the Custom Query rule type.
 * Used as the alias map's `createSchema` entry for the `'query'` alias.
 *
 * `.strict()` makes the merged schema reject unknown keys at layer 1 so a
 * camelCase typo (e.g. `riskScore`) or a server-side field (`id`, `revision`,
 * `source`) surfaces as a 400 instead of being silently stripped.
 */
export const customQueryCreateSchema = customQueryCreateBaseSchema
  .merge(customQueryWritableFieldsSchema)
  .strict();
export type CustomQueryCreateProps = z.infer<typeof customQueryCreateSchema>;

/**
 * Create schema for the Threshold rule type.
 * Used as the alias map's `createSchema` entry for the `'threshold'` alias.
 *
 * `.strict()` — same rationale as `customQueryCreateSchema`.
 */
export const thresholdCreateSchema = thresholdCreateBaseSchema
  .merge(thresholdWritableFieldsSchema)
  .strict();
export type ThresholdCreateProps = z.infer<typeof thresholdCreateSchema>;

/**
 * `DetectionRuleCreateProps` — discriminated union on `type`.
 *
 * Accepts an optional `rule_id` and an initial `enabled`.
 * Does not accept `id`, `revision`, or `source`.
 *
 * Ref: rule-domain-model.md "The request shapes"
 */
export const detectionRuleCreatePropsSchema = z.discriminatedUnion('type', [
  customQueryCreateSchema,
  thresholdCreateSchema,
]);
export type DetectionRuleCreateProps = z.infer<typeof detectionRuleCreatePropsSchema>;

// ---------------------------------------------------------------------------
// Update schema (PUT)
//
// The create shape without `enabled`.  `type` is required (and must match the
// stored type — enforced at the application layer).  The optional `rule_id`
// must match the stored value if provided.
//
// Ref: rule-domain-model.md "The request shapes"
// ---------------------------------------------------------------------------

const customQueryUpdateBaseSchema = baseRequiredFieldsSchema
  .merge(baseOptionalFieldsSchema)
  .merge(baseDefaultableFieldsSchema);

const thresholdUpdateBaseSchema = baseRequiredFieldsSchema
  .merge(baseOptionalFieldsSchema)
  .merge(baseDefaultableFieldsSchema);

/**
 * `DetectionRuleUpdateProps` (PUT) — the create shape without `enabled`.
 *
 * `.strict()` — same unknown-key rejection rationale as the create schemas.
 * Prevents `enabled: true` in a PUT body from being silently stripped.
 *
 * Ref: rule-domain-model.md "The request shapes"
 */
export const detectionRuleUpdatePropsSchema = z.discriminatedUnion('type', [
  customQueryUpdateBaseSchema.merge(customQueryWritableFieldsSchema).strict(),
  thresholdUpdateBaseSchema.merge(thresholdWritableFieldsSchema).strict(),
]);
export type DetectionRuleUpdateProps = z.infer<typeof detectionRuleUpdatePropsSchema>;

// ---------------------------------------------------------------------------
// Patch schema (PATCH)
//
// One flat, strict partial object over the superset of both types' writable
// fields.  No `type` (dropped — the API does not offer a type change through
// PATCH).  No `enabled` (the dedicated enable/disable endpoints are the only
// toggle).  Optional fields are nullable so `null` clears them.
//
// "Flat" means there is no discriminated union — a single schema accepts any
// field from either type.  The API validates the merged result against the
// stored type's full create schema at the application layer; foreign fields
// become 400 errors there, not here.
//
// "Strict" means unknown keys are rejected.
//
// Ref: rule-domain-model.md "The request shapes"
//      rule-crud-api.md "Patch a rule with PATCH"
// ---------------------------------------------------------------------------

/**
 * `DetectionRulePatchProps` (PATCH) — flat, strict, all fields optional.
 *
 * - Required-in-create fields (name, description, severity, risk_score, index,
 *   query) are optional here but NOT nullable.
 * - Optional-with-no-default and defaultable array/string fields are optional
 *   AND nullable; `null` instructs the API to clear the stored value.
 *
 * Ref: rule-domain-model.md "The request shapes"
 */
export const detectionRulePatchPropsSchema = z
  .object({
    // --- Required-in-create fields: optional in PATCH, not nullable ---
    name: z.string().min(1).max(MAX_NAME_LENGTH).optional(),
    description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH).optional(),
    severity: detectionRuleCommonFields.severity.optional(),
    risk_score: detectionRuleCommonFields.risk_score.optional(),
    /** rule_id is immutable; include for equality-check only. */
    rule_id: z.string().min(1).max(MAX_SIGNATURE_ID_LENGTH).optional(),

    // --- Type-specific fields: optional, not nullable ---
    // `index` and `threshold` shapes imported from builder schemas so bounds
    // cannot drift from the stored model.  `query` uses the threshold builder's
    // (more permissive) shape to accommodate both types in the flat PATCH schema.
    index: customQueryBuilderFieldsSchema.shape.index.optional(),
    query: thresholdBuilderFieldsSchema.shape.query.optional(),
    language: customQueryBuilderFieldsSchema.shape.language.optional(),
    threshold: thresholdBuilderFieldsSchema.shape.threshold.optional(),

    // --- Content version: optional, not nullable (meaningless to null) ---
    version: z.number().int().min(1).optional(),

    // --- Optional-with-no-default: nullable so null clears the field ---
    // Unwrap the package's .optional() wrapper before adding .nullable() so
    // the result is T | null | undefined rather than T | undefined | undefined.
    note: detectionRuleCommonFields.note.unwrap().nullable().optional(),
    license: detectionRuleCommonFields.license.unwrap().nullable().optional(),

    // --- Defaultable scalars: optional but NOT nullable ---
    // max_signals is a defaultable field (default 100).  Clearing it to null
    // removes it from the stored container, which causes the compile step to
    // emit no LIMIT and the rule to run under the deployment row cap while the
    // read-back path papers over the absence with the default (100).  Callers
    // who want to revert to 100 must send 100 explicitly.
    // Ref: rule-domain-model.md "The request shapes" (three-group split) —
    // only optional-with-no-default fields (note, license, rule_id,
    // schedule.lookback, threshold.cardinality) are nullable in PATCH.
    max_signals: detectionRuleCommonFields.max_signals.unwrap().optional(),
    setup: detectionRuleCommonFields.setup.unwrap().nullable().optional(),

    // --- Defaultable arrays: nullable so null clears to [] ---
    tags: z.array(z.string().min(1).max(MAX_TAG_LENGTH)).max(MAX_TAGS).nullable().optional(),
    references: detectionRuleCommonFields.references.unwrap().nullable().optional(),
    false_positives: detectionRuleCommonFields.false_positives.unwrap().nullable().optional(),
    author: detectionRuleCommonFields.author.unwrap().nullable().optional(),
    threat: detectionRuleCommonFields.threat.unwrap().nullable().optional(),
    related_integrations: detectionRuleCommonFields.related_integrations
      .unwrap()
      .nullable()
      .optional(),
    required_fields: detectionRuleCommonFields.required_fields.unwrap().nullable().optional(),

    // --- Schedule: the object itself is optional; lookback is nullable inside ---
    // Shapes are composed from detectionRuleScheduleSchema so the min(1) bounds
    // cannot drift from the create/update path.
    schedule: z
      .object({
        interval: detectionRuleScheduleSchema.shape.interval.optional(),
        lookback: detectionRuleScheduleSchema.shape.lookback.unwrap().nullable().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type DetectionRulePatchProps = z.infer<typeof detectionRulePatchPropsSchema>;
