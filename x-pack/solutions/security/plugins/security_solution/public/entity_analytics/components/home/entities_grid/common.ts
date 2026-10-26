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
import type { EntityType as EntityStoreEntityType } from '@kbn/entity-store/common';
import { getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import type { RiskSeverity } from '../../../../../common/search_strategy';

export const ALLOWED_ENTITY_TYPES = [
  'user',
  'host',
  'service',
] as const satisfies readonly EntityStoreEntityType[];

export const ENTITY_ID_FIELD = 'entity.id';
export const ENTITY_TYPE_FIELD = 'entity.EngineMetadata.Type';
export const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
export const RISK_SCORE_NORM_FIELD = 'entity.risk.calculated_score_norm';
export const RISK_LEVEL_FIELD = 'entity.risk.calculated_level';
export const CRITICALITY_FIELD = 'asset.criticality';
export const RESOLUTION_RISK_SCORE_FIELD =
  'entity.relationships.resolution.risk.calculated_score_norm';
export const RESOLUTION_RISK_LEVEL_FIELD = 'entity.relationships.resolution.risk.calculated_level';

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
export const ROWS_MODES = ['resolved', 'individual'] as const;
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  options.some((option) => option === value);

/**
 * Identity and namespace source fields from entity definitions. The alert enrich rebuilds
 * each row's EUID filter from them; without the namespace sources (e.g. `event.module`)
 * the filter derives a different namespace and misses unstamped alerts. Identity fields that
 * the definition does not store (such as `user.entity.id`) are left out: the entity records
 * have no such column, so keeping them would fail the query.
 */
const IDENTITY_KEEP_FIELDS = [
  ...new Set([
    ...ALLOWED_ENTITY_TYPES.flatMap((t) => {
      const definition = getBuiltInEntityDefinition(t);
      const storedFields = new Set(
        definition.extraction.fields.map(({ destination }) => destination)
      );
      const { exactMatchFields, prefixMatchFields } = getEuidNamespaceSourceFields(definition);
      return [
        ...getEuidSourceFields(definition).identitySourceFields.filter((field) =>
          storedFields.has(field)
        ),
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

export type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];
export type RowsMode = (typeof ROWS_MODES)[number];
export type Row = Record<string, unknown>;
export type SortDir = (typeof SORT_DIRECTIONS)[number];

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
export type SortValue = string | number | null;

export interface QueryArgs {
  namespace: string;
  timeRange: TimeRange;
  sort: { field: string; direction: SortDir };
  pageSize: number;
  rowsMode: RowsMode;
  /** Concrete (non-alias) entity store index name — required for ES|QL LOOKUP JOIN from the browser. */
  concreteEntityIndexName: string;
  /** Search bar predicates (KQL, filter pills, group filters), applied to entity docs before any join. */
  searchExpression?: string;
  /** URL entity filters and tile id lists, applied to entity docs. */
  entityExpression?: string;
  /** Extra native entity-doc fields from Fields (not catalog / not enrich). */
  keepFields?: readonly string[];
  /** Installed security ML jobs; the anomaly columns count only their records. */
  anomalyJobIds: readonly string[];
}

export const getString = (row: Row, field: string): string | undefined => {
  const value = row[field];
  return typeof value === 'string' ? value : undefined;
};

export const getNumber = (row: Row, field: string): number | undefined => {
  const value = row[field];
  return typeof value === 'number' ? value : undefined;
};

export const getEntityId = (row: Row): string | undefined => getString(row, ENTITY_ID_FIELD);

export const getEntityIds = (rows: readonly Row[]): string[] =>
  rows.flatMap((row) => getEntityId(row) ?? []);
