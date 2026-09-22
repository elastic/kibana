/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { EsqlEsqlResult, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';

// ── constants ────────────────────────────────────────────────────────────────

export const ALLOWED_ENTITY_TYPES = ['user', 'host', 'service'] as const;

export const ENTITY_ID_FIELD = 'entity.id';
export const ENTITY_TYPE_FIELD = 'entity.EngineMetadata.Type';
export const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
export const RISK_SCORE_NORM_FIELD = 'entity.risk.calculated_score_norm';

export const ALERT_COUNT_FIELD = 'alert_count';
export const ANOMALY_COUNT_FIELD = 'anomaly_count';
export const GROUP_SIZE_FIELD = 'group_size';
export const LAST_SEEN_ALERT_FIELD = 'last_seen_alert';
export const RISK_SCORE_CHANGE_FIELD = 'risk_score_change';

export const MS_PER_DAY = 86_400_000;
export const TIME_RANGE_DAYS = { '24h': 1, '7d': 7, '30d': 30 } as const;

const ENTITY_FIELDS = [
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

export type TimeRange = keyof typeof TIME_RANGE_DAYS;
export type Row = Record<string, FieldValue>;
export type EsqlRunner = (q: string) => Promise<Row[]>;
export type SortDir = 'asc' | 'desc';

export const PageCursorSchema = z.object({
  sortField: z.string(),
  sortDirection: z.enum(['asc', 'desc']),
  sortValue: z.unknown(),
  entityId: z.string(),
});

export type PageCursor = z.infer<typeof PageCursorSchema>;

export interface QueryArgs {
  namespace: string;
  timeRange: TimeRange;
  sort: { field: string; direction: SortDir };
  cursor: PageCursor | null;
  pageSize: number;
  view: 'resolved' | 'raw';
}

export const entityAliasOf = (namespace: string) => getEntitiesAlias(ENTITY_LATEST, namespace);

// ── primitives ───────────────────────────────────────────────────────────────

// TODO: use escapeStringValue
const esc = (s: string) =>
  `"${s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}"`;

export const toList = (items: readonly string[]) => items.map(esc).join(', ');

const quoteField = (f: string) => (/[@\s]/.test(f) ? `\`${f}\`` : f);

export const keepClause = (...extra: string[]): string => {
  const fields = [...new Set([...ENTITY_FIELDS, ...extra])];
  return `| KEEP ${fields.map(quoteField).join(', ')}`;
};

export const toRows = (r: EsqlEsqlResult): Row[] =>
  r.values.map((row) => Object.fromEntries(r.columns.map((col, i) => [col.name, row[i]])));

export const alertLookbackCutoff = (range: TimeRange): string =>
  new Date(Date.now() - TIME_RANGE_DAYS[range] * MS_PER_DAY).toISOString();

// ── cursors ──────────────────────────────────────────────────────────────────

export const encodeCursor = (c: PageCursor): string =>
  Buffer.from(JSON.stringify(c)).toString('base64');

export const decodeCursor = (s: string): PageCursor => {
  try {
    return PageCursorSchema.parse(JSON.parse(Buffer.from(s, 'base64').toString('utf8')));
  } catch {
    throw new Error('invalid cursor');
  }
};

export const cursorClause = ({
  sortField,
  sortValue,
  sortDirection,
  entityId,
}: PageCursor): string => {
  if (sortValue == null) {
    return `| WHERE ${sortField} IS NULL AND ${ENTITY_ID_FIELD} > ${esc(entityId)}`;
  }

  const op = sortDirection === 'desc' ? '<' : '>';
  const val = typeof sortValue === 'string' ? esc(sortValue) : String(sortValue);
  const tieBreaker = `${sortField} == ${val} AND ${ENTITY_ID_FIELD} > ${esc(entityId)}`;

  // OR sortField IS NULL: all sorts use NULLS LAST, so nulls always belong on later pages.
  return `| WHERE (${sortField} ${op} ${val}) OR (${tieBreaker}) OR ${sortField} IS NULL`;
};

// Always NULLS LAST so entities without data appear at the bottom regardless of sort direction.
export const sortSuffix = (field: string, dir: SortDir, pageSize: number): string =>
  [
    `| SORT ${field} ${dir.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${pageSize + 1}`,
  ].join('\n');

// ── derived ES|QL fragments ───────────────────────────────────────────────────

export const ENTITY_TYPE_FILTER = `${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`;
