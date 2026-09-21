/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ATTACHMENT_ENTITY_FIELDS } from './attachment_entity_string';
import { alertZeroAttachmentDataSchema } from './attachment_data_schema';

/**
 * Significant Security Event (SSE) attachment schema.
 *
 * Lives in `alertzero/common/` (not `server/agent_builder/attachments/`) so
 * PR 3's `sse_mapper.ts` (in `alertzero/server/services/watches/hunt/common/`)
 * can import it directly across the plugin boundary, without an HTTP
 * round-trip. This is the schema lock for hunt-plans plan 7 (SSE durability):
 * `sse_mapper.test.ts` runs `buildSseData`'s output through this schema
 * directly, so a drift between the mapper and the schema fails a test
 * instead of surfacing at demo time.
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

const alertRefSchema = z.object({
  alert_id: z.string().min(1).max(512),
  index: z.string().min(1).max(256),
  timestamp: z.string().min(1).max(64).optional(),
});

const eventRefSchema = z.object({
  event_id: z.string().min(1).max(512),
  source_index: z.string().min(1).max(256),
  timestamp: z.string().datetime().optional(),
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
  at: z.string().datetime(),
  what: z.string().min(1).max(2000),
});

const evidenceItemSchema = z.string().min(1).max(2000);

const huntResultPerIndexSchema = z.object({
  index: z.string().min(1).max(256),
  hit_count: z.number().int().min(0),
  required: z.boolean(),
});

const huntResultTier1Schema = z.object({
  status: z.enum(['no_searchable_terms', 'no_environment_hits', 'environment_hits_found']),
  counts: z.object({
    total_hits: z.number().int().min(0),
    returned_hits: z.number().int().min(0),
    affected_hosts: z.number().int().min(0),
    affected_users: z.number().int().min(0),
  }),
  per_index: z.array(huntResultPerIndexSchema).max(20),
  resolved_iocs: z.array(huntIocSchema).max(50),
});

const huntResultTier2BehaviorSchema = z.object({
  technique_id: z.string().min(1).max(32),
  tactic_ids: z.array(z.string().min(1).max(32)).max(20),
  confidence: z.number().min(0).max(1),
  rule_name: z.string().min(1).max(256),
});

const huntResultTier2Schema = z.object({
  status: z.enum(['no_behaviors_found', 'no_behaviors_validated', 'behaviors_proposed']),
  behaviors: z.array(huntResultTier2BehaviorSchema).max(20),
});

export const huntResultSchema = z.object({
  has_confirmed_hit: z.boolean(),
  time_range: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  tier1: huntResultTier1Schema,
  tier2: huntResultTier2Schema.optional(),
});

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
 * Hunt-owned Significant Security Event payload, per the D39 field table
 * (docs/working-groups/dark-watch/artifacts/mvp-slice.md:541-561).
 */
export const significantSecurityEventAttachmentDataSchema = alertZeroAttachmentDataSchema.extend({
  title: z.string().min(1).max(512),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number().min(0).max(1),
  status: z.enum(['open', 'investigating', 'resolved', 'false_positive']),
  source_watch: z.string().min(1).max(256),
  capability: z.string().min(1).max(256),
  run_id: z.string().min(1).max(256),
  report_id: z.string().min(1).max(256),
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
