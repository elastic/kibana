/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { InventoryRow, SourceError, TypedOutputColumn } from '../inventory/executor';
import type { OutputColumnKind } from '../inventory/generator';
import type { InventoryService } from '../service/inventory_service';

export type GetInventoryService = (request: KibanaRequest) => Promise<InventoryService>;

export interface EntityInventoryRouteHandlerResources extends DefaultRouteHandlerResources {
  getInventoryService: GetInventoryService;
}

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

/** One row per entity seen in the window, merged across the type's sources. */
export interface ListResponse {
  columns: TypedOutputColumn[];
  /** Every row carries every column, null where no source produced a value. */
  rows: InventoryRow[];
  /** Exact entity count in the window, or null when a plan was cut or partial. */
  total: number | null;
  truncated: boolean;
  errors: SourceError[];
  unavailableColumns: UnavailableColumn[];
}
