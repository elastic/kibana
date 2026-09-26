/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
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
const entityRefSchema = z.object({
  field: z.enum(ATTACHMENT_ENTITY_FIELDS),
  value: z.string().min(1).max(2048),
});

export const huntIocSchema = z.object({
  type: z.enum(['ip', 'email', 'domain', 'url', 'hash']),
  value: z.string().min(1).max(2048),
});

/**
 * Every timestamp is an ISO 8601 instant. `.datetime()` alone leaves the string unbounded,
 * and these arrive through attachment input, so cap them before the format check runs.
 */
const isoDatetimeSchema = z.string().max(64).datetime();

const alertRefSchema = z.object({
  // Trimmed before the bound: a whitespace-only id renders a blank chip and builds a
  // redirect for an empty document id.
  alert_id: z.string().trim().min(1).max(512),
  index: z.string().min(1).max(256),
  // Datetime-validated like the event/timeline timestamps: this value becomes the alert
  // redirect's absolute time range, and a non-date string keeps the alert from loading.
  timestamp: isoDatetimeSchema.optional(),
});

const eventRefSchema = z.object({
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
      ioc: huntIocSchema.optional(),
      technique_id: z.string().min(1).max(32).optional(),
      field: z.string().min(1).max(128),
    })
    .optional(),
});

const securityKnowledgeIndicatorSchema = z
  .object({
    type: z.enum(['technology', 'threat', 'risk', 'technique', 'ioc']),
    value: z.string().min(1).max(2048),
    confidence: z.number().min(0).max(1).optional(),
    technique_id: z.string().min(1).max(32).optional(),
    ioc: huntIocSchema.optional(),
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
  });

const timelineEntrySchema = z.object({
  at: isoDatetimeSchema,
  what: z.string().min(1).max(2000),
});

const evidenceItemSchema = z.string().min(1).max(2000);

const huntResultPerIndexSchema = z.object({
  index: z.string().min(1).max(256),
  hit_count: z.number().int().min(0),
  required: z.boolean(),
});

const huntResultTier1Schema = z.object({
  // `scope_blocked`: no required index existed, so Tier 1 never ran. A failed run, never clean.
  status: z.enum([
    'scope_blocked',
    'no_searchable_terms',
    'no_environment_hits',
    'environment_hits_found',
  ]),
  counts: z
    .object({
      total_hits: z.number().int().min(0),
      returned_hits: z.number().int().min(0),
      affected_hosts: z.number().int().min(0),
      affected_users: z.number().int().min(0),
    })
    // Returned hits are the sampled subset of total hits. Without this the UI and the agent
    // formatter both suppress a larger `returned_hits` (they only surface it when it is the
    // smaller number) and present the lower total as if the result set were complete.
    .refine((counts) => counts.returned_hits <= counts.total_hits, {
      message: 'returned_hits cannot exceed total_hits',
      path: ['returned_hits'],
    }),
  per_index: z.array(huntResultPerIndexSchema).max(20),
  resolved_iocs: z.array(huntIocSchema).max(50),
});

/**
 * `per_index` is a (possibly truncated) breakdown of the same search that produced
 * `total_hits`, so its sum can never exceed the total. A payload where it does would render
 * a small "Total hits" stat beside a larger per-index distribution.
 */
const perIndexSumWithinTotal = (tier1: z.infer<typeof huntResultTier1Schema>): boolean =>
  tier1.per_index.reduce((sum, entry) => sum + entry.hit_count, 0) <= tier1.counts.total_hits;

const huntResultBehaviorExecutionSchema = z.object({
  /** Dry-run passed and an execute call was attempted. */
  executed: z.boolean(),
  /** Rows after the required-index filter. */
  row_count: z.number().int().min(0),
  /** True when at least one required-index row was returned. */
  hit: z.boolean(),
});

const huntResultTier2BehaviorSchema = z.object({
  technique_id: z.string().min(1).max(32),
  technique_name: z.string().min(1).max(256).optional(),
  tactic_ids: z.array(z.string().min(1).max(32)).max(20),
  confidence: z.number().min(0).max(1),
  rule_name: z.string().min(1).max(256),
  /** Lasting-rule candidate; present on every proposed behavior (not only env hits). */
  proposed_esql_rule: z.string().min(1).max(32_000).optional(),
  execution: huntResultBehaviorExecutionSchema.optional(),
  affected_hosts: z.array(z.string().min(1).max(512)).max(20).optional(),
  affected_users: z.array(z.string().min(1).max(512)).max(20).optional(),
  affected_hosts_truncated: z.boolean().optional(),
  affected_users_truncated: z.boolean().optional(),
});

const huntResultTier2Schema = z
  .object({
    status: z.enum(['no_behaviors_found', 'no_behaviors_validated', 'behaviors_proposed']),
    behaviors: z.array(huntResultTier2BehaviorSchema).max(20),
  })
  // Tier 2 sets `behaviors_proposed` exactly when at least one behavior validated, so a
  // status that disagrees with the list is a producer bug: the card would show
  // "no behaviors" above behavior rows, or "proposed" above an empty table.
  .refine((tier2) => (tier2.status === 'behaviors_proposed') === tier2.behaviors.length > 0, {
    message: 'tier2.status and tier2.behaviors disagree on whether behaviors were proposed',
    path: ['status'],
  });

const tierHasExecutionHit = (tier2: z.infer<typeof huntResultTier2Schema> | undefined): boolean =>
  tier2?.behaviors.some((behavior) => behavior.execution?.hit === true) ?? false;

export const huntResultSchema = z
  .object({
    has_confirmed_hit: z.boolean(),
    /**
     * Which tier(s) cleared the hit bar for this SSE entry. Empty when
     * `has_confirmed_hit` is false. Packaging and UI use this to tell a Tier 1
     * IOC hit from a Tier 2 executed env hit (or both).
     */
    hit_sources: z.array(z.enum(['tier1', 'tier2'])).max(2),
    time_range: z
      .object({
        from: isoDatetimeSchema,
        to: isoDatetimeSchema,
      })
      // `to` is exclusive (matching `assertHuntWindow`), so an equal pair is an empty window
      // and a reversed one is impossible; neither is a range the hunt could have searched.
      .refine((range) => Date.parse(range.from) < Date.parse(range.to), {
        message: 'time_range.from must be before time_range.to',
        path: ['from'],
      }),
    tier1: huntResultTier1Schema,
    tier2: huntResultTier2Schema.optional(),
  })
  // The Tier 1 status names its own outcome, so a status that disagrees with the counts is a
  // producer bug: the renderer would show both the status and the contradicting counts, and
  // the agent formatter would repeat it.
  .refine(
    (result) =>
      (result.tier1.status === 'environment_hits_found') === result.tier1.counts.total_hits > 0,
    {
      message: 'tier1.status and tier1.counts.total_hits disagree on whether hits were found',
      path: ['tier1', 'status'],
    }
  )
  .refine((result) => perIndexSumWithinTotal(result.tier1), {
    message: 'sum of tier1.per_index[].hit_count cannot exceed tier1.counts.total_hits',
    path: ['tier1', 'per_index'],
  })
  // Confirmed hit requires Tier 1 environment hits and/or a Tier 2 executed required-index hit.
  .refine(
    (result) =>
      !result.has_confirmed_hit ||
      result.tier1.status === 'environment_hits_found' ||
      tierHasExecutionHit(result.tier2),
    {
      message:
        'has_confirmed_hit is true but neither tier1 found environment hits nor any tier2 behavior has execution.hit',
      path: ['has_confirmed_hit'],
    }
  )
  // hit_sources must agree with has_confirmed_hit and the contributing tiers.
  .refine(
    (result) => {
      if (!result.has_confirmed_hit) {
        return result.hit_sources.length === 0;
      }
      if (result.hit_sources.length === 0) {
        return false;
      }
      if (
        result.hit_sources.includes('tier1') &&
        result.tier1.status !== 'environment_hits_found'
      ) {
        return false;
      }
      if (result.hit_sources.includes('tier2') && !tierHasExecutionHit(result.tier2)) {
        return false;
      }
      return true;
    },
    {
      message: 'hit_sources must match has_confirmed_hit and the tiers that actually hit',
      path: ['hit_sources'],
    }
  );

/** Cap serialized actionInput so arbitrary JSON values cannot grow without limit. */
const ACTION_INPUT_MAX_SERIALIZED_BYTES = 32_768;

const serializedActionInputByteLength = (input: Record<string, unknown>): number =>
  new TextEncoder().encode(JSON.stringify(input)).byteLength;

const mapsToProposalSchema = z
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
  .optional();

/**
 * Hunt-owned Significant Security Event payload: the finding a watch surfaces when its
 * hunt confirms a hit, plus the context needed to render and act on it without a live fetch.
 */
export const significantSecurityEventAttachmentDataSchema = alertZeroAttachmentDataSchema.extend({
  title: z.string().trim().min(1).max(512),
  severity: z.enum(SEVERITY_LEVELS),
  confidence: z.number().min(0).max(1),
  status: z.enum(['open', 'investigating', 'resolved', 'false_positive']),
  source_watch: z.string().min(1).max(256),
  capability: z.string().min(1).max(256),
  run_id: z.string().min(1).max(256),
  // Trimmed like `title`: a whitespace-only id passes `min(1)` but renders blank provenance
  // and builds a threat-report lookup for an empty id.
  report_id: z.string().trim().min(1).max(256),
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
});

export type SignificantSecurityEventAttachmentData = z.infer<
  typeof significantSecurityEventAttachmentDataSchema
>;
