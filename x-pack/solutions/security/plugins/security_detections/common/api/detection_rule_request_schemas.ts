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
import { detectionRuleCommonFields, threatEntrySchema } from '@kbn/security-detection-rule-schema';
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
  name: z.string().min(1).max(256),
  description: z.string().min(1).max(1024),
  severity: detectionRuleCommonFields.severity,
  risk_score: detectionRuleCommonFields.risk_score,
});

/**
 * Base optional fields — genuinely optional, no default value.
 * PATCH makes these nullable so `null` clears the stored value.
 */
const baseOptionalFieldsSchema = z.object({
  note: z.string().max(8192).optional(),
  license: z.string().max(256).optional(),
  /**
   * Client-assignable stable identifier at create time.  On UPDATE/PATCH it is
   * optional but must match the stored value if provided (validation at the
   * application layer, not the schema layer).
   */
  rule_id: z.string().min(1).max(256).optional(),
});

/**
 * Base defaultable fields — optional in create/update/patch; `applyRuleDefaults`
 * fills them before the framework sees the payload.  No `.default()` here per
 * the no-defaults rule.
 *
 * Ref: rule-validation.md "No defaults, no transforms"
 */
const baseDefaultableFieldsSchema = z.object({
  version: z.number().int().min(1).optional(),
  tags: z.array(z.string().min(1).max(128)).max(20).optional(),
  max_signals: detectionRuleCommonFields.max_signals,
  setup: z.string().max(8192).optional(),
  references: z.array(z.string().max(1024)).max(32).optional(),
  false_positives: z.array(z.string().max(1024)).max(16).optional(),
  author: z.array(z.string().max(256)).max(16).optional(),
  threat: z.array(threatEntrySchema).max(5).optional(),
  related_integrations: z
    .array(
      z
        .object({
          package: z.string().max(64),
          version: z.string().max(32),
          integration: z.string().max(64).optional(),
        })
        .strict()
    )
    .max(16)
    .optional(),
  required_fields: z
    .array(
      z
        .object({
          name: z.string().max(128),
          type: z.string().max(64),
          ecs: z.boolean(),
        })
        .strict()
    )
    .max(32)
    .optional(),
  /**
   * Schedule with optional lookback.  Default: { interval: '5m' }.
   * No `from: now-6m` overlap — a deliberate departure from v1.
   * A caller who wants v1's overlap sends `lookback: '6m'`.
   *
   * Ref: rule-domain-model.md "The request shapes" (defaults table)
   */
  schedule: detectionRuleScheduleSchema.optional(),
  language: z.enum(['kuery', 'lucene']).optional(),
});

// ---------------------------------------------------------------------------
// Per-type writable fields
// ---------------------------------------------------------------------------

/**
 * Writable fields specific to the Custom Query rule type.
 *
 * `query` is required non-empty — an empty query is not a footgun here.
 * The `threshold` type accepts an empty string as a match-all pre-filter.
 */
const customQueryWritableFieldsSchema = z.object({
  type: z.literal('query'),
  index: z.array(z.string().min(1).max(256)).min(1).max(32),
  query: z.string().min(1).max(8192),
});

/**
 * Writable fields specific to the Threshold rule type.
 *
 * `query` may be empty (match-all pre-filter).
 * `threshold.cardinality` is optional — optional with no default.
 */
const thresholdWritableFieldsSchema = z.object({
  type: z.literal('threshold'),
  index: z.array(z.string().min(1).max(256)).min(1).max(32),
  /** Empty string is valid as a match-all pre-filter. */
  query: z.string().max(8192),
  threshold: z
    .object({
      field: z.array(z.string().min(1).max(256)).max(5),
      value: z.number().int().min(1),
      cardinality: z
        .array(
          z
            .object({
              field: z.string().min(1).max(256),
              value: z.number().int().min(0),
            })
            .strict()
        )
        .max(1)
        .optional(),
    })
    .strict(),
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
 */
export const customQueryCreateSchema = customQueryCreateBaseSchema.merge(
  customQueryWritableFieldsSchema
);
export type CustomQueryCreateProps = z.infer<typeof customQueryCreateSchema>;

/**
 * Create schema for the Threshold rule type.
 * Used as the alias map's `createSchema` entry for the `'threshold'` alias.
 */
export const thresholdCreateSchema = thresholdCreateBaseSchema.merge(thresholdWritableFieldsSchema);
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
 * Ref: rule-domain-model.md "The request shapes"
 */
export const detectionRuleUpdatePropsSchema = z.discriminatedUnion('type', [
  customQueryUpdateBaseSchema.merge(customQueryWritableFieldsSchema),
  thresholdUpdateBaseSchema.merge(thresholdWritableFieldsSchema),
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
    name: z.string().min(1).max(256).optional(),
    description: z.string().min(1).max(1024).optional(),
    severity: detectionRuleCommonFields.severity.optional(),
    risk_score: detectionRuleCommonFields.risk_score.optional(),
    /** rule_id is immutable; include for equality-check only. */
    rule_id: z.string().min(1).max(256).optional(),

    // --- Type-specific fields: optional, not nullable ---
    index: z.array(z.string().min(1).max(256)).min(1).max(32).optional(),
    query: z.string().max(8192).optional(),
    language: z.enum(['kuery', 'lucene']).optional(),
    threshold: z
      .object({
        field: z.array(z.string().min(1).max(256)).max(5),
        value: z.number().int().min(1),
        cardinality: z
          .array(
            z
              .object({
                field: z.string().min(1).max(256),
                value: z.number().int().min(0),
              })
              .strict()
          )
          .max(1)
          .optional(),
      })
      .strict()
      .optional(),

    // --- Content version: optional, not nullable (meaningless to null) ---
    version: z.number().int().min(1).optional(),

    // --- Optional-with-no-default: nullable so null clears the field ---
    note: z.string().max(8192).nullable().optional(),
    license: z.string().max(256).nullable().optional(),

    // --- Defaultable scalar: nullable so null reverts to default ---
    max_signals: detectionRuleCommonFields.max_signals.unwrap().nullable().optional(),
    setup: z.string().max(8192).nullable().optional(),

    // --- Defaultable arrays: nullable so null clears to [] ---
    tags: z.array(z.string().min(1).max(128)).max(20).nullable().optional(),
    references: z.array(z.string().max(1024)).max(32).nullable().optional(),
    false_positives: z.array(z.string().max(1024)).max(16).nullable().optional(),
    author: z.array(z.string().max(256)).max(16).nullable().optional(),
    threat: z.array(threatEntrySchema).max(5).nullable().optional(),
    related_integrations: z
      .array(
        z
          .object({
            package: z.string().max(64),
            version: z.string().max(32),
            integration: z.string().max(64).optional(),
          })
          .strict()
      )
      .max(16)
      .nullable()
      .optional(),
    required_fields: z
      .array(
        z
          .object({
            name: z.string().max(128),
            type: z.string().max(64),
            ecs: z.boolean(),
          })
          .strict()
      )
      .max(32)
      .nullable()
      .optional(),

    // --- Schedule: the object itself is optional; lookback is nullable inside ---
    schedule: z
      .object({
        interval: z.string().min(1).optional(),
        lookback: z.string().min(1).nullable().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type DetectionRulePatchProps = z.infer<typeof detectionRulePatchPropsSchema>;
