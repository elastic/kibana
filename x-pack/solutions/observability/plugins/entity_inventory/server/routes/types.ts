/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { InventoryRow, Provenance, SourceError } from '../inventory/executor';
import type { NamedParams, OutputColumnKind, QueryEngine } from '../inventory/generator';
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
