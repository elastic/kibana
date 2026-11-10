/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Mirror of the entity inventory `types` and `_list` route contract (observability-dev#6304).
 * Delete these in favour of a type-only import from `@kbn/entity-inventory-plugin/common`
 * once the routes export them.
 */

/** A single value of an entity row cell, as ES|QL returns it. */
export type InventoryCellScalar = string | number | boolean | null;

/** A cell value; multi-value fields arrive as arrays. Mirrors the executor's `ESQLValue`. */
export type InventoryCellValue = InventoryCellScalar | InventoryCellScalar[];

/** One entity, keyed by output column name. */
export type InventoryRow = Readonly<Record<string, InventoryCellValue>>;

/**
 * The role of an output column. A `metric` kind arrives with the metrics phases.
 * - `id`: `entity.id`, the key of the entity as a whole. It is always the first column.
 * - `identity`: a field of the definition's identity fields, such as `host.id` or `host.name`.
 *   Several can be null on one row, as an entity may be reported under one naming convention.
 * - `attribute`: any other field of the definition.
 * - `last_seen`: when the entity was last reported.
 * The table only distinguishes `attribute` and `last_seen`.
 */
export type InventoryOutputColumnKind = 'id' | 'identity' | 'attribute' | 'last_seen';

/** An output column of a list response: the same shape the `types` route returns. */
export type InventoryListColumn = InventoryTypeColumn;

/** A source (index pattern) whose query failed while the others succeeded. */
export interface InventorySourceError {
  indexPattern: string;
  status: number | null;
  reason: string;
}

/** An output column that a source cannot provide because it lacks the backing field. */
export interface InventoryUnavailableColumn {
  indexPattern: string;
  column: string;
  field: string;
}

/** Body of a `_list` request; `from` and `to` are absolute ISO instants. */
export interface InventoryListRequest {
  from: string;
  to: string;
  limit?: number;
}

/**
 * The `_list` response fields the UI reads. The route also returns `provenance`, `took` and
 * `queries`, which the table does not use.
 */
export interface InventoryListResponse {
  columns: InventoryListColumn[];
  rows: InventoryRow[];
  /** `true` when the row limit left matching entities out; a failed source is in `errors`. */
  truncated: boolean;
  errors: InventorySourceError[];
  unavailableColumns: InventoryUnavailableColumn[];
}

/** An output column of a registered entity type. */
export interface InventoryTypeColumn {
  name: string;
  kind: InventoryOutputColumnKind;
}

/** A registered entity type as the `types` route describes it. */
export interface InventoryEntityType {
  type: string;
  name: string;
  description?: string;
  identityFields: string[];
  columns: InventoryTypeColumn[];
}

/** The `types` response. */
export interface InventoryTypesResponse {
  types: InventoryEntityType[];
}
