/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { HuntIoc, huntResultSchema, isoDatetimeSchema } from '@kbn/alertzero-common';
import { ATTACHMENT_ENTITY_FIELDS } from './attachment_entity';
import { alertZeroAttachmentDataSchema } from './attachment_data_schema';
import { SEVERITY_LEVELS } from './attachment_enums';
import { EVENT_SOURCE_INDEX_ERROR, isAllowedEventSourceIndex } from './event_source_index';

/**
 * Significant Security Event (SSE) attachment schema.
 *
 * Lives in `alertzero/common/` (not `server/agent_builder/attachments/`) so the SSE mapper
 * (in `alertzero/server/services/watches/hunt/common/`) can import it directly across the
 * plugin boundary, without an HTTP round-trip. This is the schema lock for the SSE attachment
 * contract: the mapper's output is run through this schema directly, so a drift between the
 * mapper and the schema fails a test instead of surfacing at demo time.
 *
 * ECS-first writer contract:
 * - `entities` are `{ field, value }` pairs using allowlisted ECS entity fields.
 * - `alerts` carry both `alert_id` and the concrete alerts index (no client inventing).
 * - `events` carry `event_id` plus the concrete source index.
 * - `security_knowledge_indicators` are threat-intel taxonomy labels only
 *   (not Discover IOCs). Prefer writing IOCs onto threat reports
 *   (`extracted.iocs` / `threat.indicator.*`); do not invent logs-* field
 *   mappings from `type`.
 */
const entityRefSchema = lazySchema(() =>
  z.object({
    field: z.enum(ATTACHMENT_ENTITY_FIELDS),
    value: z.string().min(1).max(2048),
  })
);

const alertRefSchema = lazySchema(() =>
  z.object({
    // Trimmed before the bound: a whitespace-only id renders a blank chip and builds a
    // redirect for an empty document id.
    alert_id: z.string().trim().min(1).max(512),
    index: z.string().min(1).max(256),
    // Datetime-validated like the event/timeline timestamps: this value becomes the alert
    // redirect's absolute time range, and a non-date string keeps the alert from loading.
    timestamp: isoDatetimeSchema.optional(),
  })
);

const eventRefSchema = lazySchema(() =>
  z.object({
    event_id: z.string().trim().min(1).max(512),
    source_index: z
      .string()
      .min(1)
      .max(256)
      .refine(isAllowedEventSourceIndex, { message: EVENT_SOURCE_INDEX_ERROR })
      .describe(
        "Concrete backing index from the hit's _index (for data streams, the .ds-... name), not the data stream or alias name"
      ),
    timestamp: isoDatetimeSchema.optional(),
    matched: z
      .object({
        ioc: HuntIoc.optional(),
        technique_id: z.string().min(1).max(32).optional(),
        field: z.string().min(1).max(128),
      })
      .optional(),
  })
);

const securityKnowledgeIndicatorSchema = lazySchema(() =>
  z
    .object({
      type: z.enum(['technology', 'threat', 'risk', 'technique', 'ioc']),
      value: z.string().min(1).max(2048),
      confidence: z.number().min(0).max(1).optional(),
      technique_id: z.string().min(1).max(32).optional(),
      ioc: HuntIoc.optional(),
    })
    .superRefine((indicator, ctx) => {
      if (indicator.type === 'technique' && !indicator.technique_id) {
        ctx.addIssue({
          code: 'custom',
          message: 'technique_id is required when type is "technique"',
          path: ['technique_id'],
        });
      }
      if (indicator.type === 'ioc' && !indicator.ioc) {
        ctx.addIssue({
          code: 'custom',
          message: 'ioc is required when type is "ioc"',
          path: ['ioc'],
        });
      }
    })
);

const timelineEntrySchema = lazySchema(() =>
  z.object({
    at: isoDatetimeSchema,
    what: z.string().min(1).max(2000),
  })
);

const evidenceItemSchema = lazySchema(() => z.string().min(1).max(2000));

/** Cap serialized actionInput so arbitrary JSON values cannot grow without limit. */
const ACTION_INPUT_MAX_SERIALIZED_BYTES = 32_768;

const serializedActionInputByteLength = (input: Record<string, unknown>): number =>
  new TextEncoder().encode(JSON.stringify(input)).byteLength;

const mapsToProposalSchema = lazySchema(() =>
  z
    .object({
      category: z.string().min(1).max(256).optional(),
      impact: z.string().min(1).max(2000).optional(),
      confidence: z.number().min(0).max(1).optional(),
      actionWorkflowId: z.string().min(1).max(512).optional(),
      // Workflow input values are arbitrary JSON. Bound both key count and serialized
      // size so a hostile payload cannot grow without limit.
      actionInput: z
        .record(z.string().max(256), z.unknown())
        .refine((input) => Object.keys(input).length <= 50, {
          message: 'actionInput accepts at most 50 keys',
        })
        .refine(
          (input) => {
            try {
              return serializedActionInputByteLength(input) <= ACTION_INPUT_MAX_SERIALIZED_BYTES;
            } catch {
              return false;
            }
          },
          {
            message: `actionInput serialized size must be at most ${ACTION_INPUT_MAX_SERIALIZED_BYTES} bytes`,
          }
        )
        .optional(),
      manual_remediation: z.array(z.string().min(1).max(2000)).max(50).optional(),
    })
    .optional()
);

/**
 * Hunt-owned Significant Security Event payload: the finding a watch surfaces when its
 * hunt confirms a hit, plus the context needed to render and act on it without a live fetch.
 *
 * Writes only. Read an already-persisted attachment through
 * {@link significantSecurityEventAttachmentReadSchema} instead: the two have the same
 * inferred type, so nothing here will stop this one parsing a stored payload, it will just
 * silently drop anything written before a field was renamed.
 */
export const significantSecurityEventAttachmentDataSchema = lazySchema(() =>
  alertZeroAttachmentDataSchema.extend({
    title: z.string().trim().min(1).max(512),
    severity: z.enum(SEVERITY_LEVELS),
    confidence: z.number().min(0).max(1),
    status: z.enum(['open', 'investigating', 'resolved', 'false_positive']),
    source_watch: z.string().min(1).max(256),
    capability: z.string().min(1).max(256),
    run_id: z.string().min(1).max(256),
    // Trimmed like `title`: a whitespace-only id passes `min(1)` but renders blank provenance
    // and builds a threat-report lookup for an empty id. 512 is the report id length the hunt
    // routes accept and `threat_attachment_schema` stores; a shorter cap here would reject an
    // attachment for a report the hunt was legitimately asked to run, and truncating to fit
    // would store an id that resolves to nothing.
    report_id: z.string().trim().min(1).max(512),
    /**
     * Set only when this entry is scoped to a technique this run corroborated (the
     * `techniqueId` the mapper built the entry for). Absent on the report-scoped fallback
     * entry, whose `security_knowledge_indicators` can list every proposed technique
     * without any of them having been individually confirmed. Packaging reads this to
     * tell "confirmed for this technique" apart from "report-wide context that happens
     * to mention this technique".
     */
    corroborated_technique_id: z.string().min(1).max(32).optional(),
    security_knowledge_indicators: z.array(securityKnowledgeIndicatorSchema).max(50),
    entities: z.array(entityRefSchema).max(50),
    alerts: z.array(alertRefSchema).max(50).optional(),
    events: z.array(eventRefSchema).max(50).optional(),
    timeline: z.array(timelineEntrySchema).max(50),
    hypothesis_tested: z.string().min(1).max(4000),
    hunt_result: huntResultSchema.optional(),
    evidence_for: z.array(evidenceItemSchema).max(50),
    evidence_against: z.array(evidenceItemSchema).max(50),
    maps_to_proposal: mapsToProposalSchema,
    evaluation_record_ref: z.string().min(1).max(512),
    truncated: z.boolean().optional(),
    truncated_original_count: z.number().int().min(0).optional(),
    report_revision: z.string().min(1).max(256).optional(),
  })
);

export type SignificantSecurityEventAttachmentData = z.infer<
  typeof significantSecurityEventAttachmentDataSchema
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Pre-rename keys for the same two values; see the behavior schema for the current names. */
const migrateBehavior = (value: unknown): unknown => {
  if (!isRecord(value)) {
    return value;
  }
  const { rule_name: ruleName, proposed_esql_rule: proposedEsqlRule, ...rest } = value;
  return {
    ...rest,
    ...(rest.title === undefined && ruleName !== undefined ? { title: ruleName } : {}),
    ...(rest.validated_esql === undefined && proposedEsqlRule !== undefined
      ? { validated_esql: proposedEsqlRule }
      : {}),
  };
};

const migrateArray = (value: unknown, migrate: (entry: unknown) => unknown): unknown =>
  Array.isArray(value) ? value.map(migrate) : value;

/**
 * Brings a persisted payload onto the current key names before validation. Only the shapes
 * that were renamed or gained a required field are touched; everything else passes through, so
 * an attachment this build genuinely cannot read still fails rather than being quietly patched.
 */
const migratePersistedAttachment = (value: unknown): unknown => {
  if (!isRecord(value) || !isRecord(value.hunt_result)) {
    return value;
  }
  const huntResult = value.hunt_result;
  const { tier2 } = huntResult;
  return {
    ...value,
    hunt_result: {
      ...huntResult,
      ...(isRecord(tier2)
        ? { tier2: { ...tier2, behaviors: migrateArray(tier2.behaviors, migrateBehavior) } }
        : {}),
    },
  };
};

/**
 * Read path only: writes stay strict on {@link significantSecurityEventAttachmentDataSchema},
 * because the mapper has no reason to emit a retired key. Every reader of a *persisted*
 * attachment uses this instead, since the schema's own parse failure mode is to skip the
 * attachment -- so a payload written before a rename would drop out of packaging's current-run
 * state and render as an empty card, rather than surfacing as an error anyone could act on.
 */
export const significantSecurityEventAttachmentReadSchema = lazySchema(() =>
  z.preprocess(migratePersistedAttachment, significantSecurityEventAttachmentDataSchema)
);
