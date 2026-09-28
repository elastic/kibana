/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { INVESTIGATION_SUBJECT_TYPES } from './workflows/triggers';

/**
 * The single declaration of what an investigation's context may contain. The route validates
 * request bodies with these schemas and the client re-validates whatever reaches it, so a caller
 * arriving through the workflow step definition or the plugin start contract — neither of which
 * passes through route validation — is held to the same contract as an HTTP caller.
 *
 * The types below are derived with `z.infer` rather than written alongside. Hand-written twins
 * drifted: a partial snapshot once satisfied a hand-rolled type guard and then threw a TypeError
 * while composing the prompt.
 */

export const MAX_ALERTS_PER_INVESTIGATION = 20;

// A rule type writes one evaluation entry per metric or criterion, so this bounds a hostile
// array rather than a realistic rule.
const MAX_EVALUATION_ENTRIES = 20;

export const investigationSubjectTypeSchema = z.enum(INVESTIGATION_SUBJECT_TYPES);

export const investigationSubjectSchema = z.object({
  type: investigationSubjectTypeSchema,
  id: z.string().min(1).max(500),
  summary: z.string().max(MAX_TEXT_LENGTH).optional(),
});

export const alertSnapshotGroupSchema = z.object({
  field: z.string().max(500),
  value: z.string().max(1000),
});

export const alertSnapshotEvaluationSchema = z.object({
  /**
   * The observed value, from `kibana.alert.evaluation.value` or, when the rule type writes the
   * plural field instead, `kibana.alert.evaluation.values`. Every shape here is real:
   * `scaled_float` in the legacy experimental field map, a `keyword` holding a stringified number
   * for `.es-query`, and an array for the custom-threshold rule type, which writes one entry per
   * configured metric.
   */
  value: z
    .union([
      z.number(),
      z.string().max(500),
      z.array(z.union([z.number(), z.string().max(500), z.null()])).max(MAX_EVALUATION_ENTRIES),
    ])
    .optional(),
  /**
   * `kibana.alert.evaluation.threshold`. Scalar for most rule types, but an array for the
   * custom-threshold rule type, which writes one entry per criterion.
   */
  threshold: z.union([z.number(), z.array(z.number()).max(MAX_EVALUATION_ENTRIES)]).optional(),
});

/**
 * A point-in-time copy of the alert fields an investigation needs, taken by the caller at trigger
 * time. The investigation reads this instead of re-fetching the alert, so the run reflects the
 * alert as it looked when the trigger fired.
 *
 * Field sources are `kibana.alert.*`. Everything optional here is optional because the source
 * field is not guaranteed, not merely for convenience — see the notes on each.
 */
export const alertSnapshotSchema = z.object({
  /** `kibana.alert.uuid` */
  id: z.string().min(1).max(500),
  /** `kibana.alert.rule.uuid` */
  rule_id: z.string().min(1).max(500),
  /** `kibana.alert.rule.name` */
  rule_name: z.string().min(1).max(500),
  /** `kibana.alert.rule.rule_type_id`, e.g. `apm.transaction_duration`. */
  rule_type_id: z.string().min(1).max(500),
  /** `kibana.alert.rule.category` — the rule type's display name, e.g. "Latency threshold". */
  rule_category: z.string().min(1).max(500),
  /** `kibana.alert.reason` — human-readable statement of why the alert fired. */
  reason: z.string().min(1).max(5000).optional(),
  /** `kibana.alert.status` */
  status: z.string().min(1).max(100),
  /** `kibana.alert.start` */
  start: z.string().max(100).datetime({ offset: true }),
  timestamp: z.string().max(100).datetime({ offset: true }).optional(),
  /** `kibana.alert.flapping` — written by the alerting framework for every alert. */
  flapping: z.boolean().optional(),
  /**
   * `kibana.alert.url`. Optional: the framework does not write this — individual rule types do,
   * and many observability rule types never set it.
   */
  url: z.string().max(2000).optional(),
  /** `kibana.alert.rule.tags` */
  rule_tags: z.array(z.string().max(500)).max(50).optional(),
  /**
   * `kibana.alert.grouping` — nested entity grouping, e.g. `{ service: { name: 'checkout' } }`.
   * Optional: lives in the legacy experimental field map, which rule types opt into.
   */
  grouping: z.record(z.string().max(128), z.unknown()).optional(),
  /**
   * `kibana.alert.group` — the same grouping in flat form. Optional for the same reason as
   * `grouping`.
   */
  group: z.array(alertSnapshotGroupSchema).max(50).optional(),
  /** The rule condition that fired. Optional for the same reason as `grouping`. */
  evaluation: alertSnapshotEvaluationSchema.optional(),
  /** `kibana.alert.rule.parameters` — raw, un-formatted rule params. */
  rule_parameters: z.record(z.string().max(128), z.unknown()).optional(),
  /**
   * `kibana.alert.index_pattern` — a starting point for ES|QL queries. Optional and usually
   * absent: only the infra metric-threshold, inventory-threshold and log-threshold rule types
   * populate it. Deriving it per rule type from `rule_parameters` is separate work.
   */
  index_pattern: z.string().max(1000).optional(),
});

/**
 * Strict, so that an alert investigation carries alert data and nothing else. In particular a
 * caller cannot pass the `event_uuid` the workflow's attach steps read and have the results land
 * on a significant event: one investigation has one trigger today, and an alert is not a
 * significant event. Rejecting beats silently dropping the key, which would leave the caller
 * believing the attach happened. If a single investigation ever needs several triggers, that is a
 * deliberate change to the subject shape, not an extra key smuggled through the context.
 */
export const alertInvestigationContextSchema = z
  .object({
    alerts: z.array(alertSnapshotSchema).min(1).max(MAX_ALERTS_PER_INVESTIGATION),
  })
  .strict();

/**
 * The one key in an otherwise open context that the workflow itself acts on: it interpolates
 * `context.event_uuid` into an internal request path, so a value carrying `/`, `?` or `..` would
 * point those steps at a different endpoint. Real values are uuids, so an id-shaped allowlist
 * costs a legitimate caller nothing.
 */
const significantEventUuidSchema = z
  .string()
  .min(1)
  .max(500)
  .regex(/^[A-Za-z0-9_-]+$/, 'event_uuid must be an id: letters, digits, underscore or hyphen');

/**
 * Deliberately open apart from `event_uuid`. The significant events plugin owns the payload it
 * sends, and this plugin cannot depend on it, so enumerating its fields here would be a hand-kept
 * copy of another plugin's contract — one that starts rejecting their investigations the day they
 * add a field. Only the key with a hazard attached is constrained; the bounds on key count and key
 * length stay, so an open context is still not an unbounded one.
 */
export const freeFormContextSchema = z
  .looseObject({ event_uuid: significantEventUuidSchema.optional() })
  .refine((value) => Object.keys(value).length <= 50, { message: 'context exceeds 50 key limit' })
  .refine((value) => Object.keys(value).every((key) => key.length <= 128), {
    message: 'context has a key longer than 128 characters',
  });

export type InvestigationSubject = z.infer<typeof investigationSubjectSchema>;
export type AlertSnapshotGroup = z.infer<typeof alertSnapshotGroupSchema>;
export type AlertSnapshotEvaluation = z.infer<typeof alertSnapshotEvaluationSchema>;
export type AlertSnapshot = z.infer<typeof alertSnapshotSchema>;
export type AlertInvestigationContext = z.infer<typeof alertInvestigationContextSchema>;
export type InvestigationContext = z.infer<typeof freeFormContextSchema>;
