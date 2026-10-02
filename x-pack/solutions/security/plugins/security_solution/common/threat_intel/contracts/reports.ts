/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import {
  MAX_URL_LENGTH,
  SEVERITY_LEVELS,
  THREAT_CATEGORIES,
  THREAT_REPORTS_INDEX,
} from '../constants';

const stringOrStringArray = (maxLength: number, maxSize: number) =>
  schema.maybe(
    schema.oneOf([
      schema.string({ maxLength }),
      schema.arrayOf(schema.string({ maxLength }), { maxSize }),
    ])
  );

// ── create_threat_report ────────────────────────────────────────────────────

// A large bounded plain-text body can exceed Kibana's default 1 MiB body cap.
// Match the same ceiling used by the extract_iocs route.
export const CREATE_THREAT_REPORT_MAX_BODY_BYTES = 10 * 1024 * 1024;

export const createThreatReportBodySchema = schema.object({
  title: schema.string({ minLength: 1, maxLength: 1024 }),
  body_text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
  source_name: schema.string({ minLength: 1, maxLength: 256 }),
  // Provenance only. Stored as metadata on the supplied report; it is never
  // fetched. Kibana does not turn this URL into a report.
  source_url: schema.maybe(
    schema.uri({
      scheme: ['http', 'https'],
      validate: (value) =>
        value.length > MAX_URL_LENGTH ? `must be ${MAX_URL_LENGTH} characters or fewer` : undefined,
    })
  ),
  severity: schema.maybe(
    schema.string({
      maxLength: 32,
      validate: (value) =>
        (SEVERITY_LEVELS as readonly string[]).includes(value)
          ? undefined
          : `must be one of: ${SEVERITY_LEVELS.join(', ')}`,
    })
  ),
  language: schema.maybe(schema.string({ maxLength: 32 })),
});

export const createThreatReportResponseSchema = schema.object({
  status: schema.oneOf([schema.literal('duplicate'), schema.literal('ingested')]),
  content_fingerprint: schema.string(),
  report_id: schema.string(),
  message: schema.string(),
});

export type CreateThreatReportResponse = TypeOf<typeof createThreatReportResponseSchema>;

// ── attribute_alerts_evidence ───────────────────────────────────────────────

/**
 * Concrete index, not the alias/pattern: the Update API rejects wildcards, and the caller
 * (`attribute_alerts_to_reports.yaml`) already has the concrete `_index` from its own search hit.
 */
export const attributeAlertsEvidenceBodySchema = schema.object({
  index: schema.string({
    minLength: 1,
    maxLength: 256,
    validate: (value) =>
      value.startsWith(THREAT_REPORTS_INDEX) ? undefined : `must target ${THREAT_REPORTS_INDEX}`,
  }),
  id: schema.string({ minLength: 1, maxLength: 512 }),
  window: schema.string({ minLength: 1, maxLength: 32 }),
  computedAt: schema.string({ minLength: 1, maxLength: 64 }),
  iocMatchHits: schema.number({ min: 0 }),
  techniqueOverlapHits: schema.number({ min: 0 }),
  alertHitsTotal: schema.number({ min: 0 }),
});

export const attributeAlertsEvidenceResponseSchema = schema.object({
  acknowledged: schema.boolean(),
});

export type AttributeAlertsEvidenceResponse = TypeOf<typeof attributeAlertsEvidenceResponseSchema>;

// Matches the other threat_intel routes' cap even though this body is small and bounded;
// none of them size-tune this value to their own payload either.
export const ATTRIBUTE_ALERTS_EVIDENCE_MAX_BODY_BYTES = CREATE_THREAT_REPORT_MAX_BODY_BYTES;

// ── persist_report_fields ────────────────────────────────────────────────────

// Matches create_threat_report's cap: LLM-derived `doc` payloads (iocs, behaviors, artifacts)
// can be large, and Kibana's default body cap is 1 MiB.
export const PERSIST_REPORT_FIELDS_MAX_BODY_BYTES = CREATE_THREAT_REPORT_MAX_BODY_BYTES;

/**
 * `doc` stays an open object rather than a per-field schema: the four call sites
 * (`enrich_threat_report.yaml`'s `persist_gate_rejection` / `persist_diamond_fields` /
 * `persist_extractions` / `persist_classified_severity`) write genuinely different, partly
 * LLM-shaped payloads (arrays of IOCs, behaviors, artifacts), and the `elasticsearch.update` steps
 * they replace had no schema validation of their own either -- Elasticsearch's own mapping was the
 * only check. Tightening that is a separate concern from the identity fix this route exists for.
 * Same reasoning as `getThreatReportResponseSchema`'s `unknowns: 'allow'`.
 *
 * The top level itself defaults to `forbid`: every field this route accepts merges into the
 * document via `doc`, so a sibling key at this level (e.g. a misnested `rank_score`) is never
 * ES's `dynamic: 'strict'` mapping catching a typo -- it is silently dropped here instead.
 */
export const persistReportFieldsBodySchema = schema.object({
  index: schema.string({
    minLength: 1,
    maxLength: 256,
    validate: (value) =>
      value.startsWith(THREAT_REPORTS_INDEX) ? undefined : `must target ${THREAT_REPORTS_INDEX}`,
  }),
  id: schema.string({ minLength: 1, maxLength: 512 }),
  doc: schema.object({}, { unknowns: 'allow' }),
});

// ── ingest_threat_report ─────────────────────────────────────────────────────

/**
 * `document` stays an open object, same reasoning as `persistReportFieldsBodySchema`'s `doc`:
 * the shape comes from whichever adapter (RSS, text indicator list, ...) fetched it, and the
 * `elasticsearch.index` step this replaces had no schema validation of its own either.
 */
export const ingestThreatReportBodySchema = schema.object({
  document: schema.object({}, { unknowns: 'allow' }),
});

export const ingestThreatReportResponseSchema = schema.object({
  reportId: schema.string(),
});

export type IngestThreatReportResponse = TypeOf<typeof ingestThreatReportResponseSchema>;

export const persistReportFieldsResponseSchema = schema.object({
  acknowledged: schema.boolean(),
});

export type PersistReportFieldsResponse = TypeOf<typeof persistReportFieldsResponseSchema>;

// ── get_threat_report ───────────────────────────────────────────────────────

export const getThreatReportParamsSchema = schema.object({
  reportId: schema.string({ minLength: 1, maxLength: 512 }),
});

/**
 * The route returns the full stored document alongside `reportId`, so the
 * response schema stays open (`unknowns: 'allow'`) rather than closed. Do not
 * tighten this without also changing route behavior — see the schema-
 * colocation plan's risk note.
 */
export const getThreatReportResponseSchema = schema.object(
  {
    reportId: schema.string(),
  },
  { unknowns: 'allow' }
);

export interface GetThreatReportResponse {
  reportId: string;
  [field: string]: unknown;
}

// ── find_threat_reports ─────────────────────────────────────────────────────

export const FIND_THREAT_REPORTS_DEFAULT_PAGE_SIZE = 20;
export const FIND_THREAT_REPORTS_MAX_PAGE_SIZE = 100;

/** Matches `IOC_SUMMARY_MAX` in the find_threat_reports service. */
export const FIND_THREAT_REPORTS_MAX_IOC_SUMMARY = 25;

/** Soft ceiling for readiness reason / optional code lists (closed set in practice). */
export const READINESS_MAX_REASON_CODES = 32;

export const THREAT_REPORT_SORTS = ['relevance', 'rank', 'updated_at'] as const;
export type ThreatReportSort = (typeof THREAT_REPORT_SORTS)[number];

export type ReadinessStatus = 'ready' | 'degraded' | 'blocked';

/** Compact IOC projection returned on find summaries. */
const threatReportIocSummarySchema = schema.object({
  type: schema.string(),
  value: schema.string(),
});

export type ThreatReportIocSummary = TypeOf<typeof threatReportIocSummarySchema>;

/** Optional Diamond projection on find summaries. */
const threatReportDiamondSummarySchema = schema.object({
  signalCount: schema.maybe(schema.number()),
  suitable: schema.maybe(schema.boolean()),
});

export type ThreatReportDiamondSummary = TypeOf<typeof threatReportDiamondSummarySchema>;

/**
 * Usable-bar summary for find results: identity, title/body, IOCs, severity,
 * and optional Diamond.
 */
const threatReportSummarySchema = schema.object({
  reportId: schema.string(),
  title: schema.maybe(schema.string()),
  bodyText: schema.maybe(schema.string()),
  severity: schema.maybe(
    schema.object({
      // Validated as a bounded string, not the closed SeverityLevel union — the
      // stored value can predate a SEVERITY_LEVELS change, same rationale as
      // ThreatReportSort below.
      level: schema.string(),
      score: schema.maybe(schema.number()),
    })
  ),
  iocs: schema.arrayOf(threatReportIocSummarySchema, {
    maxSize: FIND_THREAT_REPORTS_MAX_IOC_SUMMARY,
  }),
  diamond: schema.maybe(threatReportDiamondSummarySchema),
});

export type ThreatReportSummary = TypeOf<typeof threatReportSummarySchema>;

export const findThreatReportsResponseSchema = schema.object({
  items: schema.arrayOf(threatReportSummarySchema, {
    maxSize: FIND_THREAT_REPORTS_MAX_PAGE_SIZE,
  }),
  nextCursor: schema.maybe(schema.nullable(schema.string())),
});

export type FindThreatReportsResponse = TypeOf<typeof findThreatReportsResponseSchema>;

/**
 * GET `/internal/threat_intel/reports` query schema.
 * Repeated query params (`severity`, `category`) may arrive as a string or array.
 */
export const findThreatReportsQuerySchema = schema.object({
  cursor: schema.maybe(schema.string({ maxLength: 2048 })),
  pageSize: schema.maybe(schema.number({ min: 1, max: FIND_THREAT_REPORTS_MAX_PAGE_SIZE })),
  source: schema.maybe(schema.string({ maxLength: 256 })),
  severity: stringOrStringArray(32, SEVERITY_LEVELS.length),
  category: stringOrStringArray(64, THREAT_CATEGORIES.length),
  from: schema.maybe(schema.string({ maxLength: 64 })),
  to: schema.maybe(schema.string({ maxLength: 64 })),
  usableOnly: schema.maybe(schema.boolean()),
  sort: schema.maybe(
    schema.string({
      maxLength: 32,
      validate: (value) =>
        (THREAT_REPORT_SORTS as readonly string[]).includes(value)
          ? undefined
          : `must be one of: ${THREAT_REPORT_SORTS.join(', ')}`,
    })
  ),
});

export type FindThreatReportsQuery = Omit<TypeOf<typeof findThreatReportsQuerySchema>, 'sort'> & {
  sort?: ThreatReportSort;
};

// ── readiness ────────────────────────────────────────────────────────────────

export const readinessResponseSchema = schema.object({
  status: schema.oneOf([
    schema.literal('ready'),
    schema.literal('degraded'),
    schema.literal('blocked'),
  ]),
  reasonCodes: schema.arrayOf(schema.string({ maxLength: 64 }), {
    maxSize: READINESS_MAX_REASON_CODES,
  }),
  lastIngestAt: schema.maybe(schema.nullable(schema.string())),
  lastEnrichAt: schema.maybe(schema.nullable(schema.string())),
  usableReportCount: schema.number(),
  optional: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: 64 }), { maxSize: READINESS_MAX_REASON_CODES })
  ),
});

export type ReadinessResponse = TypeOf<typeof readinessResponseSchema>;
