/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/** The most rows one list request may ask for, and the route's default `limit`. */
export const MAX_LIST_LIMIT = 9_999;

/** One ES|QL cell: a scalar, or an array when the column is multi-valued. */
export type ESQLValue = estypes.FieldValue | estypes.FieldValue[];

/** One row keyed by column name; a column the row does not carry is absent. */
export type InventoryRow = Record<string, ESQLValue>;

/** Entity id to attribute column to the index pattern of the source that supplied the value. */
export type Provenance = Record<string, Record<string, string>>;

/** A failed query against one source, safe to return to the caller. */
export interface SourceError {
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

/** One plan query sent to Elasticsearch; a failed query has null `took` and `documentsFound` and `rowCount` 0. */
export interface ListQueryDiagnostic {
  indexPattern: string;
  engine: QueryEngine;
  esql: string;
  params: NamedParams;
  /** Elasticsearch cluster time in milliseconds, not wall time. */
  took: number | null;
  documentsFound: number | null;
  rowCount: number;
}

/** One row per entity seen in the window, merged across the type's sources. */
export interface ListResponse {
  columns: InventoryTypeColumn[];
  /** Every row carries every column, null where no source produced a value. */
  rows: InventoryRow[];
  /** For each returned row's `entity.id`, the index pattern that supplied each attribute value. */
  provenance: Provenance;
  /** True only when the row limit left rows out; a failed or partial plan is reported in `errors`. */
  truncated: boolean;
  /** Wall time of the whole request in milliseconds, probes included. */
  took: number;
  /** One entry per plan query sent, in plan order; probes are not listed. */
  queries: ListQueryDiagnostic[];
  errors: SourceError[];
  unavailableColumns: UnavailableColumn[];
}
