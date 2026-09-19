/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { MAX_URL_LENGTH, SEVERITY_LEVELS, THREAT_CATEGORIES } from '../constants';

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
  iocs: schema.arrayOf(threatReportIocSummarySchema),
  diamond: schema.maybe(threatReportDiamondSummarySchema),
});

export type ThreatReportSummary = TypeOf<typeof threatReportSummarySchema>;

export const findThreatReportsResponseSchema = schema.object({
  items: schema.arrayOf(threatReportSummarySchema),
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
  reasonCodes: schema.arrayOf(schema.string()),
  lastIngestAt: schema.maybe(schema.nullable(schema.string())),
  lastEnrichAt: schema.maybe(schema.nullable(schema.string())),
  usableReportCount: schema.number(),
  optional: schema.maybe(schema.arrayOf(schema.string())),
});

export type ReadinessResponse = TypeOf<typeof readinessResponseSchema>;
