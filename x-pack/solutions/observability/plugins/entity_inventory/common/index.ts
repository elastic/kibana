/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/** The most rows one list request may ask for, and the route's default `limit`. */
export const MAX_LIST_LIMIT = 9_999;

/** The longest text the values route accepts as a filter value, and so the longest it offers. */
export const MAX_FILTER_VALUE_LENGTH = 256;

/** One ES|QL cell: a scalar, or an array when the column is multi-valued. */
export type ESQLValue = estypes.FieldValue | estypes.FieldValue[];

/** One row keyed by column name; a column the row does not carry is absent. */
export type InventoryRow = Record<string, ESQLValue>;

/** Entity id to attribute column to the index pattern of the source that supplied the value. */
export type Provenance = Record<string, Record<string, string>>;

/**
 * Why a probe or query's rows were lost, safe to return to the caller; never a stack.
 * - `failed`: Elasticsearch answered with an error or did not answer.
 * - `unusable`: the response was read and judged unusable; its rows are dropped.
 */
export interface SourceError {
  kind: 'failed' | 'unusable';
  /** The HTTP status of a `failed` request; null when there was no response, and for `unusable`. */
  status: number | null;
  reason: string;
}

/**
 * A source of the filter values route whose values were lost or may be incomplete, safe to return
 * to the caller; never a stack.
 */
export interface AttributeValuesSourceError {
  indexPattern: string;
  /** The HTTP status Elasticsearch answered with, null when there was no response. */
  status: number | null;
  reason: string;
}

/**
 * What an output column holds.
 * - `id`: `entity.id`, the key of the entity as a whole. It is always the first column.
 * - `identity`: a field of the definition's identity fields, such as `host.id` or `host.name`.
 *   Several can be null on one row, as an entity may be reported under one naming convention.
 * - `attribute`: any other field of the definition.
 * - `last_seen`: when the entity was last reported.
 */
export type OutputColumnKind = 'id' | 'identity' | 'attribute' | 'last_seen';

/** The ES|QL source command a plan runs under. */
export type QueryEngine = 'TS' | 'FROM';

/** Named ES|QL parameters in the request-body shape. */
export type NamedParams = Array<Record<string, string | number | boolean>>;

export interface InventoryTypeColumn {
  name: string;
  kind: OutputColumnKind;
}

export interface InventoryTypeSource {
  indexPattern: string;
  filter?: string;
}

export interface InventoryType {
  type: string;
  name: string;
  description?: string;
  /** The identity plan's grouping fields. */
  identityFields: string[];
  columns: InventoryTypeColumn[];
  /** The definition's `dynamic.suggestedFilters`, in display order; empty when it suggests none. */
  suggestedFilters: string[];
  /** The definition's `dynamic.sources`, in source order. */
  sources: InventoryTypeSource[];
}

export interface GetTypesResponse {
  types: InventoryType[];
}

/** An attribute column one source cannot fill because no index behind its pattern maps the field. */
export interface UnavailableColumn {
  column: string;
  indexPattern: string;
  field: string;
}

/** Shard counts summed over every cluster of `_clusters.details`. */
export interface QueryShardStats {
  total: number;
  successful: number | null;
  skipped: number | null;
  failed: number | null;
}

/**
 * The execution metadata Elasticsearch returns for one ES|QL query; each field is null when the
 * query failed or the response did not carry it.
 */
export interface QueryExecutionStats {
  /** Elasticsearch cluster time in milliseconds, not wall time. */
  took: number | null;
  /** Documents Elasticsearch visited, not matched. */
  documentsFound: number | null;
  /** Field values Elasticsearch read. */
  valuesLoaded: number | null;
  /** Rows every operator emitted, summed over every driver. */
  rowsEmitted: number | null;
  /** CPU time of every driver, in nanoseconds. */
  cpuNanos: number | null;
  /** Elapsed time of every driver, summed, in nanoseconds. */
  driverNanos: number | null;
  bytesRead: number | null;
  shards: QueryShardStats | null;
  /** Null when the query failed. */
  isPartial: boolean | null;
}

/** One plan query sent to Elasticsearch; a failed query has null stats and `rowCount` 0. */
export interface ListQueryDiagnostic extends QueryExecutionStats {
  indexPattern: string;
  engine: QueryEngine;
  esql: string;
  params: NamedParams;
  rowCount: number;
  /** Why the query's rows were lost; null when they were kept, partial results included. */
  error: SourceError | null;
}

/**
 * What the probe of one source pattern decided: `time_series` and `no_time_series` plan queries,
 * `failed` runs none (see the probe's `error`).
 */
export type ProbeOutcomeKind = 'time_series' | 'no_time_series' | 'failed';

/** One probe the planning sent to Elasticsearch; stats are null when it threw, a verification error included. */
export interface ListProbeDiagnostic extends QueryExecutionStats {
  indexPattern: string;
  esql: string;
  params: NamedParams;
  outcome: ProbeOutcomeKind;
  /** Why the probe failed, always of kind `failed`; null unless `outcome` is `failed`. */
  error: SourceError | null;
}

/**
 * Server phases of one `_list` call, in fractional milliseconds of monotonic time. The phases run
 * one after another, so `definitionMs + planningMs + queriesMs + processingMs` is about `totalMs`.
 */
export interface ListTimings {
  /** Looking up the type's definition. */
  definitionMs: number;
  /** Probes and query generation. */
  planningMs: number;
  /** The concurrent probes alone; part of `planningMs`. */
  probesMs: number;
  /** The concurrent plan queries, from the first sent to the last settled, including converting each response to rows. */
  queriesMs: number;
  /** Interpreting, merging, ordering, limiting and filling the rows. */
  processingMs: number;
  totalMs: number;
}

/** One row per entity seen in the window, merged across the type's sources. */
export interface ListResponse {
  columns: InventoryTypeColumn[];
  /** Every row carries every column, null where no source produced a value. */
  rows: InventoryRow[];
  /** For each returned row's `entity.id`, the index pattern that supplied each attribute value. */
  provenance: Provenance;
  /** True only when the row limit left rows out; a failed or partial query does not set it. */
  truncated: boolean;
  /** One entry per plan query sent, in plan order, each with its own `error`; probes are in `probes`. */
  queries: ListQueryDiagnostic[];
  /** One entry per distinct source pattern probed, in source order; a failed probe runs no query. */
  probes: ListProbeDiagnostic[];
  timings: ListTimings;
  unavailableColumns: UnavailableColumn[];
}

/** The body the inventory sends to Elasticsearch's `POST /_query` for one query. */
export interface EsqlRequestBody {
  query: string;
  params: NamedParams;
  include_execution_metadata: true;
}

/** One probe the planning ran, and what it decided. */
export interface PlanProbe {
  indexPattern: string;
  request: EsqlRequestBody;
  /** Whether the probe found a readable time-series index; null when the probe failed. */
  hasTimeSeries: boolean | null;
  /** Why the probe failed, always of kind `failed`; null when it did not. */
  error: SourceError | null;
}

/** One list query `_list` would send for the same request. */
export interface PlanQuery {
  indexPattern: string;
  engine: QueryEngine;
  request: EsqlRequestBody;
}

/** The probes the planning ran and the list queries `_list` would send; only the probes are executed. */
export interface PlanResponse {
  /** One entry per distinct source pattern, in source order; a failed probe runs no query. */
  probes: PlanProbe[];
  /** One entry per plan query `_list` would send, in plan order; a source whose probe failed has none. */
  queries: PlanQuery[];
}

/** The values a dropdown can offer, merged across the sources of the types in scope. */
export interface AttributeValuesResponse {
  /** The distinct values as the list shows them, sorted, at most the limit. */
  values: string[];
  /** The selected values that are not among the values offered. */
  invalidSelections: string[];
  /** True only when the limit left values out; a failed source is reported in `errors`. */
  truncated: boolean;
  errors: AttributeValuesSourceError[];
}
