/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLColumn } from '@kbn/es-types';
import type { InventoryRow, Provenance } from '../../../common';
import type { QueryPlan } from '../generator';

/** What one plan's list query returned. */
export interface PlanResult {
  plan: QueryPlan;
  columns: ESQLColumn[];
  rows: InventoryRow[];
}

/** The merged rows of every plan, keyed by `entity.id`. */
export interface MergeResult {
  /** One row per entity, in first-seen order; only columns with a value are present. */
  rows: InventoryRow[];
  provenance: Provenance;
  /** Rows dropped because their `entity.id` was null, missing or not a string. */
  droppedRows: number;
}
