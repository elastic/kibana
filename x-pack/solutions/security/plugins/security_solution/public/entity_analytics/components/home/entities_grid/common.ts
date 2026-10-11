/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEuidNamespaceSourceFields,
  getEuidSourceFields,
} from '@kbn/entity-store/common/domain/euid';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import type { RiskSeverity } from '../../../../../common/search_strategy';

// ── constants ────────────────────────────────────────────────────────────────

export const ALLOWED_ENTITY_TYPES = ['user', 'host', 'service'] as const;

export const ENTITY_ID_FIELD = 'entity.id';
export const ENTITY_TYPE_FIELD = 'entity.EngineMetadata.Type';
export const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
export const RISK_SCORE_NORM_FIELD = 'entity.risk.calculated_score_norm';

export const ANOMALY_COUNT_FIELD = 'anomaly_count';
export const GROUP_SIZE_FIELD = 'group_size';

/** Open alert counts per severity, set by the alert queries next to `alert_count`. */
export const SEVERITY_COUNT_FIELDS = {
  critical: 'alert_critical',
  high: 'alert_high',
  medium: 'alert_medium',
  low: 'alert_low',
} as const;

export const TIME_RANGE_OPTIONS = ['24h', '7d', '30d'] as const;

/**
 * Identity and namespace source fields from entity definitions. The alert enrich rebuilds
 * each row's EUID filter from them; without the namespace sources (e.g. `event.module`)
 * the filter derives a different namespace and misses unstamped alerts.
 */
const IDENTITY_KEEP_FIELDS = [
  ...new Set([
    ...ALLOWED_ENTITY_TYPES.flatMap((t) => {
      const { exactMatchFields, prefixMatchFields } = getEuidNamespaceSourceFields(t);
      return [
        ...getEuidSourceFields(t).identitySourceFields,
        ...exactMatchFields,
        ...prefixMatchFields,
      ];
    }),
    'entity.namespace',
  ]),
];

export const ENTITY_FIELDS = [
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
  ...IDENTITY_KEEP_FIELDS,
] as const;

// ── types ────────────────────────────────────────────────────────────────────

export type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];
export type RowsMode = 'resolved' | 'individual';
export type Row = Record<string, unknown>;
export type SortDir = 'asc' | 'desc';

/** The filter dropdowns' selections. */
export interface EntityFilters {
  entityTypes: EntityType[];
  riskLevels: RiskSeverity[];
  assetCriticality: string[];
  watchlists: string[];
  dataSources: string[];
}

export const EMPTY_ENTITY_FILTERS: EntityFilters = {
  entityTypes: [],
  riskLevels: [],
  assetCriticality: [],
  watchlists: [],
  dataSources: [],
};
/** A sort column value in a cursor. Sort columns hold strings, numbers or null. */
export type SortValue = string | number | null;

export interface PageCursor {
  sortField: string;
  sortDirection: SortDir;
  sortValue: SortValue;
  entityId: string;
}

export interface QueryArgs {
  namespace: string;
  timeRange: TimeRange;
  sort: { field: string; direction: SortDir };
  cursor: PageCursor | null;
  pageSize: number;
  rowsMode: RowsMode;
  /** Concrete (non-alias) entity store index name — required for ES|QL LOOKUP JOIN from the browser. */
  concreteEntityIndexName: string;
  /**
   * Lucene-pushable search bar predicates (KQL / filter pills / group filters).
   * Applied as `| WHERE …` on entity docs: the entities in view, or group members.
   */
  searchExpression?: string;
  /**
   * Entity doc predicates (URL entity filters, tile id IN-lists).
   * Applied as `| WHERE …` on entity docs: the entities in view, or after the group join.
   */
  entityExpression?: string;
  /** Extra native entity-doc fields from Fields (not catalog / not enrich). */
  keepFields?: readonly string[];
  /** Installed security ML jobs; the anomaly columns count only their records. */
  anomalyJobIds: readonly string[];
}

// ── row readers ──────────────────────────────────────────────────────────────

/** Reads a string field of a row; `undefined` when it is absent or not a string. */
export const getString = (row: Row, field: string): string | undefined => {
  const value = row[field];
  return typeof value === 'string' ? value : undefined;
};

/** Reads a number field of a row; `undefined` when it is absent or not a number. */
export const getNumber = (row: Row, field: string): number | undefined => {
  const value = row[field];
  return typeof value === 'number' ? value : undefined;
};

export const getEntityId = (row: Row): string | undefined => getString(row, ENTITY_ID_FIELD);

/** Entity ids of the rows, without rows that have no id. */
export const getEntityIds = (rows: readonly Row[]): string[] =>
  rows.flatMap((row) => getEntityId(row) ?? []);
