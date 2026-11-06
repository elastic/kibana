/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryRow, Provenance, SourceError, TypedOutputColumn } from './executor';
import type { OutputColumnKind, TimeWindow } from './generator';

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

/** What `InventoryService.list` reads: one type, a window and how many rows to return. */
export interface ListRequest {
  type: string;
  window: TimeWindow;
  limit: number;
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
  /** Provenance of the returned rows only. */
  provenance: Provenance;
  /** Exact entity count in the window, or null when a plan was cut or partial. */
  total: number | null;
  truncated: boolean;
  /** End-to-end time in milliseconds, not the sum of the queries' cluster time. */
  took: number;
  errors: SourceError[];
  unavailableColumns: UnavailableColumn[];
}
