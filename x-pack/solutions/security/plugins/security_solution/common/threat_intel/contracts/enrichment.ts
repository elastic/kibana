/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type Type, type TypeOf } from '@kbn/config-schema';
import { IOC_TYPES, SEVERITY_LEVELS, THREAT_CATEGORIES, type ThreatCategory } from '../constants';

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

const IOC_TIERS = ['discriminating', 'contextual', 'reference', 'denied', 'uncertain'] as const;

const extractedIocSchema = schema.object({
  type: oneOfLiterals(IOC_TYPES),
  value: schema.string(),
  defanged: schema.maybe(schema.string()),
  tier: oneOfLiterals(IOC_TIERS),
  tier_heuristic: oneOfLiterals(IOC_TIERS),
  tier_basis: schema.string(),
  port: schema.maybe(schema.number()),
});

export const extractIocsResponseSchema = schema.object({
  count: schema.number(),
  iocs: schema.arrayOf(extractedIocSchema),
  ioc_set_hash: schema.nullable(schema.string()),
  truncated: schema.maybe(schema.literal(true)),
});

export type ExtractIocsResponse = TypeOf<typeof extractIocsResponseSchema>;

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
  report_id: schema.maybe(schema.string()),
});

export type ExtractDiamondResponse = TypeOf<typeof extractDiamondResponseSchema>;

// ── assess_relevance ─────────────────────────────────────────────────────────

export const assessRelevanceBodySchema = schema.object({
  url: schema.maybe(schema.string({ minLength: 1, maxLength: 2048 })),
  title: schema.maybe(schema.string({ maxLength: 1024 })),
  text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
});

export const ASSESS_RELEVANCE_MAX_BODY_BYTES = 10 * 1024 * 1024;

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
  primary_links: schema.arrayOf(schema.string()),
  has_original_commentary: schema.boolean(),
  reason: schema.string(),
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
  categories: schema.arrayOf(schema.string()),
  regions: schema.arrayOf(schema.string()),
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
