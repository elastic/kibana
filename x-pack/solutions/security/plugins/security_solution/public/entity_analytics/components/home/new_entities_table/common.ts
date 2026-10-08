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
import type { HttpSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { lastValueFrom } from 'rxjs';
import { isAbortError } from '../../../../common/utils/exceptions';

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

export const TIME_RANGE_OPTIONS = ['24h', '7d', '30d'] as const;
export const TIME_RANGE_DAYS = { '24h': 1, '7d': 7, '30d': 30 } as const;

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
export type EsqlRunner = (q: string) => Promise<Row[]>;
export type SortDir = 'asc' | 'desc';
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

export interface RunContext {
  runQuery: EsqlRunner;
  http: HttpSetup;
  signal?: AbortSignal;
}

/** Fields an enricher fetched, per entity id. */
type EnrichedFields = ReadonlyMap<string, Row>;

/** Reads computed fields of the page rows after the sort query. It rejects when it fails. */
export interface PageEnricher {
  /** Row fields it reads. */
  fields: readonly string[];
  fetch: (rows: readonly Row[], args: QueryArgs, ctx: RunContext) => Promise<EnrichedFields>;
}

export interface SortPageContext {
  runQuery: EsqlRunner;
  /** Number of entities in view, from the count query. */
  viewSize: number;
}

/** How the grid sorts by a column. */
export interface SortQuerySpec {
  /** Builds the query for one page of rows plus one, sorted by this column. */
  buildSortQuery: (args: QueryArgs) => string;
  /** Builds the query for the total row count when this column is the sort. */
  buildCountQuery: (args: QueryArgs) => string;
  /**
   * Loads one page of rows plus one with more than one query, for views where that is
   * cheaper than `buildSortQuery`. Returns the same rows as `buildSortQuery`.
   */
  fetchSortPage?: (args: QueryArgs, ctx: SortPageContext) => Promise<Row[]>;
}

/** How the grid reads a column: its sort, if it has one, and the enricher of its values. */
export interface ColumnQuerySpec {
  sort?: SortQuerySpec;
  enricher?: PageEnricher;
}

const toRows = ({ columns, values }: Pick<ESQLSearchResponse, 'columns' | 'values'>): Row[] =>
  values.map((row) => Object.fromEntries(columns.map((col, i) => [col.name, row[i]])));

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

/** `entity.id ASC` order. */
export const compareEntityIds = (a: Row, b: Row): number =>
  (getEntityId(a) ?? '') < (getEntityId(b) ?? '') ? -1 : 1;

/** Narrows a sort column value for a cursor. */
export const toSortValue = (value: unknown): SortValue =>
  typeof value === 'string' || typeof value === 'number' ? value : null;

/** Pin ES|QL to the current project; CPS space default is often `_alias:*`. */
const ESQL_PROJECT_ROUTING = '_alias:_origin' as const;

export const createEsqlRunner = (
  searchService: DataPublicPluginStart['search'],
  signal?: AbortSignal
): EsqlRunner => {
  return async (query) => {
    const { rawResponse } = await lastValueFrom(
      searchService.search<
        IKibanaSearchRequest<{ query: string }>,
        IKibanaSearchResponse<ESQLSearchResponse>
      >(
        { params: { query } },
        {
          abortSignal: signal,
          strategy: 'esql_async',
          projectRouting: ESQL_PROJECT_ROUTING,
        }
      )
    );
    return toRows(rawResponse);
  };
};

/**
 * Resolves to `null` when the request fails, so the caller can fall back instead of failing.
 * An abort still rejects: the query key changed and the caller drops the result.
 */
export const nullOnFailure = <T>(request: Promise<T>): Promise<T | null> =>
  request.catch((err) => {
    if (isAbortError(err)) throw err;
    return null;
  });

/** A sort query may already have read an enricher's fields, e.g. the alert sort its counts. */
const isMissingFields = (rows: readonly Row[], { fields }: PageEnricher): boolean =>
  fields.some((field) => rows.some((row) => !(field in row)));

export interface EnrichedRows {
  rows: Row[];
  /** Errors of the enrichers that failed. Their fields stay unset, so they read as unknown. */
  errors: unknown[];
}

/**
 * Copies of `rows` with the fields of every enricher they lack. One enricher failing doesn't
 * fail the page: its error is returned with the rows. An abort still rejects: the query key
 * changed and the caller drops the result.
 */
export const fetchEnrichedRows = async (
  rows: readonly Row[],
  args: QueryArgs,
  ctx: RunContext,
  enrichers: readonly PageEnricher[]
): Promise<EnrichedRows> => {
  const settled = await Promise.allSettled(
    enrichers
      .filter((enricher) => isMissingFields(rows, enricher))
      .map(({ fetch }) => fetch(rows, args, ctx))
  );
  const results: EnrichedFields[] = [];
  const errors: unknown[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') results.push(result.value);
    else if (isAbortError(result.reason)) throw result.reason;
    else errors.push(result.reason);
  }
  return {
    rows: rows.map((row) => {
      const id = getEntityId(row);
      return results.reduce<Row>(
        (merged, fields) => ({ ...merged, ...(id != null ? fields.get(id) : undefined) }),
        { ...row }
      );
    }),
    errors,
  };
};
