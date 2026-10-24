/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { applyValueLabels } from './value_labels';
export { mergeRows } from './merge';
export { orderRows, applyLimit, isTruncated, fillColumns } from './output';
export type {
  EsqlColumn,
  EsqlScalar,
  EsqlValue,
  InventoryRow,
  MergeResult,
  PlanResult,
  Provenance,
  TypedOutputColumn,
} from './types';
export { executeEsql } from './esql_client';
export type { EsqlQueryResult, EsqlStats, ExecuteEsqlOptions } from './esql_client';
export { toSourceError } from './errors/source_error';
export type { SourceError } from './errors/source_error';
export {
  planAvailability,
  resolveFieldAvailability,
  resolveSourceIndices,
} from './source_metadata';
export type {
  FieldAvailabilityRequest,
  FieldAvailabilityResult,
  MappedFieldsByIndex,
  PlanAvailability,
  ResolveSourceIndicesOptions,
  SourceIndicesResult,
  UnusableSourceCause,
  UnusableSourceIndices,
  UsableSourceIndices,
} from './source_metadata';
