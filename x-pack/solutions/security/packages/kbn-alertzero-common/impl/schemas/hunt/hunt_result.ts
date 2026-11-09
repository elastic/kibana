/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema, isoDateTime } from '@kbn/zod/v4';
import { HuntIncompleteReason, HuntIoc, HuntIocType } from '../components/hunt.gen';

/**
 * `hunt_result` payload the hunt writes onto a Significant Security Event attachment.
 *
 * Lives in `@kbn/alertzero-common` (not the plugin's `common/`) so the SSE attachment schema,
 * the SSE mapper and the hunt-watch eval suite all validate against the one definition instead
 * of the suite mirroring it.
 */

/**
 * Every timestamp is an ISO 8601 instant. `.datetime()` alone leaves the string unbounded,
 * and these arrive through attachment input, so cap them before the format check runs.
 */
export const isoDatetimeSchema = lazySchema(() => isoDateTime().max(64));

/** Allowlisted ECS keys stored as event / hit evidence (`fields`). At most 8 per event. */
export const HUNT_EVIDENCE_FIELD_KEYS = [
  'process.name',
  'process.command_line',
  'process.parent.name',
  'process.executable',
  'file.path',
  'file.hash.sha256',
  'dns.question.name',
  'destination.ip',
  'destination.domain',
  'source.ip',
  'url.full',
  'event.action',
] as const;

export type HuntEvidenceFieldKey = (typeof HUNT_EVIDENCE_FIELD_KEYS)[number];

const HUNT_EVIDENCE_FIELD_KEY_SET: ReadonlySet<string> = new Set(HUNT_EVIDENCE_FIELD_KEYS);

/** Max keys and value length for evidence `fields` on hits and SSE events. */
export const HUNT_EVIDENCE_FIELDS_MAX_KEYS = 8;
export const HUNT_EVIDENCE_FIELD_VALUE_MAX = 256;

/**
 * Max entries in `matched.iocs` on a hit or SSE event (`HuntForThreatHit` and the SSE
 * `eventRefSchema` both cap the array here). One IOC can match several ECS fields on one
 * document, so producers cap the list to this before it reaches either schema.
 */
export const HUNT_MATCHED_IOCS_MAX = 10;

/**
 * Bounded evidence map: allowlisted keys only, at most
 * {@link HUNT_EVIDENCE_FIELDS_MAX_KEYS}, values at most
 * {@link HUNT_EVIDENCE_FIELD_VALUE_MAX} characters.
 */
export const huntEvidenceFieldsSchema = lazySchema(() =>
  z
    .record(z.string().min(1).max(128), z.string().max(HUNT_EVIDENCE_FIELD_VALUE_MAX))
    .superRefine((fields, ctx) => {
      const keys = Object.keys(fields);
      if (keys.length > HUNT_EVIDENCE_FIELDS_MAX_KEYS) {
        ctx.addIssue({
          code: 'custom',
          message: `fields accepts at most ${HUNT_EVIDENCE_FIELDS_MAX_KEYS} keys`,
        });
      }
      for (const key of keys) {
        if (!HUNT_EVIDENCE_FIELD_KEY_SET.has(key)) {
          ctx.addIssue({
            code: 'custom',
            message: `fields key "${key}" is not allowlisted`,
            path: [key],
          });
        }
      }
    })
);

const huntResultPerIndexSchema = lazySchema(() =>
  z.object({
    index: z.string().min(1).max(256),
    hit_count: z.number().int().min(0),
    /** Always true from a hunt: every searched index counts towards the hit bar. */
    required: z.boolean(),
  })
);

const huntResultPerIocSchema = lazySchema(() =>
  z.object({
    type: HuntIocType,
    value: z.string().min(1).max(2048),
    field: z.string().min(1).max(128),
    count: z.number().int().min(0),
    host_count: z.number().int().min(0).optional(),
    user_count: z.number().int().min(0).optional(),
    first_seen: isoDatetimeSchema.optional(),
    last_seen: isoDatetimeSchema.optional(),
  })
);

const huntResultTier1Schema = lazySchema(() =>
  z
    .object({
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
      // Optional on the SSE copy only: Tier 1 always writes it on HuntForThreatResult, and
      // the SSE mapper may omit it (`searched_ioc_count` stands in). Readers treat absence as [].
      resolved_iocs: z.array(HuntIoc).max(50).optional(),
      // Tier 1 can produce more rows than either array holds (500 `_index` buckets, 100
      // request IOCs). Same contract as the Tier 2 `affected_*_truncated` flags: set when the
      // producer dropped rows, so a reader does not take the list as the whole breakdown.
      per_index_truncated: z.boolean().optional(),
      resolved_iocs_truncated: z.boolean().optional(),
      /**
       * Non-zero per-IOC hit buckets. One event can match several IOCs, so do not sum
       * counts against total_hits; each count alone must stay within the total.
       */
      per_ioc: z.array(huntResultPerIocSchema).max(30).optional(),
      per_ioc_truncated: z.boolean().optional(),
      /** Deduped searchable IOCs Tier 1 queried (whether or not they hit). */
      searched_ioc_count: z.number().int().min(0).optional(),
    })
    .superRefine((tier1, ctx) => {
      if (!tier1.per_ioc) {
        return;
      }
      for (const [index, entry] of tier1.per_ioc.entries()) {
        if (entry.count > tier1.counts.total_hits) {
          ctx.addIssue({
            code: 'custom',
            message: 'per_ioc[].count cannot exceed tier1.counts.total_hits',
            path: ['per_ioc', index, 'count'],
          });
        }
      }
    })
);

/**
 * `per_index` is a (possibly truncated) breakdown of the same search that produced
 * `total_hits`, so its sum can never exceed the total. A payload where it does would render
 * a small "Total hits" stat beside a larger per-index distribution.
 */
const perIndexSumWithinTotal = (tier1: z.infer<typeof huntResultTier1Schema>): boolean =>
  tier1.per_index.reduce((sum, entry) => sum + entry.hit_count, 0) <= tier1.counts.total_hits;

const huntResultBehaviorExecutionSchema = lazySchema(() =>
  z.object({
    /** Dry-run passed and an execute call was attempted. */
    executed: z.boolean(),
    /** Rows after the required-index filter. */
    row_count: z.number().int().min(0),
    /** True when at least one required-index row was returned. */
    hit: z.boolean(),
    /**
     * Why this execution could not answer the question, when it could not. Carried from
     * Tier 2 because `hit: false` alone is ambiguous: an execution that returned rows the
     * required-index bar could not evaluate (`rows_unclassifiable`, e.g. a STATS pipeline
     * that dropped `_index`) is "could not tell", while a plain `hit: false` is "nothing
     * there". Only the second is evidence of a clean environment, so a reader that cannot
     * tell them apart will record a hunt as clean that never reached a verdict.
     */
    inconclusive_reason: HuntIncompleteReason.optional(),
  })
);

const huntResultTier2BehaviorSchema = lazySchema(() =>
  z.object({
    technique_id: z.string().min(1).max(32),
    technique_name: z.string().min(1).max(256).optional(),
    tactic_ids: z.array(z.string().min(1).max(32)).max(20),
    confidence: z.number().min(0).max(1),
    /** Display title for this hunted finding. */
    title: z.string().min(1).max(256),
    /** The query Tier 2 generated and validated (and, when grounded, executed) to hunt this technique. */
    validated_esql: z.string().min(1).max(32_000).optional(),
    execution: huntResultBehaviorExecutionSchema.optional(),
    affected_hosts: z.array(z.string().min(1).max(512)).max(20).optional(),
    affected_users: z.array(z.string().min(1).max(512)).max(20).optional(),
    affected_hosts_truncated: z.boolean().optional(),
    affected_users_truncated: z.boolean().optional(),
  })
);

const huntResultTier2Schema = lazySchema(() =>
  z
    .object({
      status: z.enum(['no_behaviors_found', 'no_behaviors_validated', 'behaviors_proposed']),
      behaviors: z.array(huntResultTier2BehaviorSchema).max(20),
      /**
       * Set when Tier 2 validated more proposals than this array can hold. Tier 2's
       * generation budget caps how many proposals get a query, not how many validate, so a
       * report-scoped entry listing every proposal can overflow — and a silent cut would
       * read as the complete set of behaviors the run considered.
       */
      behaviors_truncated: z.boolean().optional(),
    })
    // Tier 2 sets `behaviors_proposed` exactly when at least one behavior validated, so a
    // status that disagrees with the list is a producer bug: the card would show
    // "no behaviors" above behavior rows, or "proposed" above an empty table.
    .refine((tier2) => (tier2.status === 'behaviors_proposed') === tier2.behaviors.length > 0, {
      message: 'tier2.status and tier2.behaviors disagree on whether behaviors were proposed',
      path: ['status'],
    })
);

const tierHasExecutionHit = (tier2: z.infer<typeof huntResultTier2Schema> | undefined): boolean =>
  tier2?.behaviors.some((behavior) => behavior.execution?.hit === true) ?? false;

export const huntResultSchema = lazySchema(() =>
  z
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
      /**
       * What Tier 2 was allowed to read, target, and count as a hit, chosen after the
       * report was read and Tier 1 ran: the datasets the report's vendor or product
       * matched, the indices Tier 1 hit, and `actionable_indices` (plus the model's
       * matches when the first two found nothing), each `*`-suffixed.
       */
      tier2_targets: z.array(z.string().min(1).max(256)).max(64).optional(),
      /**
       * Streams and indices in the hunt's universe whose mapping carries
       * `process.entity_id` or `process.pid`: where a hit can become a Defend response
       * action. A mapping says a host can report process telemetry, not that it is
       * enrolled in Fleet; packaging decides that, so an empty list means no evidence
       * in this run is host-scoped.
       */
      actionable_indices: z.array(z.string().min(1).max(256)).max(64).optional(),
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
    )
);

export type HuntResult = z.infer<typeof huntResultSchema>;
