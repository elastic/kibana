/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputColumnKind, QueryPlan } from '../generator';

/** One ES|QL scalar as the client returns it. */
export type EsqlScalar = string | number | boolean | null;

/** One ES|QL cell: a scalar, or an array when the column is multi-valued. */
export type EsqlValue = EsqlScalar | EsqlScalar[];

/** One row keyed by column name; a column the row does not carry is absent. */
export type InventoryRow = Record<string, EsqlValue>;

/** A column of an ES|QL response with its Elasticsearch type. */
export interface EsqlColumn {
  name: string;
  type: string;
}

/** What one plan's list query returned. */
export interface PlanResult {
  plan: QueryPlan;
  columns: EsqlColumn[];
  rows: InventoryRow[];
}

/** An output column with the first non-`null` Elasticsearch type a plan returned for it, else null. */
export interface TypedOutputColumn {
  name: string;
  kind: OutputColumnKind;
  type: string | null;
}

/** Entity id to attribute column to the index pattern of the source that supplied the value. */
export type Provenance = Record<string, Record<string, string>>;

/** The merged rows of every plan, keyed by `entity.id`. */
export interface MergeResult {
  /** One row per entity, in first-seen order; only columns with a value are present. */
  rows: InventoryRow[];
  /** Every output column in column order, with its type. */
  columns: TypedOutputColumn[];
  provenance: Provenance;
  /** Rows dropped because their `entity.id` was null, missing or not a string. */
  droppedRows: number;
}
