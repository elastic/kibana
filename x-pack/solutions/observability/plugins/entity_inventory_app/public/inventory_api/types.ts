/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClientRequestParamsOf } from '@kbn/server-route-repository-client';
import type {
  EntityInventoryRouteRepository,
  InventoryRow as ServerInventoryRow,
  InventoryType,
  ListResponse,
  OutputColumnKind,
  SourceError,
  UnavailableColumn,
} from '@kbn/entity-inventory-plugin/server';

/*
 * The entity inventory `types` and `_list` route contract, taken from the server plugin so a
 * change on either side is a compile error here.
 */

/** One entity, keyed by output column name. */
export type InventoryRow = ServerInventoryRow;

/** A cell value; multi-value fields arrive as arrays. */
export type InventoryCellValue = InventoryRow[string];

/** A single value of an entity row cell, as ES|QL returns it. */
export type InventoryCellScalar = Exclude<InventoryCellValue, unknown[]>;

/**
 * The role of an output column.
 * - `id`: `entity.id`, the key of the entity as a whole. It is always the first column.
 * - `identity`: a field of the definition's identity fields, such as `host.id` or `host.name`.
 *   Several can be null on one row, as an entity may be reported under one naming convention.
 * - `attribute`: any other field of the definition.
 * - `last_seen`: when the entity was last reported.
 */
export type InventoryOutputColumnKind = OutputColumnKind;

/** An output column of a list response: the same shape the `types` route returns. */
export type InventoryListColumn = ListResponse['columns'][number];

/** A source (index pattern) whose query failed while the others succeeded. */
export type InventorySourceError = SourceError;

/** An output column that a source cannot provide because it lacks the backing field. */
export type InventoryUnavailableColumn = UnavailableColumn;

/**
 * Body of a `_list` request; `from` and `to` are absolute ISO instants. `limit` is left out, so
 * the route answers with its default, which is also its maximum (9,999 rows).
 */
export type InventoryListRequest = Omit<
  ClientRequestParamsOf<
    EntityInventoryRouteRepository,
    'POST /internal/entity_inventory/entities/{type}/_list'
  >['params']['body'],
  'limit'
>;

/**
 * The `_list` response fields the UI reads. The route also returns `provenance`, `took` and
 * `queries`, which the table does not use.
 */
export type InventoryListResponse = Pick<
  ListResponse,
  'columns' | 'rows' | 'truncated' | 'errors' | 'unavailableColumns'
>;

/** A registered entity type as the `types` route describes it, without its `sources`. */
export type InventoryEntityType = Pick<
  InventoryType,
  'type' | 'name' | 'description' | 'identityFields' | 'columns'
>;

/** The `types` response. */
export interface InventoryTypesResponse {
  types: InventoryEntityType[];
}
