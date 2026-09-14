/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ── constants ────────────────────────────────────────────────────────────────

export const ALLOWED_ENTITY_TYPES = ['user', 'host', 'service'] as const;

export const ENTITY_TYPE_FIELD = 'entity.EngineMetadata.Type';
export const ENTITY_ID_FIELD = 'entity.id';
export const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
export const LAST_SEEN_ALERT_FIELD = 'last_seen_alert';
export const RISK_SCORE_CHANGE_FIELD = 'risk_score_change';
export const GROUP_SIZE_FIELD = 'group_size';
export const ALERT_COUNT_FIELD = 'alert_count';
export const ALERT_CRITICAL_FIELD = 'alert_critical';
export const ALERT_HIGH_FIELD = 'alert_high';
export const ALERT_MEDIUM_FIELD = 'alert_medium';
export const ALERT_LOW_FIELD = 'alert_low';
export const RISK_SCORE_NORM_FIELD = 'entity.risk.calculated_score_norm';
export const CASE_COUNT_FIELD = 'case_count';
export const ANOMALY_COUNT_FIELD = 'anomaly_count';

// ML anomaly records are not namespaced per space — query the shared wildcard pattern.
export const ML_ANOMALY_INDICES = '.ml-anomalies-*';

// Risk score history docs have one of host/user/service set per document.
export const ENTITY_ID_COALESCE = `COALESCE(host.name, user.name, service.name)`;
export const RISK_SCORE_COALESCE = `COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`;

export type TimeRange = '24h' | '7d' | '30d';
const TIME_RANGE_DAYS: Record<TimeRange, number> = { '24h': 1, '7d': 7, '30d': 30 };

export const ALERT_LOOKBACK_DAYS = 30;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

// Computed sort fields that require their own query path (not native entity fields).
export const COMPUTED_SORT_FIELDS = new Set([
  LAST_SEEN_ALERT_FIELD,
  RISK_SCORE_CHANGE_FIELD,
  GROUP_SIZE_FIELD,
  ALERT_COUNT_FIELD,
  ANOMALY_COUNT_FIELD,
]);

// Only allow field names composed of safe characters to prevent ES|QL injection.
export const VALID_FIELD_RE = /^[@\w.]+$/;

// Fields returned in every page response (entity store has hundreds of fields; select only what
// the grid displays to avoid transferring the full denormalized document).
export const ENTITY_BASE_FIELDS = [
  ENTITY_ID_FIELD,
  'entity.name',
  ENTITY_TYPE_FIELD,
  RISK_SCORE_NORM_FIELD,
  RESOLVED_TO_FIELD,
  'asset.criticality',
  'entity.source',
  'entity.attributes.watchlists',
  'entity.lifecycle.first_seen',
  '@timestamp',
] as const;

// ── types ────────────────────────────────────────────────────────────────────

export interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}
export type Row = Record<string, unknown>;
export type RawQuery = (q: string, name?: string) => Promise<Row[]>;
export type SortDir = 'asc' | 'desc';

export interface PageCursor {
  sortField: string;
  sortDirection: SortDir;
  sortValue: unknown;
  entityId: string;
}

// Computed once per request so data query and count query use the same window
// (avoids a midnight race where two independent utcDayStart() calls straddle day boundary).
export interface RiskDateWindow {
  /** Midnight at now - N days: start of the reference scoring period. */
  windowStart: string;
  /** Midnight at now - (N-1) days: end of the reference scoring period (1-day window). */
  windowEnd: string;
}

export interface QueryDeps {
  entityAlias: string;
  alertsIndex: string;
  riskScoreIndex: string;
  riskWindow: RiskDateWindow;
  alertCutoff: string;
  timeRange: TimeRange;
}

// ── primitives ───────────────────────────────────────────────────────────────

export const esc = (s: string) => `"${s.replace(/"/g, '\\"')}"`;
export const toList = (items: readonly string[]) => items.map(esc).join(', ');
// Backtick-quote field names that contain @ or whitespace (e.g. `@timestamp`).
export const keepField = (f: string) => (/[@\s]/.test(f) ? `\`${f}\`` : f);
// KEEP clause limiting to base entity fields plus any extra (e.g. the sort field).
export const keepClause = (...extra: string[]): string => {
  const fields = [...new Set([...ENTITY_BASE_FIELDS, ...extra])];
  return `| KEEP ${fields.map(keepField).join(', ')}`;
};
export const indent = (s: string) =>
  s
    .split('\n')
    .map((l) => `  ${l}`)
    .join('\n');
export const toRows = (r: unknown): Row[] => {
  const { columns, values } = r as EsqlResponse;
  return values.map((row) => Object.fromEntries(columns.map((col, i) => [col.name, row[i]])));
};

/** ISO timestamp of UTC midnight N days ago (0 = today, 1 = yesterday). */
export const utcDayStart = (daysAgo = 0): string => {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  midnight.setUTCDate(midnight.getUTCDate() - daysAgo);
  return midnight.toISOString();
};

export const riskDateWindow = (range: TimeRange = '24h'): RiskDateWindow => {
  const days = TIME_RANGE_DAYS[range];
  return {
    windowStart: utcDayStart(days),
    windowEnd: utcDayStart(days - 1),
  };
};

export const alertLookbackCutoff = (range: TimeRange = '30d'): string =>
  new Date(Date.now() - TIME_RANGE_DAYS[range] * 86_400_000).toISOString();

// ── cursors ──────────────────────────────────────────────────────────────────

export const encodeCursor = (c: PageCursor): string =>
  Buffer.from(JSON.stringify(c)).toString('base64');

export const decodeCursor = (s: string): PageCursor =>
  JSON.parse(Buffer.from(s, 'base64').toString('utf8')) as PageCursor;

export const cursorClause = ({
  sortField: f,
  sortDirection: dir,
  sortValue: v,
  entityId,
}: PageCursor): string => {
  const safeId = esc(entityId);
  if (v == null) return `| WHERE ${f} IS NULL AND ${ENTITY_ID_FIELD} > ${safeId}`;
  const op = dir === 'desc' ? '<' : '>';
  const val = typeof v === 'string' ? esc(v) : String(v);
  // OR f IS NULL is correct here because all paths use NULLS LAST — null rows are always
  // after non-null rows, so they belong on later pages relative to any non-null cursor value.
  return `| WHERE (${f} ${op} ${val}) OR (${f} == ${val} AND ${ENTITY_ID_FIELD} > ${safeId}) OR ${f} IS NULL`;
};

// Always NULLS LAST so entities without data appear at the bottom regardless of sort direction.
export const sortSuffix = (field: string, dir: SortDir, pageSize: number): string =>
  [
    `| SORT ${field} ${dir.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${pageSize + 1}`,
  ].join('\n');

// ── derived ES|QL fragments ───────────────────────────────────────────────────

// Post-LOOKUP-JOIN guard: verifies the entity matched a row in the entity store.
export const ENTITY_JOIN_FILTER = `${ENTITY_ID_FIELD} IS NOT NULL AND ${ENTITY_TYPE_FIELD} IN (${toList(
  ALLOWED_ENTITY_TYPES
)})`;

/** Wraps an array of ES|QL subquery strings into a multi-source FROM (union) expression. */
export const buildEsqlUnion = (legs: string[]): string => {
  const [first, ...rest] = legs;
  return [`FROM (\n${indent(first)}\n)`, ...rest.map((leg) => `(\n${indent(leg)}\n)`)].join(',\n');
};
