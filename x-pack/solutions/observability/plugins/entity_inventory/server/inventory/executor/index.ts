/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { applyValueLabels } from './value_labels';
export { mergeRows } from './merge';
export {
  orderRows,
  applyLimit,
  fillColumns,
  MAX_PLAN_ROWS,
  planRowLimit,
  summarizeResults,
} from './output';
export { probeSources } from './source_probe';
export type { ProbeResult } from './source_probe';
export { interpretPlanResult } from './plan_result';
export type { PlanAvailability } from './plan_result';
export type { ESQLValue, InventoryRow, MergeResult, PlanResult, Provenance } from './types';
export { executeEsql } from './esql_client';
export type { EsqlQueryResult, EsqlStats, ExecuteEsqlOptions } from './esql_client';
export { toSourceError, isVerificationError } from './errors/source_error';
export type { SourceError } from './errors/source_error';
