/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type Type, type TypeOf } from '@kbn/config-schema';
import {
  IOC_TYPES,
  MAX_URL_LENGTH,
  SEVERITY_LEVELS,
  THREAT_CATEGORIES,
  THREAT_REGIONS,
  type ThreatCategory,
} from '../constants';

export const enumLiterals = <T extends string>(values: readonly T[]): string => values.join(', ');

/** `schema.oneOf` over a readonly literal-union array, typed as `Type<T>`. */
const oneOfLiterals = <T extends string>(values: readonly T[]) =>
  schema.oneOf(values.map((v) => schema.literal(v)) as unknown as [Type<T>]);

// ── extract_iocs ─────────────────────────────────────────────────────────────

// Bounded plain text only. Callers pass `content.body_text`; no HTML is accepted
// or converted here.
export const extractIocsBodySchema = schema.object({
  text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
  defang: schema.maybe(schema.boolean()),
});

// Bounded plain-text bodies can exceed Kibana's default 1 MiB cap; 10 MiB matches other large-text internal routes.
export const EXTRACT_IOCS_MAX_BODY_BYTES = 10 * 1024 * 1024;

/** Matches `MAX_IOCS_PER_REPORT` in the extract_iocs service (truncation ceiling). */
export const EXTRACT_IOCS_MAX_RESPONSE_SIZE = 5_000;

const IOC_TIERS = ['discriminating', 'contextual', 'reference', 'denied', 'uncertain'] as const;

/** Matches the keyword ignore_above used for IOC values on the reports index. */
const MAX_IOC_VALUE_LENGTH = MAX_URL_LENGTH;
/**
 * `defangValue` expands `.` → `[.]` (+2 each) and `://` → `[:]//` (+2). Worst
 * case is an all-dots string of `MAX_IOC_VALUE_LENGTH`, which triples in size.
 * Keep the response bound above that so a near-limit URL with `defang: true`
 * cannot fail extract/enrich validation after a successful pushIoc.
 */
const MAX_IOC_DEFANGED_LENGTH = MAX_IOC_VALUE_LENGTH * 3;
/** Shared by request/response validation and reconcile prefixing. */
export const MAX_IOC_TIER_BASIS_LENGTH = 512;
/** 240 chars either side of the value (extract_iocs) plus the value itself (MAX_IOC_VALUE_LENGTH). */
export const MAX_IOC_CONTEXT_LENGTH = 240 + MAX_IOC_VALUE_LENGTH + 240;

export const extractedIocSchema = schema.object({
  type: oneOfLiterals(IOC_TYPES),
  value: schema.string({ minLength: 1, maxLength: MAX_IOC_VALUE_LENGTH }),
  defanged: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_IOC_DEFANGED_LENGTH })),
  tier: oneOfLiterals(IOC_TIERS),
  tier_heuristic: oneOfLiterals(IOC_TIERS),
  tier_basis: schema.string({ minLength: 1, maxLength: MAX_IOC_TIER_BASIS_LENGTH }),
  port: schema.maybe(schema.number()),
  deferred_unreviewed: schema.maybe(schema.boolean()),
  // Prompt-only source-text window (url/domain candidates). Never persisted:
  // enrich_report_core strips it before its output reaches persist_extractions.
  context: schema.maybe(schema.string({ maxLength: MAX_IOC_CONTEXT_LENGTH })),
});

export const extractIocsResponseSchema = schema.object({
  count: schema.number(),
  iocs: schema.arrayOf(extractedIocSchema, { maxSize: EXTRACT_IOCS_MAX_RESPONSE_SIZE }),
  ioc_set_hash: schema.nullable(schema.string()),
  truncated: schema.maybe(schema.literal(true)),
});

export type ExtractIocsResponse = TypeOf<typeof extractIocsResponseSchema>;

// ── enrich_report_core ──────────────────────────────────────────────────────

// Core receives the full article plus extract_iocs output. Text alone can be
// 5M chars; 5,000 IOCs each near their value/defanged/tier_basis/context bounds
// can add ~57 MiB of JSON on top of that (worst case, not typical), so this
// must clear ~62 MiB with margin or a maximally IOC-dense report 413s on every
// retry and stays pending forever.
export const ENRICH_REPORT_CORE_MAX_BODY_BYTES = 80 * 1024 * 1024;

export const enrichReportCoreBodySchema = schema.object({
  text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
  iocs: schema.arrayOf(extractedIocSchema, { maxSize: EXTRACT_IOCS_MAX_RESPONSE_SIZE }),
  // Pass-through of extract_iocs' fingerprint so truncated reports keep the same
  // correlation key (extract hashes before the 5k cap; the capped array alone does not).
  ioc_set_hash: schema.maybe(schema.nullable(schema.string({ maxLength: 128 }))),
  title: schema.maybe(schema.string({ maxLength: 1_024 })),
  article_url: schema.maybe(schema.string({ maxLength: MAX_URL_LENGTH })),
  report_id: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
  truncated: schema.maybe(schema.boolean()),
});

const reportBehaviorSchema = schema.object({
  // `id` is always a sha256 hex digest computed server-side (behaviorId), never
  // model output. `technique_id` is either '' or a regex-validated ATT&CK id
  // (normalizeAttackTechniqueId); `description` is already sliced to 2,000
  // chars before this schema runs. Bounds here are defense-in-depth, matching
  // the zod transforms upstream rather than trusting them alone.
  id: schema.string({ maxLength: 64 }),
  technique_id: schema.string({ maxLength: 16 }),
  description: schema.string({ maxLength: 2_000 }),
  telemetry_targets: schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 20 }),
  confidence: schema.number(),
  llm_confidence: schema.number(),
});

const reportArtifactSchema = schema.object({
  // `value`/`context` are already sliced (2,048 / 1,000 chars) by artifactSchema
  // upstream; bounds here are defense-in-depth, not the primary guarantee.
  type: schema.string({ maxLength: 32 }),
  value: schema.string({ maxLength: 2_048 }),
  context: schema.string({ maxLength: 1_000 }),
});

export const enrichReportCoreResponseSchema = schema.object({
  categories: schema.arrayOf(schema.string(), { maxSize: THREAT_CATEGORIES.length }),
  regions: schema.arrayOf(schema.string(), { maxSize: THREAT_REGIONS.length }),
  relevance: schema.number(),
  diamond_suitable: schema.boolean(),
  severity: schema.object({
    level: oneOfLiterals(SEVERITY_LEVELS),
    score: schema.number(),
    rationale: schema.maybe(schema.string()),
  }),
  count: schema.number(),
  iocs: schema.arrayOf(extractedIocSchema, { maxSize: EXTRACT_IOCS_MAX_RESPONSE_SIZE }),
  ioc_set_hash: schema.nullable(schema.string()),
  anchor_iocs: schema.arrayOf(extractedIocSchema, { maxSize: EXTRACT_IOCS_MAX_RESPONSE_SIZE }),
  promotable_count: schema.number(),
  truncated: schema.maybe(schema.literal(true)),
  adjudication: schema.object({
    provider: schema.literal('semantic_model'),
    reviewed: schema.number(),
    approved: schema.number(),
    downgraded: schema.number(),
    deterministic_references: schema.number(),
    deferred_unreviewed: schema.number(),
  }),
  behaviors: schema.arrayOf(reportBehaviorSchema, { maxSize: 100 }),
  artifacts: schema.arrayOf(reportArtifactSchema, { maxSize: 200 }),
  context: schema.object({
    mode: schema.oneOf([schema.literal('full'), schema.literal('degraded_context')]),
    original_chars: schema.number(),
    selected_chars: schema.number(),
    coverage: schema.number(),
  }),
  model_id: schema.string(),
});

export type EnrichReportCoreResponse = TypeOf<typeof enrichReportCoreResponseSchema>;

// ── extract_diamond ──────────────────────────────────────────────────────────

export const extractDiamondBodySchema = schema.object({
  text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
  report_id: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
});

export const EXTRACT_DIAMOND_MAX_BODY_BYTES = 10 * 1024 * 1024;

const diamondVertexResponseSchema = schema.object({
  signal: schema.oneOf([schema.literal('HIGH'), schema.literal('PARTIAL'), schema.literal('NONE')]),
  summary: schema.string(),
});

export const extractDiamondResponseSchema = schema.object({
  adversary: diamondVertexResponseSchema,
  capability: diamondVertexResponseSchema,
  infrastructure: diamondVertexResponseSchema,
  victim: diamondVertexResponseSchema,
  signal_count: schema.number(),
  model_id: schema.string(),
  extracted_at: schema.string(),
  extraction_mode: schema.oneOf([
    schema.literal('single_call'),
    schema.literal('per_vertex_fallback'),
  ]),
  context_mode: schema.oneOf([schema.literal('full'), schema.literal('degraded_context')]),
  context_coverage: schema.number(),
  context_chars: schema.number(),
  source_chars: schema.number(),
  report_id: schema.maybe(schema.string()),
});

export type ExtractDiamondResponse = TypeOf<typeof extractDiamondResponseSchema>;

// ── assess_relevance ─────────────────────────────────────────────────────────

export const assessRelevanceBodySchema = schema.object({
  // Workflows render a missing optional URL as an empty string. The service
  // already treats that as absent, so accepting it keeps legacy/manual reports
  // from becoming permanent gate retries.
  url: schema.maybe(schema.string({ maxLength: 2048 })),
  title: schema.maybe(schema.string({ maxLength: 1024 })),
  text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
});

export const ASSESS_RELEVANCE_MAX_BODY_BYTES = 10 * 1024 * 1024;

/** Matches `MAX_PRIMARY_LINKS` in the assess_relevance service. */
export const ASSESS_RELEVANCE_MAX_PRIMARY_LINKS = 20;

export const assessRelevanceResponseSchema = schema.object({
  is_intelligence: schema.boolean(),
  quality_class: schema.oneOf([
    schema.literal('intel'),
    schema.literal('marketing'),
    schema.literal('rollup'),
    schema.literal('thought_leadership'),
  ]),
  evidence_tier: schema.oneOf([
    schema.literal('primary'),
    schema.literal('pointer'),
    schema.literal('mixed'),
  ]),
  needs_render: schema.boolean(),
  primary_links: schema.arrayOf(schema.string({ maxLength: MAX_URL_LENGTH }), {
    maxSize: ASSESS_RELEVANCE_MAX_PRIMARY_LINKS,
  }),
  has_original_commentary: schema.boolean(),
  reason: schema.string(),
  context: schema.object({
    mode: schema.oneOf([schema.literal('full'), schema.literal('degraded_context')]),
    original_chars: schema.number(),
    selected_chars: schema.number(),
    coverage: schema.number(),
  }),
});

export type AssessRelevanceResponse = TypeOf<typeof assessRelevanceResponseSchema>;

// ── enrich_taxonomy ──────────────────────────────────────────────────────────

export const enrichTaxonomyBodySchema = schema.object({
  text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
  report_id: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
  title: schema.maybe(schema.string({ maxLength: 1024 })),
});

export const ENRICH_TAXONOMY_MAX_BODY_BYTES = 10 * 1024 * 1024;

export const enrichTaxonomyResponseSchema = schema.object({
  categories: schema.arrayOf(schema.string({ maxLength: 64 }), {
    maxSize: THREAT_CATEGORIES.length,
  }),
  regions: schema.arrayOf(schema.string({ maxLength: 64 }), {
    maxSize: THREAT_REGIONS.length,
  }),
  relevance: schema.number(),
  diamond_suitable: schema.boolean(),
});

export type EnrichTaxonomyResponse = TypeOf<typeof enrichTaxonomyResponseSchema>;

// ── classify_severity ────────────────────────────────────────────────────────

export const classifySeverityBodySchema = schema.object({
  text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
  report_id: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
  title: schema.maybe(schema.string({ maxLength: 1024 })),
  categories: schema.maybe(
    schema.arrayOf(
      schema.string({
        maxLength: 64,
        validate: (value) =>
          (THREAT_CATEGORIES as readonly string[]).includes(value)
            ? undefined
            : `must be one of: ${enumLiterals(THREAT_CATEGORIES)}`,
      }),
      { maxSize: THREAT_CATEGORIES.length }
    )
  ),
  ioc_count: schema.maybe(schema.number({ min: 0, max: 100_000 })),
});

export const CLASSIFY_SEVERITY_MAX_BODY_BYTES = 10 * 1024 * 1024;

export type ClassifySeverityCategories = ThreatCategory[] | undefined;

export const classifySeverityResponseSchema = schema.object({
  level: oneOfLiterals(SEVERITY_LEVELS),
  score: schema.number(),
  rationale: schema.maybe(schema.string()),
});

export type ClassifySeverityResponse = TypeOf<typeof classifySeverityResponseSchema>;
